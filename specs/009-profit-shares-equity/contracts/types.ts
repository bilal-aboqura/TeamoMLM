import { z } from "zod";

// Zod schema for submitting an equity purchase request
export const EquityPurchaseSchema = z.object({
  percentage: z.number().positive(),
  priceUsd: z.number().positive(),
  sponsorReferralCode: z.string().min(1, "Referral code is required"),
  receiptUrl: z.string().url("Invalid receipt URL"),
});

export type EquityPurchaseInput = z.infer<typeof EquityPurchaseSchema>;

// Contract for the Server Action response when purchasing
export interface PurchaseActionResponse {
  success: boolean;
  error?: string;
}

// Zod schema for admin processing a request
export const ProcessRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["accept", "reject"]),
});

export type ProcessRequestInput = z.infer<typeof ProcessRequestSchema>;

// Contract for the Server Action response when processing
export interface ProcessActionResponse {
  success: boolean;
  error?: string;
}

// Contract for the UI to display packages
export interface EquityPackage {
  id: string; // e.g., "pkg-1"
  percentage: number;
  priceUsd: number;
  label: string; // e.g., "0.25% ($500)"
}

// Fixed packages as defined in spec
export const EQUITY_PACKAGES: EquityPackage[] = [
  { id: "pkg-0.25", percentage: 0.25, priceUsd: 500, label: "0.25% ($500)" },
  { id: "pkg-0.5", percentage: 0.5, priceUsd: 1000, label: "0.5% ($1,000)" },
  { id: "pkg-1", percentage: 1, priceUsd: 2000, label: "1% ($2,000)" },
  { id: "pkg-2", percentage: 2, priceUsd: 4000, label: "2% ($4,000)" },
  { id: "pkg-5", percentage: 5, priceUsd: 10000, label: "5% ($10,000)" },
  { id: "pkg-10", percentage: 10, priceUsd: 20000, label: "10% ($20,000)" },
];
