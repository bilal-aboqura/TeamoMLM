"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  EQUITY_PACKAGES,
  EquityPurchaseFormSchema,
} from "@/lib/validations/equity-schemas";
import {
  GLOBAL_EQUITY_CAP,
  USER_EQUITY_CAP,
  getTotalSoldEquity,
} from "@/lib/db/equity";
import { isValidSponsorReferralCode } from "@/lib/db/users";
import { uploadEquityReceipt } from "@/lib/storage/upload";

export type PurchaseRequestActionResult =
  | { success: false; idle: true }
  | { success: true }
  | { error: { field: string; message: string } };

export async function submitPurchaseRequest(
  _prevState: PurchaseRequestActionResult,
  formData: FormData
): Promise<PurchaseRequestActionResult> {
  const parsed = EquityPurchaseFormSchema.safeParse({
    percentage: formData.get("percentage"),
    priceUsd: formData.get("priceUsd"),
    sponsorReferralCode: formData.get("sponsorReferralCode"),
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

  const sponsorIsValid = await isValidSponsorReferralCode(
    parsed.data.sponsorReferralCode,
    user.id
  );

  if (!sponsorIsValid) {
    return {
      error: {
        field: "sponsorReferralCode",
        message: "Referral code is invalid or belongs to your account",
      },
    };
  }

  const adminClient = createAdminClient();
  const { data: existingRequests, error: existingError } = await adminClient
    .from("profit_share_requests")
    .select("percentage, status")
    .eq("user_id", user.id)
    .in("status", ["pending", "accepted"]);

  if (existingError) {
    return {
      error: { field: "general", message: "Could not verify your equity cap" },
    };
  }

  const userRequestedEquity = (existingRequests ?? []).reduce(
    (total, row) => total + Number(row.percentage ?? 0),
    0
  );

  if (userRequestedEquity + selectedPackage.percentage > USER_EQUITY_CAP) {
    return {
      error: {
        field: "general",
        message: "This package exceeds your 10% equity limit",
      },
    };
  }

  const totalSoldEquity = await getTotalSoldEquity();
  if (totalSoldEquity + selectedPackage.percentage > GLOBAL_EQUITY_CAP) {
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

  const { error: insertError } = await adminClient
    .from("profit_share_requests")
    .insert({
      user_id: user.id,
      sponsor_referral_code: parsed.data.sponsorReferralCode,
      percentage: selectedPackage.percentage,
      price_usd: selectedPackage.priceUsd,
      receipt_url: uploadResult.path,
      status: "pending",
    });

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
