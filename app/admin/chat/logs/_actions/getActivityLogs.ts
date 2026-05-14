"use server";

import { z } from "zod";
import { getChatAuthContext } from "@/lib/chat/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActivityLogEvent } from "@/lib/chat/types";

const schema = z.object({
  eventType: z.enum(["message_sent", "message_blocked", "session_event", "all"]).default("all"),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1),
  includeArchive: z.boolean().default(false),
});

const PAGE_SIZE = 50;

export async function getActivityLogs(input: z.input<typeof schema> = {}): Promise<
  | { success: true; data: ActivityLogEvent[]; meta: { total: number; page: number; totalPages: number } }
  | { success: false; error: "UNAUTHORIZED" | "VALIDATION_ERROR" }
> {
  const auth = await getChatAuthContext();
  if (!auth || auth.globalRole !== "admin") return { success: false, error: "UNAUTHORIZED" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

  const { eventType, dateFrom, dateTo, page, includeArchive } = parsed.data;
  const table = includeArchive ? "chat_activity_archive" : "chat_activity_log";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const adminClient = createAdminClient();

  let query = adminClient
    .from(table)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (eventType !== "all") query = query.eq("event_type", eventType);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data, error, count } = await query;
  if (error) return { success: false, error: "VALIDATION_ERROR" };

  const total = count ?? 0;
  return {
    success: true,
    data: (data ?? []) as ActivityLogEvent[],
    meta: { total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
  };
}
