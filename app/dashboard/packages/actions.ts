"use server";

import { receiptUploadSchema } from "@/lib/validations/packages-tasks-schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PackageActionResult =
  | { success: false; idle: true }
  | { success: true }
  | { error: { field: string; message: string } };

export async function purchasePackage(
  _prevState: PackageActionResult,
  formData: FormData
): Promise<PackageActionResult> {
  const raw = {
    package_id: formData.get("package_id") as string,
    receipt: formData.get("receipt") as File,
  };

  const parsed = receiptUploadSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      error: {
        field: firstError.path[0]?.toString() ?? "general",
        message: firstError.message,
      },
    };
  }

  const { package_id, receipt } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: { field: "general", message: "يرجى تسجيل الدخول أولاً" },
    };
  }

  const supabaseAdmin = createAdminClient();

  const { data: existingPending } = await supabaseAdmin
    .from("package_subscription_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending) {
    return {
      error: {
        field: "general",
        message: "لديك طلب اشتراك قيد المراجعة بالفعل",
      },
    };
  }

  const { data: pkg } = await supabaseAdmin
    .from("packages")
    .select("id, price")
    .eq("id", package_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!pkg) {
    return {
      error: { field: "general", message: "الباقة غير متوفرة" },
    };
  }

  // Map MIME type to extension. Zod guarantees jpeg or png — safety fallback.
  const ext = receipt.type === "image/png" ? "png" : "jpg";
  const storagePath = `receipts/${user.id}/${crypto.randomUUID()}.${ext}`;
  const buffer = await receipt.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from("proofs")
    .upload(storagePath, buffer, {
      contentType: receipt.type,
      upsert: false,
    });

  if (uploadError) {
    return {
      error: { field: "general", message: "حدث خطأ أثناء رفع الصورة" },
    };
  }

  const { error: insertError } = await supabaseAdmin
    .from("package_subscription_requests")
    .insert({
      user_id: user.id,
      package_id: package_id,
      receipt_url: storagePath,
      amount_paid: pkg.price,
      status: "pending",
    });

  if (insertError) {
    await supabaseAdmin.storage.from("proofs").remove([storagePath]);

    if (insertError.code === "23505") {
      return {
        error: {
          field: "general",
          message: "لديك طلب اشتراك قيد المراجعة بالفعل",
        },
      };
    }

    return {
      error: { field: "general", message: "حدث خطأ، يرجى المحاولة مرة أخرى" },
    };
  }

  return { success: true };
}
