"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatAuthContext } from "@/lib/chat/server";

const schema = z.object({
  roomId: z.string().uuid(),
});

export async function deleteRoom(input: z.input<typeof schema>): Promise<
  | { success: true }
  | { success: false; error: "UNAUTHORIZED" | "ROOM_NOT_FOUND" | "VALIDATION_ERROR" }
> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

  const auth = await getChatAuthContext();
  if (!auth || auth.globalRole !== "admin") return { success: false, error: "UNAUTHORIZED" };

  const adminClient = createAdminClient();
  const { data: room } = await adminClient
    .from("chat_rooms")
    .select("id")
    .eq("id", parsed.data.roomId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (!room) return { success: false, error: "ROOM_NOT_FOUND" };

  const { error } = await adminClient
    .from("chat_rooms")
    .update({ is_deleted: true })
    .eq("id", parsed.data.roomId);

  if (error) return { success: false, error: "VALIDATION_ERROR" };

  revalidatePath("/admin/chat");
  revalidatePath(`/admin/chat/${parsed.data.roomId}`);
  revalidatePath("/dashboard/chat");
  revalidatePath(`/dashboard/chat/${parsed.data.roomId}`);
  return { success: true };
}
