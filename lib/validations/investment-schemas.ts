import { z } from "zod";

export const submitDepositSchema = z.object({
  amount: z.coerce
    .number()
    .min(100, "الحد الأدنى للإيداع هو 100 USDT"),
  receiptUrl: z.string().trim().min(1, "إيصال الدفع مطلوب"),
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
