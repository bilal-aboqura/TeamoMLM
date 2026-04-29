export const DEFAULT_APP_PROFIT_LIMITS: Record<string, number> = {
  A1: 0,
  A2: 0,
  A3: 0,
  B1: 5,
  B2: 10,
  B3: 15,
  "200": 3,
  "300": 5,
  "400": 7,
  "500": 10,
  "600": 12,
};

export const APP_PROFIT_LIMIT_KEYS = Object.keys(DEFAULT_APP_PROFIT_LIMITS);

export function getDefaultAppProfitLimit(packageKey: string | null) {
  if (!packageKey) return 0;
  return DEFAULT_APP_PROFIT_LIMITS[packageKey] ?? 0;
}
