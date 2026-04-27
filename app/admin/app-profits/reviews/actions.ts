"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appProfitIdSchema, appProfitRejectionSchema } from "@/lib/validations/app-profit-schemas";
import type { ActionResult } from "@/lib/app-profits/types";

function mapRpcError(message?: string) {
  if (!message) return "حدث خطأ أثناء معالجة الطلب";
  if (message.includes("unauthenticated")) return "يرجى تسجيل الدخول أولاً";
  if (message.includes("unauthorized")) return "غير مصرح لك بهذا الإجراء";
  if (message.includes("not_found")) return "الطلب غير موجود";
  if (message.includes("not_pending")) return "تمت مراجعة هذا الطلب مسبقاً";
  return "حدث خطأ أثناء معالجة الطلب";
}

export async function approveAppProfitSubmission(submissionId: string): Promise<ActionResult> {
  const parsed = appProfitIdSchema.safeParse({ id: submissionId });
  if (!parsed.success) return { error: "معرّف الطلب غير صالح" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_approve_app_profit_submission", {
    p_submission_id: parsed.data.id,
  });

  if (error) return { error: mapRpcError(error.message) };

  revalidatePath("/admin/app-profits/reviews");
  revalidatePath("/dashboard/app-profits");
  revalidatePath("/dashboard/app-profits/history");
  return { success: true };
}

export async function rejectAppProfitSubmission(
  submissionId: string,
  reason?: string
): Promise<ActionResult> {
  const parsed = appProfitRejectionSchema.safeParse({ id: submissionId, reason });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "بيانات غير صالحة" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reject_app_profit_submission", {
    p_submission_id: parsed.data.id,
    p_reason: parsed.data.reason?.trim() || null,
  });

  if (error) return { error: mapRpcError(error.message) };

  revalidatePath("/admin/app-profits/reviews");
  revalidatePath("/dashboard/app-profits");
  revalidatePath("/dashboard/app-profits/history");
  return { success: true };
}
