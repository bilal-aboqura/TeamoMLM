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
  expectedMonthlyMin: number;
  expectedMonthlyMax: number;
  label: string;
}

export const EQUITY_PACKAGES: EquityPackage[] = [
  { id: "pkg-0.25", percentage: 0.25, priceUsd: 500, expectedMonthlyMin: 125, expectedMonthlyMax: 400, label: "0.25% ($500)" },
  { id: "pkg-0.5", percentage: 0.5, priceUsd: 1000, expectedMonthlyMin: 250, expectedMonthlyMax: 800, label: "0.5% ($1,000)" },
  { id: "pkg-1", percentage: 1, priceUsd: 2000, expectedMonthlyMin: 500, expectedMonthlyMax: 1600, label: "1% ($2,000)" },
  { id: "pkg-1.5", percentage: 1.5, priceUsd: 3000, expectedMonthlyMin: 750, expectedMonthlyMax: 2400, label: "1.5% ($3,000)" },
  { id: "pkg-2", percentage: 2, priceUsd: 4000, expectedMonthlyMin: 1000, expectedMonthlyMax: 3200, label: "2% ($4,000)" },
  { id: "pkg-3", percentage: 3, priceUsd: 6000, expectedMonthlyMin: 1500, expectedMonthlyMax: 4800, label: "3% ($6,000)" },
  { id: "pkg-5", percentage: 5, priceUsd: 10000, expectedMonthlyMin: 2500, expectedMonthlyMax: 8000, label: "5% ($10,000)" },
  { id: "pkg-7", percentage: 7, priceUsd: 14000, expectedMonthlyMin: 3500, expectedMonthlyMax: 11200, label: "7% ($14,000)" },
  { id: "pkg-10", percentage: 10, priceUsd: 20000, expectedMonthlyMin: 5000, expectedMonthlyMax: 16000, label: "10% ($20,000)" },
];

const packagePercentages = new Set(EQUITY_PACKAGES.map((pkg) => pkg.percentage));

export const EquityPurchaseSchema = z.object({
  percentage: z.number().positive(),
  priceUsd: z.number().positive(),
  buyerEmail: z.string().email("البريد الإلكتروني غير صالح").trim(),
  buyerPhone: z.string().trim().min(7, "رقم الهاتف مطلوب"),
  receiptUrl: z.string().min(1, "Receipt URL is required"),
});

export const EquityPurchaseFormSchema = z.object({
  percentage: z.coerce
    .number()
    .positive("Invalid equity package")
    .refine((value) => packagePercentages.has(value), "Invalid equity package"),
  priceUsd: z.coerce.number().positive("Invalid package price"),
  buyerEmail: z.string().email("البريد الإلكتروني غير صالح").trim(),
  buyerPhone: z.string().trim().min(7, "رقم الهاتف مطلوب").max(30, "رقم الهاتف طويل جداً"),
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
