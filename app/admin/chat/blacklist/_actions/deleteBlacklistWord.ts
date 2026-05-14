"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getChatAuthContext } from "@/lib/chat/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  wordId: z.string().uuid(),
});

export async function deleteBlacklistWord(input: z.input<typeof schema>): Promise<
  | { success: true; data: { deleted: boolean } }
  | { success: false; error: "UNAUTHORIZED" | "VALIDATION_ERROR" }
> {
  const auth = await getChatAuthContext();
  if (!auth || auth.globalRole !== "admin") return { success: false, error: "UNAUTHORIZED" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

  const adminClient = createAdminClient();
  const { error, count } = await adminClient
    .from("chat_blacklist")
    .delete({ count: "exact" })
    .eq("id", parsed.data.wordId);

  if (error) return { success: false, error: "VALIDATION_ERROR" };

  revalidatePath("/admin/chat/blacklist");
  return { success: true, data: { deleted: (count ?? 0) > 0 } };
}
