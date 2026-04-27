import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPayLaterDashboardData } from "./data";
import { PayLaterClient } from "./_components/PayLaterClient";

export const dynamic = "force-dynamic";

export default async function PayLaterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getPayLaterDashboardData(user.id);

  return <PayLaterClient data={data} />;
}
