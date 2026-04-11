import { createClient } from "@/lib/supabase/server";

export type PublicPackage = {
  name: string;
  price: number;
  daily_task_count: number;
  daily_profit: number;
  display_order: number;
};

export const STATIC_PACKAGES_FALLBACK: PublicPackage[] = [
  { name: "A1", price: 200,  daily_task_count: 3, daily_profit: 3.33,  display_order: 1 },
  { name: "A2", price: 400,  daily_task_count: 3, daily_profit: 6.66,  display_order: 2 },
  { name: "A3", price: 600,  daily_task_count: 3, daily_profit: 10.00, display_order: 3 },
  { name: "B1", price: 1200, daily_task_count: 4, daily_profit: 20.00, display_order: 4 },
  { name: "B2", price: 1800, daily_task_count: 4, daily_profit: 30.00, display_order: 5 },
  { name: "B3", price: 2500, daily_task_count: 4, daily_profit: 41.66, display_order: 6 },
];

export async function getPublicPackages(): Promise<PublicPackage[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('packages')
      .select('name, price, daily_task_count, daily_profit, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      // Fallback: never let the marketing page render empty packages
      return STATIC_PACKAGES_FALLBACK;
    }
    
    return data as PublicPackage[];
  } catch (error) {
    // Fallback: never let the marketing page render empty packages
    return STATIC_PACKAGES_FALLBACK;
  }
}
