import { z } from "zod";

export const approveDepositSchema = z.object({
  requestId: z.string().uuid(),
});

export const rejectDepositSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().min(1, "سبب الرفض مطلوب").trim(),
});

export const approveTaskSchema = z.object({
  logId: z.string().uuid(),
});

export const rejectTaskSchema = z.object({
  logId: z.string().uuid(),
  reason: z.string().min(1, "سبب الرفض مطلوب").trim(),
});

export const updateUserLevelSchema = z.object({
  userId: z.string().uuid(),
  level: z.number().int().min(1).max(6),
});

export const toggleUserStatusSchema = z.object({
  userId: z.string().uuid(),
  currentStatus: z.enum(["active", "suspended"]),
  reason: z.string().max(500).optional(),
});

export const adjustUserBalanceSchema = z.object({
  userId: z.string().uuid(),
  newBalance: z.number().min(0, "الرصيد لا يمكن أن يكون أقل من صفر"),
  reason: z.string().min(3, "يجب تحديد سبب التعديل بوضوح").trim(),
});

export type ApproveDepositInput = z.infer<typeof approveDepositSchema>;
export type RejectDepositInput = z.infer<typeof rejectDepositSchema>;
export type ApproveTaskInput = z.infer<typeof approveTaskSchema>;
export type RejectTaskInput = z.infer<typeof rejectTaskSchema>;
export type UpdateUserLevelInput = z.infer<typeof updateUserLevelSchema>;
export type ToggleUserStatusInput = z.infer<typeof toggleUserStatusSchema>;
export type AdjustUserBalanceInput = z.infer<typeof adjustUserBalanceSchema>;


// ---- Task CRUD Schemas ----

export const createTaskSchema = z.object({
  title: z.string().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل").trim(),
  platform_label: z.string().min(1, "اسم المنصة مطلوب").trim(),
  action_url: z.string().url("الرابط غير صالح").trim(),
  reward_amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "المكافأة يجب أن تكون رقماً بحد أقصى منزلتين عشريتين")
    .transform((v) => parseFloat(v))
    .refine((v) => v > 0, "المكافأة يجب أن تكون أكبر من صفر")
    .optional()
    .or(z.literal("")),
  required_vip_level: z
    .string()
    .transform((v) => parseInt(v, 10))
    .refine((v) => v >= 0 && v <= 6, "مستوى VIP يجب أن يكون بين 0 و 6"),
  display_order: z
    .string()
    .transform((v) => parseInt(v, 10))
    .refine((v) => v >= 0, "ترتيب العرض يجب أن يكون رقماً موجباً"),
});

export const updateTaskSchema = createTaskSchema.extend({
  taskId: z.string().uuid("معرّف المهمة غير صالح"),
});

export const deleteTaskSchema = z.object({
  taskId: z.string().uuid("معرّف المهمة غير صالح"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;

// ---- Withdrawal Schemas ----

export const approveWithdrawalSchema = z.object({
  requestId: z.string().uuid(),
});

export const rejectWithdrawalSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().min(1, "سبب الرفض مطلوب").trim(),
});

export type ApproveWithdrawalInput = z.infer<typeof approveWithdrawalSchema>;
export type RejectWithdrawalInput = z.infer<typeof rejectWithdrawalSchema>;

// ---- Commission Matrix Schema ----

const packageCommissionSchema = z.object({
  L1: z.number().min(0),
  L2: z.number().min(0),
  L3: z.number().min(0),
  L4: z.number().min(0),
  L5: z.number().min(0),
  L6: z.number().min(0),
});

export const updateCommissionRatesSchema = z.record(
  z.string(),
  packageCommissionSchema
);

export type UpdateCommissionRatesInput = z.infer<typeof updateCommissionRatesSchema>;

// ---- Payment Settings Schema ----

export const updatePaymentSettingsSchema = z.object({
  payment_method_label: z.string().min(1, "اسم طريقة الدفع مطلوب").trim(),
  payment_address: z.string().min(1, "عنوان الدفع مطلوب").trim(),
});

export type UpdatePaymentSettingsInput = z.infer<typeof updatePaymentSettingsSchema>;
