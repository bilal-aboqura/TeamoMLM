"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appProfitIdSchema, appProfitRejectionSchema } from "@/lib/validations/app-profit-schemas";
import type { ActionResult } from "@/lib/app-profits/types";

function mapRpcError(message?: string) {
  if (!message) return "حدث خطأ أثناء معالجة السحب";
  if (message.includes("unauthenticated")) return "يرجى تسجيل الدخول أولاً";
  if (message.includes("unauthorized")) return "غير مصرح لك بهذا الإجراء";
  if (message.includes("not_found")) return "طلب السحب غير موجود";
  if (message.includes("not_pending")) return "تمت معالجة هذا الطلب مسبقاً";
  return "حدث خطأ أثناء معالجة السحب";
}

export async function markAppProfitWithdrawalPaid(id: string): Promise<ActionResult> {
  const parsed = appProfitIdSchema.safeParse({ id });
  if (!parsed.success) return { error: "معرّف الطلب غير صالح" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_mark_app_profit_withdrawal_paid", {
    p_withdrawal_id: parsed.data.id,
  });

  if (error) return { error: mapRpcError(error.message) };

  revalidatePath("/admin/app-profits/withdrawals");
  revalidatePath("/dashboard/app-profits/withdraw");
  return { success: true };
}

export async function rejectAppProfitWithdrawal(id: string, reason?: string): Promise<ActionResult> {
  const parsed = appProfitRejectionSchema.safeParse({ id, reason });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "بيانات غير صالحة" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reject_app_profit_withdrawal", {
    p_withdrawal_id: parsed.data.id,
    p_reason: parsed.data.reason?.trim() || null,
  });

  if (error) return { error: mapRpcError(error.message) };

  revalidatePath("/admin/app-profits/withdrawals");
  revalidatePath("/dashboard/app-profits/withdraw");
  return { success: true };
}
