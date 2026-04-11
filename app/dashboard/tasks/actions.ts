"use server";

import { taskProofUploadSchema } from "@/lib/validations/packages-tasks-schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PACKAGE_LEVEL_MAP } from "@/lib/constants/packages";

export type TaskActionResult =
  | { success: false; idle: true }
  | { success: true }
  | { error: { field: string; message: string } };

export async function submitTaskProof(
  _prevState: TaskActionResult,
  formData: FormData
): Promise<TaskActionResult> {
  const raw = {
    task_id: formData.get("task_id") as string,
    proof: formData.get("proof") as File,
  };

  const parsed = taskProofUploadSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      error: {
        field: firstError.path[0]?.toString() ?? "general",
        message: firstError.message,
      },
    };
  }

  const { task_id, proof } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: { field: "general", message: "يرجى تسجيل الدخول أولاً" },
    };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("current_package_level")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.current_package_level) {
    return {
      error: {
        field: "general",
        message: "لا يمكن إرسال المهام بدون اشتراك نشط",
      },
    };
  }

  // Tech debt: current_package_level is TEXT matched against packages.name.
  // Future: migrate public.users.current_package_level to current_package_id UUID FK.

  const supabaseAdmin = createAdminClient();

  const { data: pkg } = await supabaseAdmin
    .from("packages")
    .select("daily_profit, daily_task_count")
    .eq("name", profile.current_package_level)
    .eq("is_active", true)
    .maybeSingle();

  if (!pkg) {
    // Distinguish between: package name not found vs. package exists but is suspended.
    // Either way the user cannot proceed — admin must reassign or reactivate the package.
    return {
      error: {
        field: "general",
        message: "باقتك الحالية غير نشطة أو غير متوفرة، يرجى التواصل مع الدعم",
      },
    };
  }

  const rewardSnapshot =
    Math.round((pkg.daily_profit / pkg.daily_task_count) * 10000) / 10000;

  // Use UTC date to match PostgreSQL CURRENT_DATE (server runs UTC).
  // Avoids a ±1 day mismatch for users in UTC+2 after 10 PM local time.
  const now = new Date();
  const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

  const { data: existingLog } = await supabaseAdmin
    .from("task_completion_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("task_id", task_id)
    .eq("completion_date", today)
    .maybeSingle();

  if (existingLog) {
    return {
      error: {
        field: "general",
        message: "لقد أرسلت إثبات هذه المهمة اليوم بالفعل",
      },
    };
  }

  const { count: todayCount, error: countError } = await supabaseAdmin
    .from("task_completion_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("completion_date", today);

  if (!countError && (todayCount ?? 0) >= pkg.daily_task_count) {
    return {
      error: {
        field: "general",
        message: "لقد وصلت للحد الأقصى للمهام اليومية لبافتك",
      },
    };
  }

  const userLevelNum = PACKAGE_LEVEL_MAP[profile.current_package_level] ?? 0;

  const { data: task } = await supabaseAdmin
    .from("tasks")
    .select("id, required_vip_level")
    .eq("id", task_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!task) {
    return {
      error: { field: "general", message: "المهمة غير متوفرة" },
    };
  }

  if ((task.required_vip_level ?? 0) > userLevelNum) {
    return {
      error: { field: "general", message: "المهمة غير متوفرة" },
    };
  }

  // Map MIME type to extension. Zod already guarantees jpeg or png — this is a safety fallback.
  const ext = proof.type === "image/png" ? "png" : "jpg";
  const storagePath = `task-proofs/${user.id}/${crypto.randomUUID()}.${ext}`;
  const buffer = await proof.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from("proofs")
    .upload(storagePath, buffer, {
      contentType: proof.type,
      upsert: false,
    });

  if (uploadError) {
    return {
      error: { field: "general", message: "حدث خطأ أثناء رفع الصورة" },
    };
  }

  const { error: insertError } = await supabaseAdmin
    .from("task_completion_logs")
    .insert({
      user_id: user.id,
      task_id: task_id,
      proof_url: storagePath,
      reward_amount_snapshot: rewardSnapshot,
      completion_date: today,
      status: "pending",
    });

  if (insertError) {
    await supabaseAdmin.storage.from("proofs").remove([storagePath]);

    if (insertError.code === "23505") {
      return {
        error: {
          field: "general",
          message: "لقد أرسلت إثبات هذه المهمة اليوم بالفعل",
        },
      };
    }

    return {
      error: { field: "general", message: "حدث خطأ، يرجى المحاولة مرة أخرى" },
    };
  }

  return { success: true };
}
