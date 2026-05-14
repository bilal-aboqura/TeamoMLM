"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatAuthContext } from "@/lib/chat/server";

const schema = z.object({
  roomId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1).max(500),
});

export async function addMembersToGroup(input: z.input<typeof schema>): Promise<
  | { success: true; addedCount: number }
  | { success: false; error: "UNAUTHORIZED" | "GROUP_NOT_FOUND" | "MEMBERS_NOT_FOUND" | "VALIDATION_ERROR" }
> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

  const auth = await getChatAuthContext();
  if (!auth || auth.globalRole !== "admin") return { success: false, error: "UNAUTHORIZED" };

  const userIds = Array.from(new Set(parsed.data.userIds.filter((id) => id !== auth.userId)));
  if (userIds.length === 0) return { success: false, error: "VALIDATION_ERROR" };

  const adminClient = createAdminClient();
  const [{ data: room }, { data: members }] = await Promise.all([
    adminClient
      .from("chat_rooms")
      .select("id")
      .eq("id", parsed.data.roomId)
      .eq("room_type", "blind_group")
      .eq("is_deleted", false)
      .maybeSingle(),
    adminClient.from("chat_profiles").select("user_id").in("user_id", userIds),
  ]);

  if (!room) return { success: false, error: "GROUP_NOT_FOUND" };
  if ((members?.length ?? 0) !== userIds.length) {
    return { success: false, error: "MEMBERS_NOT_FOUND" };
  }

  const { data: existing } = await adminClient
    .from("chat_participants")
    .select("user_id")
    .eq("room_id", parsed.data.roomId)
    .in("user_id", userIds);

  const existingIds = new Set((existing ?? []).map((row) => row.user_id));
  const newRows = userIds
    .filter((userId) => !existingIds.has(userId))
    .map((userId) => ({
      room_id: parsed.data.roomId,
      user_id: userId,
      room_role: "member",
    }));

  if (newRows.length === 0) return { success: true, addedCount: 0 };

  const { error } = await adminClient.from("chat_participants").insert(newRows);
  if (error) return { success: false, error: "VALIDATION_ERROR" };

  revalidatePath(`/admin/chat/groups/${parsed.data.roomId}/settings`);
  revalidatePath(`/admin/chat/${parsed.data.roomId}`);
  revalidatePath("/admin/chat");
  return { success: true, addedCount: newRows.length };
}
