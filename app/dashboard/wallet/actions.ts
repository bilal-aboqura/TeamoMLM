"use server";

import { submitWithdrawalSchema, type WithdrawalActionResult } from "@/lib/validations/wallet-schemas";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitWithdrawal(
  _prevState: WithdrawalActionResult,
  formData: FormData
): Promise<WithdrawalActionResult> {
  const raw = {
    amount: formData.get("amount") as string,
    payment_details: formData.get("payment_details") as string,
  };

  const parsed = submitWithdrawalSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      error: {
        field: firstError.path[0]?.toString() ?? "general",
        message: firstError.message,
      },
    };
  }

  const { amount, payment_details } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: { field: "general", message: "يرجى تسجيل الدخول أولاً" },
    };
  }

  // Use the user-scoped client so that auth.uid() is correctly populated inside the RPC.
  // NEVER use the admin/service-role client for user-owned RPCs — it sets auth.uid() = null.
  const { data, error } = await supabase.rpc("user_submit_withdrawal", {
    p_amount: amount,
    p_payment_details: payment_details,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("suspended")) {
      return {
        error: {
          field: "general",
          message: "حسابك موقوف. لا يمكنك تقديم طلبات سحب.",
        },
      };
    }
    if (msg.includes("insufficient_balance")) {
      return {
        error: {
          field: "amount",
          message: "رصيدك غير كافٍ لإتمام هذا الطلب",
        },
      };
    }
    if (msg.includes("below_minimum")) {
      return {
        error: {
          field: "amount",
          message: "الحد الأدنى للسحب هو 10 دولار",
        },
      };
    }
    return {
      error: {
        field: "general",
        message: "حدث خطأ، يرجى المحاولة مرة أخرى",
      },
    };
  }

  // RPC now returns JSONB: { request_id, fee_pct, fee_amount, net_amount }
  const result = data as { fee_pct: number; fee_amount: number; net_amount: number } | null;
  const feePct = result?.fee_pct ?? 0;
  const netAmount = result?.net_amount ?? amount;

  // Force server cache invalidation so the balance updates immediately on the next render
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard");

  return { success: true, feePct, netAmount };
}

