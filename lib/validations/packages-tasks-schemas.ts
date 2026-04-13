import { z } from "zod";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];

export const receiptUploadSchema = z.object({
  package_id: z.string().uuid("معرّف الباقة غير صالح"),
  receipt: z
    .instanceof(File)
    .refine((f) => ACCEPTED_IMAGE_TYPES.includes(f.type), "يرجى رفع صورة فقط (JPEG أو PNG)")
    .refine((f) => f.size <= MAX_FILE_SIZE, "حجم الصورة يجب أن لا يتجاوز 50 ميغابايت")
    .refine((f) => f.size > 0, "الملف فارغ"),
});

export const taskProofUploadSchema = z.object({
  task_id: z.string().uuid("معرّف المهمة غير صالح"),
  proof: z
    .instanceof(File)
    .refine((f) => ACCEPTED_IMAGE_TYPES.includes(f.type), "يرجى رفع صورة فقط (JPEG أو PNG)")
    .refine((f) => f.size <= MAX_FILE_SIZE, "حجم الصورة يجب أن لا يتجاوز 50 ميغابايت")
    .refine((f) => f.size > 0, "الملف فارغ"),
});

export type ReceiptUploadInput = z.infer<typeof receiptUploadSchema>;
export type TaskProofUploadInput = z.infer<typeof taskProofUploadSchema>;
