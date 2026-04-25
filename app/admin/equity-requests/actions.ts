"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ProcessRequestSchema } from "@/lib/validations/equity-schemas";

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
