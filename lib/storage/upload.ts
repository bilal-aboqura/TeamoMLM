import { createAdminClient } from "@/lib/supabase/admin";
import { ACCEPTED_EQUITY_RECEIPT_TYPES } from "@/lib/validations/equity-schemas";

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadEquityReceipt(
  receipt: File,
  userId: string
): Promise<{ path: string } | { error: string }> {
  if (
    !ACCEPTED_EQUITY_RECEIPT_TYPES.includes(
      receipt.type as (typeof ACCEPTED_EQUITY_RECEIPT_TYPES)[number]
    )
  ) {
    return { error: "Please upload a JPEG, PNG, or WebP image" };
  }

  const supabase = createAdminClient();
  const extension = EXTENSION_BY_TYPE[receipt.type] ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const buffer = await receipt.arrayBuffer();

  const { error } = await supabase.storage
    .from("equity-receipts")
    .upload(path, buffer, {
      contentType: receipt.type,
      upsert: false,
    });

  if (error) {
    console.error("uploadEquityReceipt error:", error.message);
    return { error: "Failed to upload receipt image" };
  }

  return { path };
}
