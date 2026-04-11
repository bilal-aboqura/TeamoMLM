import { createAdminClient } from "@/lib/supabase/admin";
import { CommissionMatrixForm } from "./_components/CommissionMatrixForm";
import { PaymentSettingsForm } from "./_components/PaymentSettingsForm";

export type CommissionMatrix = {
  [packageName: string]: {
    L1: number;
    L2: number;
    L3: number;
    L4: number;
    L5: number;
    L6: number;
  };
};

const DEFAULT_MATRIX: CommissionMatrix = {
  A1: { L1: 35, L2: 17, L3: 12, L4: 8, L5: 5, L6: 5 },
  A2: { L1: 60, L2: 25, L3: 17, L4: 12, L5: 5, L6: 5 },
  A3: { L1: 90, L2: 35, L3: 21, L4: 14, L5: 5, L6: 5 },
  B1: { L1: 140, L2: 85, L3: 35, L4: 20, L5: 9, L6: 9 },
  B2: { L1: 220, L2: 125, L3: 90, L4: 30, L5: 15, L6: 15 },
  B3: { L1: 350, L2: 175, L3: 100, L4: 32, L5: 18, L6: 18 },
};

export default async function SettingsPage() {
  const supabase = createAdminClient();

  const { data: settings } = await supabase
    .from("admin_settings")
    .select("id, referral_commission_rates, payment_method_label, payment_address")
    .eq("is_active", true)
    .maybeSingle();

  const matrix: CommissionMatrix = settings?.referral_commission_rates
    ? (settings.referral_commission_rates as CommissionMatrix)
    : DEFAULT_MATRIX;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">الإعدادات</h1>
        <p className="text-slate-500 text-sm mt-1">
          تكوين عمولات الإحالة الثابتة ومعلومات الدفع
        </p>
      </div>

      <section className="mb-10">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-slate-900">
            مصفوفة عمولات الإحالة (مبالغ ثابتة بالدولار)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تُوزع هذه المبالغ الثابتة تلقائياً على شجرة الإحالة عند الموافقة على إيداع المستخدم
          </p>
        </div>
        <CommissionMatrixForm matrix={matrix} />
      </section>

      {settings && (
        <>
          <div className="border-t border-slate-100 my-8" />
          <section>
            <div className="mb-5">
              <h2 className="text-base font-semibold text-slate-900">
                معلومات الدفع
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                تظهر للمستخدمين عند طلب اشتراك في باقة
              </p>
            </div>
            <PaymentSettingsForm
              initialLabel={settings.payment_method_label ?? ""}
              initialAddress={settings.payment_address ?? ""}
            />
          </section>
        </>
      )}
    </div>
  );
}
