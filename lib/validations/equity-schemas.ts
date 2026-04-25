import { z } from "zod";

const MAX_RECEIPT_SIZE = 50 * 1024 * 1024;
export const ACCEPTED_EQUITY_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export interface EquityPackage {
  id: string;
  percentage: number;
  priceUsd: number;
  label: string;
}

export const EQUITY_PACKAGES: EquityPackage[] = [
  { id: "pkg-0.25", percentage: 0.25, priceUsd: 500, label: "0.25% ($500)" },
  { id: "pkg-0.5", percentage: 0.5, priceUsd: 1000, label: "0.5% ($1,000)" },
  { id: "pkg-1", percentage: 1, priceUsd: 2000, label: "1% ($2,000)" },
  { id: "pkg-2", percentage: 2, priceUsd: 4000, label: "2% ($4,000)" },
  { id: "pkg-5", percentage: 5, priceUsd: 10000, label: "5% ($10,000)" },
  { id: "pkg-10", percentage: 10, priceUsd: 20000, label: "10% ($20,000)" },
];

const packagePercentages = new Set(EQUITY_PACKAGES.map((pkg) => pkg.percentage));

export const EquityPurchaseSchema = z.object({
  percentage: z.number().positive(),
  priceUsd: z.number().positive(),
  sponsorReferralCode: z.string().trim().min(1, "Referral code is required"),
  receiptUrl: z.string().min(1, "Receipt URL is required"),
});

export const EquityPurchaseFormSchema = z.object({
  percentage: z.coerce
    .number()
    .positive("Invalid equity package")
    .refine((value) => packagePercentages.has(value), "Invalid equity package"),
  priceUsd: z.coerce.number().positive("Invalid package price"),
  sponsorReferralCode: z
    .string()
    .trim()
    .min(1, "Referral code is required"),
  receipt: z
    .instanceof(File)
    .refine(
      (file) => file.size > 0,
      "Receipt image is required"
    )
    .refine(
      (file) => ACCEPTED_EQUITY_RECEIPT_TYPES.includes(
        file.type as (typeof ACCEPTED_EQUITY_RECEIPT_TYPES)[number]
      ),
      "Please upload a JPEG, PNG, or WebP image"
    )
    .refine(
      (file) => file.size <= MAX_RECEIPT_SIZE,
      "Receipt image must be 50 MB or smaller"
    ),
});

export type EquityPurchaseInput = z.infer<typeof EquityPurchaseSchema>;
export type EquityPurchaseFormInput = z.infer<typeof EquityPurchaseFormSchema>;

export interface PurchaseActionResponse {
  success: boolean;
  error?: string;
}

export const ProcessRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["accept", "reject"]),
});

export type ProcessRequestInput = z.infer<typeof ProcessRequestSchema>;

export interface ProcessActionResponse {
  success: boolean;
  error?: string;
}
