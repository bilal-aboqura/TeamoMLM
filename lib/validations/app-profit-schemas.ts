import { z } from "zod";

const MAX_PROOF_SIZE = 10 * 1024 * 1024;
const ACCEPTED_PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const appProfitOfferSchema = z.object({
  title: z.string().min(2, "اسم التطبيق قصير جداً").max(120, "اسم التطبيق طويل جداً").trim(),
  download_url: z.string().url("رابط التحميل غير صالح").trim(),
  reward_usd: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "المكافأة يجب أن تكون رقماً بحد أقصى منزلتين عشريتين")
    .transform((value) => Number(value))
    .refine((value) => value > 0, "المكافأة يجب أن تكون أكبر من صفر"),
  provider: z.string().min(2, "اسم المزود مطلوب").max(80, "اسم المزود طويل جداً").trim(),
  required_tier: z.string().min(1, "الفئة المطلوبة مطلوبة").max(40, "الفئة المطلوبة طويلة جداً").trim(),
});

export const updateAppProfitOfferSchema = appProfitOfferSchema.extend({
  offer_id: z.string().uuid("معرّف العرض غير صالح"),
});

export const appProfitProofUploadSchema = z.object({
  offer_id: z.string().uuid("معرّف العرض غير صالح"),
  proof: z
    .instanceof(File)
    .refine((file) => ACCEPTED_PROOF_TYPES.includes(file.type), "يُسمح فقط بصور JPEG أو PNG أو WebP")
    .refine((file) => file.size <= MAX_PROOF_SIZE, "الحجم الأقصى للصورة هو 10 ميجابايت")
    .refine((file) => file.size > 0, "الملف فارغ"),
});

export const appProfitWithdrawalSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "المبلغ يجب أن يكون رقماً بحد أقصى منزلتين عشريتين")
    .transform((value) => Number(value))
    .refine((value) => value > 0, "المبلغ يجب أن يكون أكبر من صفر"),
});

export const appProfitRejectionSchema = z.object({
  id: z.string().uuid("معرّف الطلب غير صالح"),
  reason: z.string().max(500, "سبب الرفض طويل جداً").optional(),
});

export const appProfitIdSchema = z.object({
  id: z.string().uuid("المعرّف غير صالح"),
});
