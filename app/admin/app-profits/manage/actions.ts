"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  appProfitIdSchema,
  appProfitOfferSchema,
  updateAppProfitOfferSchema,
} from "@/lib/validations/app-profit-schemas";
import type { ActionResult } from "@/lib/app-profits/types";

async function verifyAdmin() {
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

export async function createAppProfitOffer(formData: FormData): Promise<ActionResult> {
  if (!(await verifyAdmin())) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = appProfitOfferSchema.safeParse({
    title: formData.get("title"),
    download_url: formData.get("download_url"),
    reward_usd: formData.get("reward_usd"),
    provider: formData.get("provider"),
    required_tier: formData.get("required_tier") || "none",
  });

  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "بيانات غير صالحة" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("app_profit_offers").insert(parsed.data);
  if (error) return { error: `حدث خطأ أثناء إضافة العرض: ${error.message}` };

  revalidatePath("/admin/app-profits/manage");
  revalidatePath("/dashboard/app-profits");
  return { success: true };
}

export async function updateAppProfitOffer(formData: FormData): Promise<ActionResult> {
  if (!(await verifyAdmin())) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = updateAppProfitOfferSchema.safeParse({
    offer_id: formData.get("offer_id"),
    title: formData.get("title"),
    download_url: formData.get("download_url"),
    reward_usd: formData.get("reward_usd"),
    provider: formData.get("provider"),
    required_tier: formData.get("required_tier") || "none",
  });

  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "بيانات غير صالحة" };

  const { offer_id, ...values } = parsed.data;
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("app_profit_offers")
    .update(values)
    .eq("id", offer_id);

  if (error) return { error: `حدث خطأ أثناء تحديث العرض: ${error.message}` };

  revalidatePath("/admin/app-profits/manage");
  revalidatePath("/dashboard/app-profits");
  return { success: true };
}

export async function toggleAppProfitOffer(offerId: string, isActive: boolean): Promise<ActionResult> {
  if (!(await verifyAdmin())) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = appProfitIdSchema.safeParse({ id: offerId });
  if (!parsed.success) return { error: "معرّف العرض غير صالح" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("app_profit_offers")
    .update({ is_active: isActive })
    .eq("id", parsed.data.id);

  if (error) return { error: "حدث خطأ أثناء تغيير حالة العرض" };

  revalidatePath("/admin/app-profits/manage");
  revalidatePath("/dashboard/app-profits");
  return { success: true };
}

export async function deleteAppProfitOffer(offerId: string): Promise<ActionResult> {
  if (!(await verifyAdmin())) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = appProfitIdSchema.safeParse({ id: offerId });
  if (!parsed.success) return { error: "معرّف العرض غير صالح" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("app_profit_offers")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    return {
      error:
        "تعذر حذف العرض. إذا كان عليه إثباتات سابقة، قم بإيقافه للحفاظ على السجلات.",
    };
  }

  revalidatePath("/admin/app-profits/manage");
  revalidatePath("/dashboard/app-profits");
  return { success: true };
}

export async function updateAppProfitPackageLimits(
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifyAdmin())) return { error: "غير مصرح لك بهذا الإجراء" };

  const entries = Array.from(formData.entries())
    .filter(([key]) => key.startsWith("limit:"))
    .map(([key, value]) => ({
      package_key: key.replace("limit:", ""),
      app_limit: Number(value),
    }));

  if (
    entries.some(
      (entry) =>
        !entry.package_key ||
        !Number.isInteger(entry.app_limit) ||
        entry.app_limit < 0
    )
  ) {
    return { error: "حدود التطبيقات يجب أن تكون أرقامًا صحيحة موجبة أو صفر" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("app_profit_package_limits")
    .upsert(entries, { onConflict: "package_key" });

  if (error) return { error: "تعذر تحديث حدود التطبيقات" };

  revalidatePath("/admin/app-profits/manage");
  revalidatePath("/dashboard/app-profits");
  return { success: true };
}
