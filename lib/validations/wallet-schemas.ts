import { z } from "zod";

export const submitWithdrawalSchema = z.object({
  amount: z
    .string()
    // Validate the raw string FIRST (before parseFloat) to block scientific notation
    // and enforce a maximum of 2 decimal places, matching DB NUMERIC(12,2)
    .superRefine((val, ctx) => {
      if (!/^\d+(\.\d{1,2})?$/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "المبلغ يجب أن يحتوي على خانتين عشريتين كحد أقصى",
        });
      }
    })
    .transform((val) => parseFloat(val))
    .pipe(
      z
        .number()
        .min(10.0, "الحد الأدنى للسحب هو 10 دولار")
        .max(999999.99, "المبلغ يتجاوز الحد المسموح")
    ),
  payment_details: z
    .string()
    .trim()
    .min(1, "يرجى إدخال تفاصيل الدفع")
    .max(200, "تفاصيل الدفع يجب أن لا تتجاوز 200 حرف"),
});

export type WithdrawalActionResult =
  | { success: false; idle: true }
  | { success: true; feePct: number; netAmount: number }
  | { error: { field: string; message: string } };

