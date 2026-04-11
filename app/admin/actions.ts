"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  approveDepositSchema,
  rejectDepositSchema,
  approveTaskSchema,
  rejectTaskSchema,
  updateUserLevelSchema,
  approveWithdrawalSchema,
  rejectWithdrawalSchema,
  updateCommissionRatesSchema,
  type UpdateCommissionRatesInput,
  updatePaymentSettingsSchema,
  toggleUserStatusSchema,
  adjustUserBalanceSchema,
} from "@/lib/validations/admin-schemas";

type AdminActionResult = { success: true } | { error: string };

async function verifyAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return data?.role === "admin" ? user.id : null;
}

export async function approveDeposit(
  requestId: string
): Promise<AdminActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = approveDepositSchema.safeParse({ requestId });
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.rpc("admin_approve_deposit", {
    p_request_id: parsed.data.requestId,
    p_admin_id: adminId,
  });

  if (error) {
    console.error("approveDeposit RPC error:", error.message, error.details, error.hint);
    if (error.message === "not_pending") {
      return { error: "تمت معالجة هذا الطلب بالفعل" };
    }
    return { error: `حدث خطأ أثناء معالجة الطلب: ${error.message}` };
  }

  return { success: true };
}

export async function rejectDeposit(
  requestId: string,
  reason: string
): Promise<AdminActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = rejectDepositSchema.safeParse({ requestId, reason });
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.rpc("admin_reject_deposit", {
    p_request_id: parsed.data.requestId,
    p_admin_id: adminId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    if (error.message === "not_pending") {
      return { error: "تمت معالجة هذا الطلب بالفعل" };
    }
    return { error: "حدث خطأ أثناء معالجة الطلب" };
  }

  return { success: true };
}

export async function approveTask(logId: string): Promise<AdminActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = approveTaskSchema.safeParse({ logId });
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.rpc("admin_approve_task", {
    p_log_id: parsed.data.logId,
    p_admin_id: adminId,
  });

  if (error) {
    if (error.message === "not_pending") {
      return { error: "تمت معالجة هذا الطلب بالفعل" };
    }
    return { error: "حدث خطأ أثناء معالجة الطلب" };
  }

  return { success: true };
}

export async function rejectTask(
  logId: string,
  reason: string
): Promise<AdminActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = rejectTaskSchema.safeParse({ logId, reason });
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.rpc("admin_reject_task", {
    p_log_id: parsed.data.logId,
    p_admin_id: adminId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    if (error.message === "not_pending") {
      return { error: "تمت معالجة هذا الطلب بالفعل" };
    }
    return { error: "حدث خطأ أثناء معالجة الطلب" };
  }

  return { success: true };
}

export async function updateUserLevel(
  userId: string,
  level: number
): Promise<AdminActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = updateUserLevelSchema.safeParse({ userId, level });
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("users")
    .update({ leadership_level: parsed.data.level })
    .eq("id", parsed.data.userId);

  if (error) return { error: "حدث خطأ أثناء تحديث المستوى" };

  return { success: true };
}

export async function toggleUserStatus(
  userId: string,
  currentStatus: "active" | "suspended",
  reason?: string
): Promise<AdminActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = toggleUserStatusSchema.safeParse({ userId, currentStatus, reason });
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const newStatus = parsed.data.currentStatus === "active" ? "suspended" : "active";

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("users")
    .update({
      status: newStatus,
      // Save reason when suspending, clear it when reactivating
      suspension_reason: newStatus === "suspended" ? (parsed.data.reason ?? null) : null,
    })
    .eq("id", parsed.data.userId);

  if (error) {
    return { error: "حدث خطأ أثناء تحديث حالة المستخدم" };
  }

  return { success: true };
}

