export type TradingReport = {
  totalTrades: number;
  won: number;
  lost: number;
  netResultPercentage: number;
  periodStart: string | null;
  periodEnd: string | null;
  details: string;
};

export function buildTradingReport({
  tierPercentage,
  totalTrades,
  won,
  lost,
  periodStart,
  periodEnd,
  details,
}: {
  tierPercentage: number;
  totalTrades: number;
  won: number;
  lost: number;
  periodStart: string | null;
  periodEnd: string | null;
  details: string;
}): TradingReport {
  return {
    totalTrades,
    won,
    lost,
    netResultPercentage: tierPercentage,
    periodStart,
    periodEnd,
    details,
  };
}
