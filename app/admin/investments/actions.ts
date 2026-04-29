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
import {
  isMissingSchema,
  writeFinancialControlsFallback,
} from "@/lib/db/financial-controls-fallback";

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
  return { success: true as const };
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
  return { success: true as const };
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
  return { success: true as const };
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
  return { success: true as const };
}

export async function updateTradingReport(formData: FormData) {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  let totalTrades = Number(formData.get("totalTrades"));
  const wonTrades = Number(formData.get("wonTrades"));
  const lostTrades = Number(formData.get("lostTrades"));
  const periodStart = String(formData.get("periodStart") ?? "") || null;
  const periodEnd = String(formData.get("periodEnd") ?? "") || null;
  const details = String(formData.get("details") ?? "").trim();

  if (
    !Number.isInteger(totalTrades) ||
    !Number.isInteger(wonTrades) ||
    !Number.isInteger(lostTrades) ||
    totalTrades < 0 ||
    wonTrades < 0 ||
    lostTrades < 0
  ) {
    return { error: "بيانات تقرير التداول غير صالحة" };
  }

  totalTrades = Math.max(totalTrades, wonTrades + lostTrades);

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("investment_trading_reports").upsert(
    {
      id: true,
      total_trades: totalTrades,
      won_trades: wonTrades,
      lost_trades: lostTrades,
      period_start: periodStart,
      period_end: periodEnd,
      details,
    },
    { onConflict: "id" }
  );

  if (error && isMissingSchema(error.message)) {
    const fallbackResult = await writeFinancialControlsFallback((current) => ({
      ...current,
      tradingReport: {
        totalTrades,
        won: wonTrades,
        lost: lostTrades,
        periodStart,
        periodEnd,
        details,
      },
    }));

    if (fallbackResult.error) {
      return {
        error:
          "تعذر حفظ تقرير التداول: تأكد من وجود مساحة التخزين proofs أو طبّق migration الإعدادات المالية",
      };
    }
  } else if (error) {
    return { error: `تعذر حفظ تقرير التداول: ${error.message}` };
  }
  revalidatePath("/admin/investments");
  revalidatePath("/dashboard/investment");
  return { success: true as const };
}

export async function sendManualInvestmentProfit(formData: FormData) {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const userId = String(formData.get("userId") ?? "");
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return { error: "المستخدم والمبلغ مطلوبان" };
  }

  const adminClient = createAdminClient();
  const { data: account } = await adminClient
    .from("investment_accounts")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!account) return { error: "لا يوجد حساب استثمار نشط لهذا المستخدم" };

  const { data: inserted, error } = await adminClient
    .from("investment_manual_profits")
    .insert({
      user_id: userId,
      amount,
      reason,
      created_by: adminId,
    })
    .select("id")
    .single();

  if (error && isMissingSchema(error.message)) {
    const entryId = crypto.randomUUID();
    const fallbackResult = await writeFinancialControlsFallback((current) => {
      const existing = current.manualInvestmentProfits?.[userId] ?? {
        total: 0,
        entries: [],
      };

      return {
        ...current,
        manualInvestmentProfits: {
          ...(current.manualInvestmentProfits ?? {}),
          [userId]: {
            total: Number(existing.total ?? 0) + amount,
            entries: [
              ...existing.entries,
              {
                id: entryId,
                amount,
                reason,
                createdBy: adminId,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        },
      };
    });

    if (fallbackResult.error) {
      return {
        error:
          "تعذر إرسال الربح اليدوي: تأكد من وجود مساحة التخزين proofs أو طبّق migration الإعدادات المالية",
      };
    }

    await adminClient.from("financial_audit_log").insert({
      record_id: entryId,
      record_type: "manual_adjustment",
      old_status: "investment_manual_profit",
      new_status: `credited:${amount}`,
      changed_by: adminId,
    });

    revalidatePath("/admin/investments");
    revalidatePath("/dashboard/investment");
    return { success: true as const };
  }

  if (error) return { error: `تعذر إرسال الربح اليدوي: ${error.message}` };

  await adminClient.from("financial_audit_log").insert({
    record_id: inserted.id,
    record_type: "investment_manual_profit",
    old_status: "pending",
    new_status: `credited:${amount}`,
    changed_by: adminId,
  });

  revalidatePath("/admin/investments");
  revalidatePath("/dashboard/investment");
  return { success: true as const };
}
