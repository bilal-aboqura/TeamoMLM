import { createAdminClient } from "@/lib/supabase/admin";
import type { GlobalRole } from "./types";

export type ChatProfilePickerUser = {
  user_id: string;
  display_name: string;
  global_role: GlobalRole;
};

export async function listAllChatProfilePickerUsers(excludeUserIds: string[] = []) {
  const adminClient = createAdminClient();
  const users: ChatProfilePickerUser[] = [];
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    let query = adminClient
      .from("chat_profiles")
      .select("user_id, display_name, global_role")
      .order("display_name", { ascending: true })
      .range(from, from + pageSize - 1);

    for (const userId of excludeUserIds) {
      query = query.neq("user_id", userId);
    }

    const { data, error } = await query;
    if (error || !data?.length) break;

    users.push(...(data as ChatProfilePickerUser[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return users;
}
