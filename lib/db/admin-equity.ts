import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfitShareRequestStatus } from "@/lib/db/equity";

export type AdminProfitShareRequest = {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  sponsor_referral_code: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  percentage: number;
  price_usd: number;
  receipt_url: string;
  signed_url: string;
  status: ProfitShareRequestStatus;
  created_at: string;
  updated_at: string;
};

type UserJoin = {
  full_name: string | null;
  phone_number: string | null;
} | null;

type AdminProfitShareDbRow = {
  id: string;
  user_id: string;
  sponsor_referral_code: string | null;
  buyer_email?: string | null;
  buyer_phone?: string | null;
  percentage: number | string;
  price_usd: number | string;
  receipt_url: string;
  status: string;
  created_at: string;
  updated_at: string;
  users: unknown;
};

function isMissingSchema(errorMessage: string) {
  return (
    errorMessage.includes("schema cache") ||
    errorMessage.includes("does not exist") ||
    errorMessage.includes("Could not find the")
  );
}

async function mapRows(
  rows: AdminProfitShareDbRow[]
): Promise<AdminProfitShareRequest[]> {
  const supabase = createAdminClient();

  return Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await supabase.storage
        .from("equity-receipts")
        .createSignedUrl(row.receipt_url, 300);
      const user = row.users as unknown as UserJoin;

      return {
        id: row.id,
        user_id: row.user_id,
        full_name: user?.full_name ?? "غير متوفر",
        phone_number: user?.phone_number ?? "غير متوفر",
        sponsor_referral_code: row.sponsor_referral_code ?? null,
        buyer_email: row.buyer_email ?? null,
        buyer_phone: row.buyer_phone ?? null,
        percentage: Number(row.percentage),
        price_usd: Number(row.price_usd),
        receipt_url: row.receipt_url,
        signed_url: signed?.signedUrl ?? "",
        status: row.status as ProfitShareRequestStatus,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    })
  );
}

export async function getAllProfitShareRequests(): Promise<
  AdminProfitShareRequest[]
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profit_share_requests")
    .select(
      "id, user_id, sponsor_referral_code, buyer_email, buyer_phone, percentage, price_usd, receipt_url, status, created_at, updated_at, users!profit_share_requests_user_id_fkey(full_name, phone_number)"
    )
    .order("created_at", { ascending: false });

  if (error && isMissingSchema(error.message)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("profit_share_requests")
      .select(
        "id, user_id, sponsor_referral_code, percentage, price_usd, receipt_url, status, created_at, updated_at, users!profit_share_requests_user_id_fkey(full_name, phone_number)"
      )
      .order("created_at", { ascending: false });

    if (fallbackError) {
      console.error("getAllProfitShareRequests error:", fallbackError.message);
      return [];
    }

    return mapRows((fallbackData ?? []) as AdminProfitShareDbRow[]);
  }

  if (error) {
    console.error("getAllProfitShareRequests error:", error.message);
    return [];
  }

  return mapRows((data ?? []) as AdminProfitShareDbRow[]);
}
