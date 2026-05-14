import { redirect } from "next/navigation";
import { AvatarPicker } from "@/components/chat/AvatarPicker";
import { PREDEFINED_AVATARS, type AvatarId } from "@/lib/chat/avatars";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatAuthContext } from "@/lib/chat/server";

function normalizeAvatarId(value: unknown): AvatarId {
  const fallback = PREDEFINED_AVATARS[0].id;
  return PREDEFINED_AVATARS.some((avatar) => avatar.id === value)
    ? (value as AvatarId)
    : fallback;
}

export default async function ProfileSettingsPage() {
  const auth = await getChatAuthContext();
  if (!auth) redirect("/login");

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("chat_profiles")
    .select("display_name, avatar_id")
    .eq("user_id", auth.userId)
    .maybeSingle();

  const avatarId = normalizeAvatarId(profile?.avatar_id);
  const avatar = PREDEFINED_AVATARS.find((item) => item.id === avatarId) ?? PREDEFINED_AVATARS[0];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-center gap-4 rounded-lg border border-slate-100 bg-white p-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-sky-50 text-2xl font-black text-emerald-700">
            {avatar.label.slice(0, 1)}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {profile?.display_name ?? auth.displayName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{avatar.label}</p>
          </div>
        </header>
        <section className="rounded-lg border border-slate-100 bg-white p-5">
          <h2 className="mb-4 text-base font-bold text-slate-900">الصورة الرمزية</h2>
          <AvatarPicker currentAvatarId={avatarId} />
        </section>
      </div>
    </div>
  );
}
