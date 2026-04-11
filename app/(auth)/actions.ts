"use server";

import { registrationSchema, loginSchema } from "@/lib/validations/auth-schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateUniqueReferralCode } from "@/lib/auth/generate-referral-code";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/auth/rate-limit";

function phoneToEmail(phone: string): string {
  return `${phone}@temo.local`;
}

export type ActionResult =
  | { success: false; idle: true }
  | { success: true }
  | { error: { field: string; message: string } };

export async function registerUser(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    full_name: formData.get("full_name") as string,
    phone_number: formData.get("phone_number") as string,
    password: formData.get("password") as string,
    referral_code: formData.get("referral_code") as string,
  };

  const parsed = registrationSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      error: {
        field: firstError.path[0]?.toString() ?? "general",
        message: firstError.message,
      },
    };
  }

  const { full_name, phone_number, password, referral_code } = parsed.data;

  const supabaseAdmin = createAdminClient();

  const { count: userCount } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true });

  const isFirstUser = userCount === 0;

  let upline: { id: string } | null = null;
  if (!isFirstUser) {
    const { data: uplineRow } = await supabaseAdmin
      .from("users")
      .select("id, status")
      .eq("referral_code", referral_code)
      .maybeSingle();

    if (!uplineRow || uplineRow.status === "suspended") {
      return {
        error: {
          field: "referral_code",
          message: "كود الإحالة غير صحيح",
        },
      };
    }
    upline = uplineRow;
  }

  let referralCode: string;
  try {
    referralCode = await generateUniqueReferralCode(supabaseAdmin);
  } catch {
    return {
      error: { field: "general", message: "حدث خطأ، يرجى المحاولة مرة أخرى" },
    };
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: phoneToEmail(phone_number),
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    if (authError?.message?.includes("already registered")) {
      return {
        error: {
          field: "phone_number",
          message: "رقم الهاتف مستخدم بالفعل",
        },
      };
    }
    return {
      error: { field: "general", message: "حدث خطأ، يرجى المحاولة مرة أخرى" },
    };
  }

  const { error: insertError } = await supabaseAdmin.from("users").insert({
    id: authData.user.id,
    full_name,
    phone_number,
    referral_code: referralCode,
    invited_by: upline?.id ?? null,
  });

  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

    if (insertError.code === "23505" && insertError.message?.includes("phone_number")) {
      return {
        error: {
          field: "phone_number",
          message: "رقم الهاتف مستخدم بالفعل",
        },
      };
    }

    return {
      error: { field: "general", message: "حدث خطأ، يرجى المحاولة مرة أخرى" },
    };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(phone_number),
    password,
  });

  if (signInError) {
    return {
      error: { field: "general", message: "تم إنشاء الحساب ولكن حدث خطأ في تسجيل الدخول" },
    };
  }

  return { success: true };
}

export async function loginUser(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    phone_number: formData.get("phone_number") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      error: {
        field: firstError.path[0]?.toString() ?? "general",
        message: firstError.message,
      },
    };
  }

  const { phone_number, password } = parsed.data;

  const rateLimitResult = await checkRateLimit(phone_number);
  if (rateLimitResult.locked) {
    return {
      error: {
        field: "general",
        message:
          "تم تجاوز عدد المحاولات المسموح بها. يرجى المحاولة بعد 15 دقيقة.",
      },
    };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(phone_number),
    password,
  });

  if (signInError) {
    await recordFailedAttempt(phone_number);
    return {
      error: {
        field: "general",
        message: "رقم الهاتف أو كلمة المرور غير صحيحة",
      },
    };
  }

  await resetRateLimit(phone_number);
  return { success: true };
}

export async function logoutUser(): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { success: true };
}
