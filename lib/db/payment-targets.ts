import { createAdminClient } from "@/lib/supabase/admin";
import {
  isMissingSchema,
  readFinancialControlsFallback,
} from "@/lib/db/financial-controls-fallback";

export type PaymentTargetScope =
  | "packages"
  | "profit_shares"
  | "investment"
  | "pay_later";

export type PaymentTarget = {
  scope: PaymentTargetScope;
  label: string;
  address: string;
  updated_at?: string;
};

const FALLBACK_LABEL = "USDT";

export async function getPaymentTarget(
  scope: PaymentTargetScope
): Promise<PaymentTarget | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("platform_payment_targets")
    .select("scope, label, address, updated_at")
    .eq("scope", scope)
    .maybeSingle();

  if (data?.address) {
    return {
      scope: data.scope as PaymentTargetScope,
      label: data.label || FALLBACK_LABEL,
      address: data.address,
      updated_at: data.updated_at,
    };
  }

  const stored = (await readFinancialControlsFallback()).paymentTargets?.[scope];
  if (stored?.address) {
    return {
      scope,
      label: stored.label || FALLBACK_LABEL,
      address: stored.address,
      updated_at: stored.updated_at,
    };
  }

  const { data: fallback } = await supabase
    .from("admin_settings")
    .select("payment_method_label, payment_address")
    .eq("is_active", true)
    .maybeSingle();

  if (!fallback?.payment_address) return null;

  return {
    scope,
    label: fallback.payment_method_label || FALLBACK_LABEL,
    address: fallback.payment_address,
  };
}

export async function getPaymentTargets(): Promise<PaymentTarget[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("platform_payment_targets")
    .select("scope, label, address, updated_at")
    .order("scope", { ascending: true });

  if (error && isMissingSchema(error.message)) {
    const stored = (await readFinancialControlsFallback()).paymentTargets ?? {};
    return (Object.keys(stored) as PaymentTargetScope[]).map((scope) => ({
      scope,
      label: stored[scope]?.label || FALLBACK_LABEL,
      address: stored[scope]?.address ?? "",
      updated_at: stored[scope]?.updated_at,
    }));
  }

  return (data ?? []).map((row) => ({
    scope: row.scope as PaymentTargetScope,
    label: row.label || FALLBACK_LABEL,
    address: row.address ?? "",
    updated_at: row.updated_at,
  }));
}
