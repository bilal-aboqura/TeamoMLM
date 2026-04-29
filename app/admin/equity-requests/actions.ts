"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ProcessRequestSchema } from "@/lib/validations/equity-schemas";
import {
  isMissingSchema,
  writeFinancialControlsFallback,
} from "@/lib/db/financial-controls-fallback";

type ProcessActionResult = { success: true } | { error: string };

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return data?.role === "admin";
}

export async function processPurchaseRequest(
  requestId: string,
  action: "accept" | "reject"
): Promise<ProcessActionResult> {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = ProcessRequestSchema.safeParse({ requestId, action });
  if (!parsed.success) return { error: "بيانات غير صالحة" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_process_profit_share_request", {
    p_request_id: parsed.data.requestId,
    p_action: parsed.data.action,
  });

  if (error) {
    if (error.message.includes("not_pending")) {
      return { error: "تمت معالجة هذا الطلب بالفعل" };
    }
    if (error.message.includes("global_cap_exceeded")) {
      return { error: "قبول الطلب يتجاوز الحد الإجمالي 30%" };
    }
    if (error.message.includes("user_cap_exceeded")) {
      return { error: "قبول الطلب يتجاوز حد المستخدم 10%" };
    }
    if (error.message.includes("unauthorized")) {
      return { error: "غير مصرح لك بهذا الإجراء" };
    }

    console.error("processPurchaseRequest error:", error.message);
    return { error: "حدث خطأ أثناء معالجة الطلب" };
  }

  revalidatePath("/admin/equity-requests");
  revalidatePath("/dashboard/profit-shares");
  return { success: true };
}

export async function updateProfitShareManualSold(
  manualSoldPercentage: number
): Promise<ProcessActionResult> {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { error: "غير مصرح لك بهذا الإجراء" };

  if (
    !Number.isFinite(manualSoldPercentage) ||
    manualSoldPercentage < 0 ||
    manualSoldPercentage > 30
  ) {
    return { error: "النسبة اليدوية يجب أن تكون بين 0 و 30" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("profit_share_settings")
    .upsert(
      { id: true, manual_sold_percentage: manualSoldPercentage },
      { onConflict: "id" }
    );

  if (error && isMissingSchema(error.message)) {
    const fallbackResult = await writeFinancialControlsFallback((current) => ({
      ...current,
      manualSoldPercentage,
    }));

    if (fallbackResult.error) {
      return {
        error:
          "تعذر تحديث النسبة المباعة يدويًا: تأكد من وجود مساحة التخزين proofs أو طبّق migration الإعدادات المالية",
      };
    }
  } else if (error) {
    return { error: `تعذر تحديث النسبة المباعة يدويًا: ${error.message}` };
  }

  revalidatePath("/admin/equity-requests");
  revalidatePath("/dashboard/profit-shares");
  return { success: true };
}
