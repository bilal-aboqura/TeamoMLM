"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createTaskSchema,
  updateTaskSchema,
  deleteTaskSchema,
} from "@/lib/validations/admin-schemas";

type TaskCrudResult = { success: true } | { error: string };

async function verifyAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return data?.role === "admin" ? user.id : null;
}

export async function createTask(
  formData: FormData
): Promise<TaskCrudResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const raw = {
    title: formData.get("title") as string,
    platform_label: formData.get("platform_label") as string,
    action_url: formData.get("action_url") as string,
    reward_amount: (formData.get("reward_amount") as string) || "",
    required_vip_level: formData.get("required_vip_level") as string,
    display_order: formData.get("display_order") as string,
  };

  const parsed = createTaskSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return { error: firstError.message };
  }

  const { title, platform_label, action_url, reward_amount, required_vip_level, display_order } =
    parsed.data;

  const rewardValue =
    reward_amount === "" || reward_amount === undefined ? null : reward_amount;

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("tasks").insert({
    title,
    platform_label,
    action_url,
    reward_amount: rewardValue,
    required_vip_level,
    display_order,
    is_active: true,
  });

  if (error) {
    return { error: "حدث خطأ أثناء إضافة المهمة: " + error.message };
  }

  revalidatePath("/admin/tasks");
  return { success: true };
}

export async function updateTask(
  formData: FormData
): Promise<TaskCrudResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const raw = {
    taskId: formData.get("taskId") as string,
    title: formData.get("title") as string,
    platform_label: formData.get("platform_label") as string,
    action_url: formData.get("action_url") as string,
    reward_amount: (formData.get("reward_amount") as string) || "",
    required_vip_level: formData.get("required_vip_level") as string,
    display_order: formData.get("display_order") as string,
  };

  const parsed = updateTaskSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return { error: firstError.message };
  }

  const { taskId, title, platform_label, action_url, reward_amount, required_vip_level, display_order } =
    parsed.data;

  const rewardValue =
    reward_amount === "" || reward_amount === undefined ? null : reward_amount;

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("tasks")
    .update({
      title,
      platform_label,
      action_url,
      reward_amount: rewardValue,
      required_vip_level,
      display_order,
    })
    .eq("id", taskId);

  if (error) {
    return { error: "حدث خطأ أثناء تحديث المهمة: " + error.message };
  }

  revalidatePath("/admin/tasks");
  return { success: true };
}

export async function deleteTask(taskId: string): Promise<TaskCrudResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = deleteTaskSchema.safeParse({ taskId });
  if (!parsed.success) return { error: "معرّف المهمة غير صالح" };

  const adminClient = createAdminClient();
  // Soft delete: set is_active = false to preserve task_completion_logs integrity
  const { error } = await adminClient
    .from("tasks")
    .update({ is_active: false })
    .eq("id", parsed.data.taskId);

  if (error) {
    return { error: "حدث خطأ أثناء حذف المهمة" };
  }

  revalidatePath("/admin/tasks");
  return { success: true };
}

export async function toggleTaskStatus(
  taskId: string,
  isActive: boolean
): Promise<TaskCrudResult> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "غير مصرح لك بهذا الإجراء" };

  const parsed = deleteTaskSchema.safeParse({ taskId });
  if (!parsed.success) return { error: "معرّف المهمة غير صالح" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("tasks")
    .update({ is_active: isActive })
    .eq("id", parsed.data.taskId);

  if (error) {
    return { error: "حدث خطأ أثناء تغيير حالة المهمة" };
  }

  revalidatePath("/admin/tasks");
  return { success: true };
}
