import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentTarget, PaymentTargetScope } from "@/lib/db/payment-targets";
import type { DbTradingReport } from "@/lib/db/investment";

const BUCKET = "proofs";
const PATH = "admin-config/financial-controls.json";

export type FinancialControlsFallback = {
  paymentTargets?: Partial<Record<PaymentTargetScope, PaymentTarget>>;
  manualSoldPercentage?: number;
  tradingReport?: DbTradingReport;
};

export function isMissingSchema(errorMessage: string) {
  return (
    errorMessage.includes("schema cache") ||
    errorMessage.includes("does not exist") ||
    errorMessage.includes("Could not find the")
  );
}

export async function readFinancialControlsFallback(): Promise<FinancialControlsFallback> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(PATH);

  if (error || !data) return {};

  try {
    return JSON.parse(await data.text()) as FinancialControlsFallback;
  } catch {
    return {};
  }
}

export async function writeFinancialControlsFallback(
  updater: (current: FinancialControlsFallback) => FinancialControlsFallback
) {
  const supabase = createAdminClient();
  const next = updater(await readFinancialControlsFallback());
  const body = JSON.stringify(next, null, 2);

  const { error } = await supabase.storage.from(BUCKET).upload(PATH, body, {
    contentType: "application/json",
    upsert: true,
  });

  return { error, data: next };
}
