import { z } from "zod";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const submitDepositSchema = z.object({
  amount: z.coerce
    .number()
    .min(100, "الحد الأدنى للإيداع هو 100 USDT"),
  receipt: z
    .instanceof(File)
    .refine((f) => ACCEPTED_IMAGE_TYPES.includes(f.type), "يرجى رفع صورة فقط")
    .refine((f) => f.size <= MAX_FILE_SIZE, "حجم الصورة يجب أن لا يتجاوز 50 ميغابايت")
    .refine((f) => f.size > 0, "الملف فارغ"),
});

export const submitWithdrawalSchema = z.object({
  amount: z.coerce
    .number()
    .min(10, "الحد الأدنى للسحب هو 10 USDT"),
});

export const adminApproveDepositSchema = z.object({
  depositId: z.string().uuid(),
});

export const adminRejectDepositSchema = z.object({
  depositId: z.string().uuid(),
  reason: z.string().trim().optional(),
});

export const adminApproveWithdrawalSchema = z.object({
  withdrawalId: z.string().uuid(),
});

export const adminRejectWithdrawalSchema = z.object({
  withdrawalId: z.string().uuid(),
  reason: z.string().trim().optional(),
});

export type InvestmentActionResult<T = void> =
  | { success: false; idle: true }
  | { success: true; data?: T }
  | { error: { field: string; message: string } };

export type AdminInvestmentActionResult =
  | { success: true }
  | { error: string };
