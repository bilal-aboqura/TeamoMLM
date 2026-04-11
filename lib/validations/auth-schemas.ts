import { z } from "zod";

export const registrationSchema = z.object({
  full_name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100, "الاسم طويل جداً"),
  phone_number: z.string().min(7, "رقم الهاتف قصير جداً").max(20, "رقم الهاتف طويل جداً").transform((s) => s.trim()),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(72),
  referral_code: z.string().optional().default(""),
});

export const loginSchema = z.object({
  phone_number: z.string().min(7, "رقم الهاتف قصير جداً").max(20, "رقم الهاتف طويل جداً").transform((s) => s.trim()),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
