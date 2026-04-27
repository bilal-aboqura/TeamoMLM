"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appProfitWithdrawalSchema } from "@/lib/validations/app-profit-schemas";
import type { ActionResult } from "@/lib/app-profits/types";

function mapRpcError(message?: string) {
  if (!message) return "حدث خطأ أثناء إرسال طلب السحب";
  if (message.includes("unauthenticated")) return "يرجى تسجيل الدخول أولاً";
  if (message.includes("access_denied")) return "هذه الميزة غير متاحة لحسابك حالياً";
  if (message.includes("insufficient_balance")) return "رصيد أرباح التطبيقات غير كافٍ";
  return "حدث خطأ أثناء إرسال طلب السحب";
}

export async function submitAppProfitWithdrawal(formData: FormData): Promise<ActionResult> {
  if (new Date().getDay() !== 5) {
    return { error: "السحب من أرباح التطبيقات متاح يوم الجمعة فقط" };
  }

  const parsed = appProfitWithdrawalSchema.safeParse({
    amount: formData.get("amount"),
  });

  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "بيانات غير صالحة" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("user_submit_app_profit_withdrawal", {
    p_amount: parsed.data.amount,
  });

  if (error) return { error: mapRpcError(error.message) };

  revalidatePath("/dashboard/app-profits");
  revalidatePath("/dashboard/app-profits/withdraw");
  return { success: true };
}
