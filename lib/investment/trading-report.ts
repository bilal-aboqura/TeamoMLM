export type TradingReport = {
  totalTrades: number;
  won: number;
  lost: number;
  netResultPercentage: number;
};

export const TRADING_REPORT = {
  totalTrades: 12,
  won: 9,
  lost: 3,
};

export function getTradingReport(tierPercentage: number): TradingReport {
  return {
    ...TRADING_REPORT,
    netResultPercentage: tierPercentage,
  };
}
