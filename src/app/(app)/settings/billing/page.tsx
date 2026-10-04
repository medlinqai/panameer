import { guardPage } from "@/lib/guard";
import { listBillingMethods } from "@/lib/settings";
import { BillingMethods } from "@/components/settings/BillingMethods";

export const metadata = { title: "Billing & Payments · Panameer" };

export default async function BillingPage() {
  const viewer = await guardPage("authenticated");
  const methods = await listBillingMethods(viewer);
  return (
    <BillingMethods
      methods={methods.map((m) => ({
        id: m.id,
        kind: m.kind,
        label: m.label,
        last4: m.last4,
        isDefault: m.is_default,
      }))}
    />
  );
}
