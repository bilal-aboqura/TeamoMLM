import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./_components/AdminSidebar";
import { AdminMobileHeader } from "./_components/AdminMobileHeader";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  console.log("ADMIN LAYOUT — user:", user.id, "profile:", profile, "error:", profileError?.message);

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      {/* Fixed sidebar (desktop only) */}
      <AdminSidebar />

      {/* Glassmorphic sticky header (mobile only) */}
      <AdminMobileHeader />

      {/* Main content — offset by sidebar width on desktop */}
      <main className="lg:ps-64 min-h-screen">
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
