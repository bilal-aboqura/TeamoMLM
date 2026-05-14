import { notFound, redirect } from "next/navigation";
import { MediaSettingsPanel } from "@/components/chat/MediaSettingsPanel";
import { assignModeratorRole } from "../../../_actions/assignModeratorRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatAuthContext, normalizeMediaSettings } from "@/lib/chat/server";

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const auth = await getChatAuthContext();
  if (!auth) redirect("/login");
  if (auth.globalRole !== "admin") redirect("/admin/chat");

  const { groupId } = await params;
  const adminClient = createAdminClient();
  const [{ data: room }, { data: participants }] = await Promise.all([
    adminClient
      .from("chat_rooms")
      .select("id, name, media_settings")
      .eq("id", groupId)
      .eq("room_type", "blind_group")
      .eq("is_deleted", false)
      .maybeSingle(),
    adminClient
      .from("chat_participants")
      .select("user_id, room_role, chat_profiles(display_name)")
      .eq("room_id", groupId)
      .order("joined_at", { ascending: true }),
  ]);

  if (!room) notFound();

  async function setRole(formData: FormData) {
    "use server";
    await assignModeratorRole({
      roomId: String(formData.get("roomId") ?? ""),
      userId: String(formData.get("userId") ?? ""),
      role: String(formData.get("role") ?? "") as "moderator" | "member",
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{room.name}</h1>
        <p className="mt-1 text-sm text-slate-500">إعدادات المجموعة والأعضاء</p>
      </div>
      <MediaSettingsPanel roomId={groupId} initialSettings={normalizeMediaSettings(room.media_settings)} />
      <section className="rounded-lg border border-slate-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-900">الأعضاء</h2>
        <div className="divide-y divide-slate-100">
          {(participants ?? []).map((participant) => {
            const profile = Array.isArray(participant.chat_profiles)
              ? participant.chat_profiles[0]
              : participant.chat_profiles;
            const isModerator = participant.room_role === "moderator";
            const isAdmin = participant.room_role === "admin";
            return (
              <div key={participant.user_id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {profile?.display_name ?? "مستخدم"}
                  </p>
                  <p className="text-xs text-slate-400">{participant.room_role}</p>
                </div>
                {!isAdmin && (
                  <form action={setRole}>
                    <input type="hidden" name="roomId" value={groupId} />
                    <input type="hidden" name="userId" value={participant.user_id} />
                    <input type="hidden" name="role" value={isModerator ? "member" : "moderator"} />
                    <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
                      {isModerator ? "إزالة المشرف" : "تعيين مشرف"}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
