export type InvestmentAccountForSummary = {
  total_capital: number;
  withdrawn_profits: number;
  last_cycle_start: string | null;
  current_tier_percentage: number | null;
  status: "active" | "completed";
} | null;

export type PendingWithdrawalForSummary = {
  amount: number;
};

export type InvestmentSummary = {
  totalCapital: number;
  grossProfit: number;
  availableProfit: number;
  cyclesPassed: number;
  nextCycleAt: string | null;
  cycleStartAt: string | null;
  tierPercentage: number | null;
  accountStatus: "active" | "completed";
  isEmpty: boolean;
};

const CYCLE_MS = 7 * 24 * 60 * 60 * 1000;

export function floorMoney(value: number): number {
  return Math.floor(value * 100) / 100;
}

export function computeInvestmentSummary(
  account: InvestmentAccountForSummary,
  pendingWithdrawals: PendingWithdrawalForSummary[],
  now: Date = new Date()
): InvestmentSummary {
  if (
    !account ||
    !account.last_cycle_start ||
    account.current_tier_percentage === null ||
    account.total_capital <= 0
  ) {
    return {
      totalCapital: 0,
      grossProfit: 0,
      availableProfit: 0,
      cyclesPassed: 0,
      nextCycleAt: null,
      cycleStartAt: null,
      tierPercentage: null,
      accountStatus: "active",
      isEmpty: true,
    };
  }

  const cycleStart = new Date(account.last_cycle_start);
  const elapsed = Math.max(0, now.getTime() - cycleStart.getTime());
  const cyclesPassed = Math.floor(elapsed / CYCLE_MS);
  const profitPerCycle = floorMoney(
    (account.total_capital * account.current_tier_percentage) / 100
  );
  const grossProfit = floorMoney(cyclesPassed * profitPerCycle);
  const pendingTotal = pendingWithdrawals.reduce(
    (total, withdrawal) => total + Number(withdrawal.amount ?? 0),
    0
  );
  const availableProfit = Math.max(
    0,
    floorMoney(grossProfit - account.withdrawn_profits - pendingTotal)
  );
  const nextCycleAt = new Date(
    cycleStart.getTime() + (cyclesPassed + 1) * CYCLE_MS
  ).toISOString();

  return {
    totalCapital: Number(account.total_capital),
    grossProfit,
    availableProfit,
    cyclesPassed,
    nextCycleAt,
    cycleStartAt: account.last_cycle_start,
    tierPercentage: Number(account.current_tier_percentage),
    accountStatus: account.status,
    isEmpty: false,
  };
}