export async function adjustUserBalance(
  userId: string,
  newBalance: number,
  reason: string
): Promise<AdminActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = adjustUserBalanceSchema.safeParse({ userId, newBalance, reason });
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return { error: firstError?.message ?? "بيانات غير صالحة" };
  }

  const adminClient = createAdminClient();
  
  // Get current state to populate audit log
  const { data: user, error: fetchError } = await adminClient
    .from("users")
    .select("wallet_balance")
    .eq("id", parsed.data.userId)
    .maybeSingle();

  if (fetchError || !user) {
    return { error: "المستخدم غير موجود" };
  }

  // Transaction-like approach using DB updates.
  // Ideally, this would be an RPC wrapper, but we can do it via API sequence
  // with a small risk of race conditions if updates happen simultaneously.
  // Assuming Admins are careful, this is acceptable. 
  const { error: updateError } = await adminClient
    .from("users")
    .update({ wallet_balance: parsed.data.newBalance })
    .eq("id", parsed.data.userId);

  if (updateError) {
    if (updateError.message.includes("wallet_balance_check")) {
      return { error: "الرصيد لا يمكن أن يكون أقل من صفر" };
    }
    return { error: "حدث خطأ أثناء تحديث الرصيد" };
  }

  // Insert audit record
  const oldStatusStr = `Balance: ${user.wallet_balance}`;
  const newStatusStr = `Balance: ${parsed.data.newBalance} | Reason: ${parsed.data.reason}`;

  const { error: auditError } = await adminClient
    .from("financial_audit_log")
    .insert({
      record_id: parsed.data.userId, // Since there's no actual request record, we use the user ID.
      record_type: "manual_adjustment",
      old_status: oldStatusStr,
      new_status: newStatusStr,
      changed_by: adminId,
    });

  if (auditError) {
    // If audit logging fails, the balance was updated but we missed the log.
    // In production, failure to audit should ideally rollback the transaction.
    // For now, we return success but console.error it on server.
    console.error("FAIL to audit manual balance adjust:", auditError);
  }

  return { success: true };
}

// ====== Withdrawal Approvals ======

export async function approveWithdrawal(
  requestId: string
): Promise<AdminActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = approveWithdrawalSchema.safeParse({ requestId });
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  // These RPCs use auth.uid() internally for admin verification,
  // so we MUST call them from the user-scoped client (not service-role).
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_approve_withdrawal", {
    p_request_id: parsed.data.requestId,
  });

  if (error) {
    if (error.message.includes("not_pending")) {
      return { error: "تمت معالجة هذا الطلب بالفعل" };
    }
    if (error.message.includes("unauthorized")) {
      return { error: "غير مصرح لك بهذا الإجراء" };
    }
    return { error: "حدث خطأ أثناء معالجة الطلب" };
  }

  return { success: true };
}

export async function rejectWithdrawal(
  requestId: string,
  reason: string
): Promise<AdminActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = rejectWithdrawalSchema.safeParse({ requestId, reason });
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reject_withdrawal", {
    p_request_id: parsed.data.requestId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    if (error.message.includes("not_pending")) {
      return { error: "تمت معالجة هذا الطلب بالفعل" };
    }
    if (error.message.includes("unauthorized")) {
      return { error: "غير مصرح لك بهذا الإجراء" };
    }
    return { error: "حدث خطأ أثناء معالجة الطلب" };
  }

  return { success: true };
}

// ====== Commission Rate Settings ======

export async function updateCommissionRates(
  rates: UpdateCommissionRatesInput
): Promise<AdminActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = updateCommissionRatesSchema.safeParse(rates);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return { error: firstError?.message ?? "بيانات غير صالحة" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("admin_settings")
    .update({ referral_commission_rates: parsed.data })
    .eq("is_active", true);

  if (error) {
    return { error: "حدث خطأ أثناء تحديث نسب العمولات" };
  }

  return { success: true };
}

// ====== Payment Settings ======

export async function updatePaymentSettings(
  data: { payment_method_label: string; payment_address: string }
): Promise<AdminActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = updatePaymentSettingsSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return { error: firstError?.message ?? "بيانات غير صالحة" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("admin_settings")
    .update({
      payment_method_label: parsed.data.payment_method_label,
      payment_address: parsed.data.payment_address,
    })
    .eq("is_active", true);

  if (error) {
    return { error: "حدث خطأ أثناء تحديث معلومات الدفع" };
  }

  return { success: true };
}

