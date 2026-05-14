// @ts-nocheck - Supabase Edge Functions run on Deno with URL imports.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase environment" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: moved, error: selectError } = await supabase
    .from("chat_activity_log")
    .select("*")
    .eq("event_type", "message_sent")
    .lt("created_at", cutoff);

  if (selectError) {
    return new Response(JSON.stringify({ error: selectError.message }), { status: 500 });
  }

  if (!moved?.length) {
    return new Response(JSON.stringify({ archived: 0 }), { status: 200 });
  }

  const archiveRows = moved.map(({ id, event_type, room_id, actor_display_name, details, created_at }) => ({
    id,
    event_type,
    room_id,
    actor_display_name,
    details,
    created_at,
  }));

  const { error: insertError } = await supabase.from("chat_activity_archive").upsert(archiveRows);
  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from("chat_activity_log")
    .delete()
    .in(
      "id",
      moved.map((row) => row.id)
    );

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  console.log(`Archived ${moved.length} chat activity log rows`);
  return new Response(JSON.stringify({ archived: moved.length }), { status: 200 });
});
