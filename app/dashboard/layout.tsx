import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { SuspendedBanner } from "./_components/SuspendedBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch the user's application-level status from the public.users table
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("users")
    .select("status, suspension_reason")
    .eq("id", user.id)
    .maybeSingle();

  console.log("[DashboardLayout] profile data:", JSON.stringify(profile));

  if (profile?.status === "suspended") {
    return <SuspendedBanner reason={profile.suspension_reason} />;
  }

  return <>{children}</>;
}