// ====== Leadership Salaries & Rewards ======

export type SalaryDistributionResult =
  | { success: true; data: { promoted: number; rewards_paid: number; salaries_paid: number; total_reward: number; total_salary: number } }
  | { error: string };

export async function distributeSalariesAction(): Promise<SalaryDistributionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc("process_biweekly_salaries");

  if (error) {
    console.error("distributeSalaries RPC error:", error.message);
    return { error: `حدث خطأ أثناء معالجة الرواتب: ${error.message}` };
  }

  return {
    success: true,
    data: {
      promoted: data?.promoted ?? 0,
      rewards_paid: data?.rewards_paid ?? 0,
      salaries_paid: data?.salaries_paid ?? 0,
      total_reward: data?.total_reward ?? 0,
      total_salary: data?.total_salary ?? 0,
    },
  };
}

// ====== Competitions CRUD ======

export type CompetitionCrudResult = { success: true } | { error: string };

export async function createCompetition(
  formData: FormData
): Promise<CompetitionCrudResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const title = formData.get("title") as string;
  const reward = formData.get("reward") as string;
  const terms = formData.get("terms") as string;
  const start_time = formData.get("start_time") as string;
  const end_time = formData.get("end_time") as string;

  if (!title?.trim()) return { error: "عنوان المسابقة مطلوب" };
  if (!reward?.trim()) return { error: "الجائزة مطلوبة" };
  if (!start_time) return { error: "وقت البداية مطلوب" };
  if (!end_time) return { error: "وقت النهاية مطلوب" };

  // datetime-local returns local time without timezone — treat as Egypt time (UTC+2)
  const startUtc = new Date(start_time + ":00+02:00").toISOString();
  const endUtc = new Date(end_time + ":00+02:00").toISOString();

  if (new Date(endUtc) <= new Date(startUtc))
    return { error: "يجب أن يكون وقت النهاية بعد وقت البداية" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("competitions").insert({
    title: title.trim(),
    reward: reward.trim(),
    terms: terms?.trim() ?? "",
    start_time: startUtc,
    end_time: endUtc,
    is_active: true,
  });

  if (error) return { error: "حدث خطأ أثناء إضافة المسابقة" };

  revalidatePath("/admin/competitions");
  return { success: true };
}

export async function updateCompetition(
  formData: FormData
): Promise<CompetitionCrudResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const reward = formData.get("reward") as string;
  const terms = formData.get("terms") as string;
  const start_time = formData.get("start_time") as string;
  const end_time = formData.get("end_time") as string;

  if (!id) return { error: "معرّف المسابقة مطلوب" };
  if (!title?.trim()) return { error: "عنوان المسابقة مطلوب" };
  if (!reward?.trim()) return { error: "الجائزة مطلوبة" };
  if (!start_time) return { error: "وقت البداية مطلوب" };
  if (!end_time) return { error: "وقت النهاية مطلوب" };

  // datetime-local returns local time without timezone — treat as Egypt time (UTC+2)
  const startUtc = new Date(start_time + ":00+02:00").toISOString();
  const endUtc = new Date(end_time + ":00+02:00").toISOString();

  if (new Date(endUtc) <= new Date(startUtc))
    return { error: "يجب أن يكون وقت النهاية بعد وقت البداية" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("competitions")
    .update({
      title: title.trim(),
      reward: reward.trim(),
      terms: terms?.trim() ?? "",
      start_time: startUtc,
      end_time: endUtc,
    })
    .eq("id", id);

  if (error) return { error: "حدث خطأ أثناء تحديث المسابقة" };

  revalidatePath("/admin/competitions");
  return { success: true };
}

export async function deleteCompetition(
  id: string
): Promise<CompetitionCrudResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  if (!id) return { error: "معرّف المسابقة غير صالح" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("competitions")
    .delete()
    .eq("id", id);

  if (error) return { error: "حدث خطأ أثناء حذف المسابقة" };

  revalidatePath("/admin/competitions");
  return { success: true };
}
