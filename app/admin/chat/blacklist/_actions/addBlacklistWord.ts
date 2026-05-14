"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeArabicText } from "@/lib/chat/normalize";
import type { BlacklistEntry } from "@/lib/chat/types";
import { getChatAuthContext } from "@/lib/chat/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  wordOriginal: z.string().trim().min(1).max(200),
  matchMode: z.enum(["whole_word", "substring"]).default("whole_word"),
});

export async function addBlacklistWord(input: z.input<typeof schema>): Promise<
  | { success: true; data: BlacklistEntry }
  | { success: false; error: "UNAUTHORIZED" | "VALIDATION_ERROR" }
> {
  const auth = await getChatAuthContext();
  if (!auth || auth.globalRole !== "admin") return { success: false, error: "UNAUTHORIZED" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("chat_blacklist")
    .insert({
      word_original: parsed.data.wordOriginal,
      word_normalized: normalizeArabicText(parsed.data.wordOriginal),
      match_mode: parsed.data.matchMode,
      created_by: auth.userId,
    })
    .select("id, word_original, word_normalized, match_mode, created_by, created_at")
    .single();

  if (error || !data) return { success: false, error: "VALIDATION_ERROR" };

  revalidatePath("/admin/chat/blacklist");
  return { success: true, data: data as BlacklistEntry };
}
