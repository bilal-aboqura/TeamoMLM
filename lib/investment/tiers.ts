export type InvestmentTier = {
  minAmount: number;
  maxAmount: number | null;
  percentage: number;
};

export const INVESTMENT_TIERS: InvestmentTier[] = [
  { minAmount: 100, maxAmount: 499, percentage: 5 },
  { minAmount: 500, maxAmount: 1999, percentage: 8 },
  { minAmount: 2000, maxAmount: 4999, percentage: 12 },
  { minAmount: 5000, maxAmount: 9999, percentage: 18 },
  { minAmount: 10000, maxAmount: null, percentage: 25 },
];

export function resolveTier(amount: number): number | null {
  const tier = INVESTMENT_TIERS.find(
    (item) =>
      amount >= item.minAmount &&
      (item.maxAmount === null || amount <= item.maxAmount)
  );

  return tier?.percentage ?? null;
}
