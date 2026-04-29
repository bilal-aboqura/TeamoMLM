"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  EQUITY_PACKAGES,
  EquityPurchaseFormSchema,
} from "@/lib/validations/equity-schemas";
import {
  getEquityProgress,
} from "@/lib/db/equity";
import { uploadEquityReceipt } from "@/lib/storage/upload";

export type PurchaseRequestActionResult =
  | { success: false; idle: true }
  | { success: true }
  | { error: { field: string; message: string } };

function isMissingSchema(errorMessage: string) {
  return (
    errorMessage.includes("schema cache") ||
    errorMessage.includes("does not exist") ||
    errorMessage.includes("Could not find the")
  );
}

function canUseLegacyProfitShareInsert(error: { code?: string; message: string }) {
  return (
    isMissingSchema(error.message) ||
    error.code === "23502" ||
    error.message.includes("sponsor_referral_code")
  );
}

export async function submitPurchaseRequest(
  _prevState: PurchaseRequestActionResult,
  formData: FormData
): Promise<PurchaseRequestActionResult> {
  const parsed = EquityPurchaseFormSchema.safeParse({
    percentage: formData.get("percentage"),
    priceUsd: formData.get("priceUsd"),
    buyerEmail: formData.get("buyerEmail"),
    buyerPhone: formData.get("buyerPhone"),
    receipt: formData.get("receipt"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      error: {
        field: firstError.path[0]?.toString() ?? "general",
        message: firstError.message,
      },
    };
  }

  const selectedPackage = EQUITY_PACKAGES.find(
    (pkg) =>
      pkg.percentage === parsed.data.percentage &&
      pkg.priceUsd === parsed.data.priceUsd
  );

  if (!selectedPackage) {
    return {
      error: { field: "general", message: "Invalid equity package" },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: { field: "general", message: "Please sign in first" },
    };
  }

  const adminClient = createAdminClient();
  const progress = await getEquityProgress();
  if (progress.soldEquity + selectedPackage.percentage > progress.cap) {
    return {
      error: {
        field: "general",
        message: "This package exceeds the remaining available equity",
      },
    };
  }

  const uploadResult = await uploadEquityReceipt(parsed.data.receipt, user.id);
  if ("error" in uploadResult) {
    return {
      error: { field: "receipt", message: uploadResult.error },
    };
  }

  let { error: insertError } = await adminClient
    .from("profit_share_requests")
    .insert({
      user_id: user.id,
      sponsor_referral_code: null,
      buyer_email: parsed.data.buyerEmail,
      buyer_phone: parsed.data.buyerPhone,
      percentage: selectedPackage.percentage,
      price_usd: selectedPackage.priceUsd,
      receipt_url: uploadResult.path,
      status: "pending",
    });

  if (insertError && canUseLegacyProfitShareInsert(insertError)) {
    const fallbackResult = await adminClient.from("profit_share_requests").insert({
      user_id: user.id,
      sponsor_referral_code: "DIRECT",
      percentage: selectedPackage.percentage,
      price_usd: selectedPackage.priceUsd,
      receipt_url: uploadResult.path,
      status: "pending",
    });

    insertError = fallbackResult.error;
  }

  if (insertError) {
    await adminClient.storage.from("equity-receipts").remove([uploadResult.path]);
    return {
      error: {
        field: "general",
        message: "Could not submit the purchase request. Please try again.",
      },
    };
  }

  revalidatePath("/dashboard/profit-shares");
  return { success: true };
}
