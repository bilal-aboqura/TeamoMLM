import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGroup } from "../../_actions/createGroup";
import { getChatAuthContext } from "@/lib/chat/server";

export default async function NewChatGroupPage() {
  const auth = await getChatAuthContext();
  if (!auth) redirect("/login");
  if (auth.globalRole !== "admin") redirect("/admin/chat");

  const adminClient = createAdminClient();
  const { data: members } = await adminClient
    .from("chat_profiles")
    .select("user_id, display_name, global_role")
    .neq("user_id", auth.userId)
    .order("display_name", { ascending: true })
    .limit(200);

  async function submit(formData: FormData) {
    "use server";
    const result = await createGroup({
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? "") || undefined,
      memberIds: formData.getAll("memberIds").map(String),
    });
    if (result.success) redirect(`/admin/chat/${result.roomId}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">مجموعة جديدة</h1>
        <p className="mt-1 text-sm text-slate-500">أنشئ مجموعة مغلقة وأضف الأعضاء</p>
      </div>
      <form action={submit} className="space-y-4 rounded-lg border border-slate-100 bg-white p-5">
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">اسم المجموعة</label>
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-300"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">الوصف</label>
          <textarea
            name="description"
            maxLength={300}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-300"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">الأعضاء</label>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-100 p-2">
            {(members ?? []).map((member) => (
              <label key={member.user_id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                <input
                  type="checkbox"
                  name="memberIds"
                  value={member.user_id}
                  className="h-4 w-4 accent-emerald-600"
                />
                <span className="text-sm font-bold text-slate-700">{member.display_name}</span>
                <span className="text-xs text-slate-400">{member.global_role}</span>
              </label>
            ))}
          </div>
        </div>
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
          إنشاء المجموعة
        </button>
      </form>
    </div>
  );
}
