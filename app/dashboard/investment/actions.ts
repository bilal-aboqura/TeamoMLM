"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveTier } from "@/lib/investment/tiers";
import {
  submitDepositSchema,
  submitWithdrawalSchema,
  type InvestmentActionResult,
} from "@/lib/validations/investment-schemas";

export async function submitInvestmentDeposit(
  _prevState: InvestmentActionResult<{ depositId: string }>,
  formData: FormData
): Promise<InvestmentActionResult<{ depositId: string }>> {
  const parsed = submitDepositSchema.safeParse({
    amount: formData.get("amount"),
    receipt: formData.get("receipt"),
  });

  if (!parsed.success) {
    const error = parsed.error.errors[0];
    return {
      error: {
        field: error.path[0]?.toString() ?? "general",
        message: error.message,
      },
    };
  }

  const tier = resolveTier(parsed.data.amount);
  if (!tier) {
    return { error: { field: "amount", message: "قيمة الإيداع غير صالحة" } };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: { field: "general", message: "يرجى تسجيل الدخول أولاً" } };
  }

  const { receipt } = parsed.data;
  const ext =
    receipt.type === "image/png"
      ? "png"
      : receipt.type === "image/webp"
        ? "webp"
        : "jpg";
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const buffer = await receipt.arrayBuffer();
  const adminClient = createAdminClient();

  const { error: uploadError } = await adminClient.storage
    .from("investment-receipts")
    .upload(storagePath, buffer, {
      contentType: receipt.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: { field: "general", message: "تعذر رفع الإيصال" } };
  }

  const { data, error } = await supabase.rpc("user_submit_investment_deposit", {
    p_user_id: user.id,
    p_amount: parsed.data.amount,
    p_tier_pct: tier,
    p_receipt_url: storagePath,
  });

  if (error) {
    await adminClient.storage.from("investment-receipts").remove([storagePath]);

    if (error.message.includes("already_active")) {
      return {
        error: {
          field: "general",
          message: "لديك طلب إيداع معلق أو استثمار نشط بالفعل",
        },
      };
    }
    if (error.message.includes("below_minimum")) {
      return {
        error: { field: "amount", message: "الحد الأدنى للإيداع هو 100 USDT" },
      };
    }
    return { error: { field: "general", message: "تعذر إرسال طلب الإيداع" } };
  }

  revalidatePath("/dashboard/investment");
  return { success: true, data: { depositId: String(data) } };
}

export async function submitInvestmentWithdrawal(
  _prevState: InvestmentActionResult<{ withdrawalId: string }>,
  formData: FormData
): Promise<InvestmentActionResult<{ withdrawalId: string }>> {
  const parsed = submitWithdrawalSchema.safeParse({
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    const error = parsed.error.errors[0];
    return {
      error: {
        field: error.path[0]?.toString() ?? "general",
        message: error.message,
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: { field: "general", message: "يرجى تسجيل الدخول أولاً" } };
  }

  const { data, error } = await supabase.rpc(
    "user_submit_investment_withdrawal",
    {
      p_user_id: user.id,
      p_amount: parsed.data.amount,
    }
  );

  if (error) {
    if (error.message.includes("below_minimum")) {
      return {
        error: { field: "amount", message: "الحد الأدنى للسحب هو 10 USDT" },
      };
    }
    if (error.message.includes("insufficient_profit")) {
      return {
        error: { field: "amount", message: "المبلغ يتجاوز رصيدك المتاح" },
      };
    }
    if (error.message.includes("no_active_investment")) {
      return {
        error: { field: "general", message: "لا يوجد استثمار نشط حالياً" },
      };
    }
    if (error.message.includes("pending_withdrawal_exists")) {
      return {
        error: { field: "general", message: "لديك طلب سحب معلق بالفعل" },
      };
    }
    return { error: { field: "general", message: "تعذر إرسال طلب السحب" } };
  }

  revalidatePath("/dashboard/investment");
  return { success: true, data: { withdrawalId: String(data) } };
}

export async function markInvestmentNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("in_app_notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/investment");
}
