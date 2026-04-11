import { PackageCard } from "./PackageCard";
import type { PackageWithStatus, PaymentSetting } from "../data";

export function PackageGrid({
  packages,
  paymentSetting,
}: {
  packages: PackageWithStatus[];
  paymentSetting: PaymentSetting;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10">
      {packages.map((pkg) => (
        <div key={pkg.id} className="h-full flex">
          <PackageCard
            pkg={pkg}
            paymentSetting={paymentSetting}
          />
        </div>
      ))}
    </div>
  );
}
