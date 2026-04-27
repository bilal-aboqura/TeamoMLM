"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AdminResult = { success: true; message?: string } | { error: string };

async function verifyAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return data?.role === "admin" ? user.id : null;
}

export async function updatePayLaterUserSettings(
  userId: string,
  manualEligible: boolean,
  feePct: number,
  penaltyAmount: number
): Promise<AdminResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  if (![0, 5, 10].includes(feePct)) {
    return { error: "رسوم السداد يجب أن تكون 0 أو 5 أو 10" };
  }

  if (!Number.isFinite(penaltyAmount) || penaltyAmount < 0) {
    return { error: "الغرامة يجب أن تكون رقماً موجباً أو صفر" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      pay_later_manual_eligible: manualEligible,
      pay_later_fee_pct: feePct,
      pay_later_penalty_amount: penaltyAmount,
    })
    .eq("id", userId);

  if (error) return { error: "تعذر تحديث إعدادات الدفع لاحقاً" };

  revalidatePath("/admin/pay-later");
  return { success: true, message: "تم تحديث إعدادات المستخدم" };
}

export async function approvePayLaterReceipt(
  debtId: string
): Promise<AdminResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_mark_pay_later_paid_external", {
    p_debt_id: debtId,
    p_admin_id: adminId,
  });

  if (error) return { error: "تعذر اعتماد السداد" };

  revalidatePath("/admin/pay-later");
  revalidatePath("/dashboard/pay-later");
  return { success: true, message: "تم اعتماد السداد" };
}

export async function rejectPayLaterReceipt(
  debtId: string,
  reason: string
): Promise<AdminResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("pay_later_debts")
    .update({
      status: "active",
      repayment_rejection_reason: reason.trim() || "تم رفض إثبات السداد",
      repayment_receipt_path: null,
      repayment_submitted_at: null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq("id", debtId)
    .eq("status", "pending_review");

  if (error) return { error: "تعذر رفض إثبات السداد" };

  revalidatePath("/admin/pay-later");
  revalidatePath("/dashboard/pay-later");
  return { success: true, message: "تم رفض إثبات السداد" };
}

export async function processOverduePayLater(): Promise<AdminResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("process_overdue_pay_later_debts");

  if (error) return { error: "تعذرت معالجة الديون المتأخرة" };

  revalidatePath("/admin/pay-later");
  return {
    success: true,
    message: `تمت معالجة ${Number(data ?? 0)} دين متأخر`,
  };
}
