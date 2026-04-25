"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  adminApproveDepositSchema,
  adminRejectDepositSchema,
  adminApproveWithdrawalSchema,
  adminRejectWithdrawalSchema,
  type AdminInvestmentActionResult,
} from "@/lib/validations/investment-schemas";

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

function mapAdminError(error: { message: string }) {
  if (error.message.includes("not_pending")) return "تمت معالجة هذا الطلب بالفعل";
  if (error.message.includes("not_found")) return "الطلب غير موجود";
  if (error.message.includes("unauthorized")) return "غير مصرح لك بهذا الإجراء";
  return "حدث خطأ أثناء معالجة الطلب";
}

export async function approveInvestmentDeposit(
  depositId: string
): Promise<AdminInvestmentActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };
  const parsed = adminApproveDepositSchema.safeParse({ depositId });
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.rpc("admin_approve_investment_deposit", {
    p_request_id: parsed.data.depositId,
    p_admin_id: adminId,
  });
  if (error) return { error: mapAdminError(error) };

  revalidatePath("/admin/investments");
  revalidatePath("/dashboard/investment");
  return { success: true };
}

export async function rejectInvestmentDeposit(
  depositId: string,
  reason?: string
): Promise<AdminInvestmentActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };
  const parsed = adminRejectDepositSchema.safeParse({ depositId, reason });
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.rpc("admin_reject_investment_deposit", {
    p_request_id: parsed.data.depositId,
    p_admin_id: adminId,
    p_reason: parsed.data.reason ?? null,
  });
  if (error) return { error: mapAdminError(error) };

  revalidatePath("/admin/investments");
  revalidatePath("/dashboard/investment");
  return { success: true };
}

export async function approveInvestmentWithdrawal(
  withdrawalId: string
): Promise<AdminInvestmentActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };
  const parsed = adminApproveWithdrawalSchema.safeParse({ withdrawalId });
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.rpc("admin_approve_investment_withdrawal", {
    p_request_id: parsed.data.withdrawalId,
    p_admin_id: adminId,
  });
  if (error) return { error: mapAdminError(error) };

  revalidatePath("/admin/investments");
  revalidatePath("/dashboard/investment");
  return { success: true };
}

export async function rejectInvestmentWithdrawal(
  withdrawalId: string,
  reason?: string
): Promise<AdminInvestmentActionResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };
  const parsed = adminRejectWithdrawalSchema.safeParse({ withdrawalId, reason });
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.rpc("admin_reject_investment_withdrawal", {
    p_request_id: parsed.data.withdrawalId,
    p_admin_id: adminId,
    p_reason: parsed.data.reason ?? null,
  });
  if (error) return { error: mapAdminError(error) };

  revalidatePath("/admin/investments");
  revalidatePath("/dashboard/investment");
  return { success: true };
}
