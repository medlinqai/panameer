import { guardPage } from "@/lib/guard";
import { listBillingMethods } from "@/lib/settings";
import { BillingMethods } from "@/components/settings/BillingMethods";

/**
 * BILLING & PAYMENTS (J2.4 WS-H / E016) — how the provider PAYS Panameer.
 *
 * Not to be confused with Withdrawals, which is how Panameer pays them. Two
 * pages because they are two directions of money with two different gates: this
 * one needs nothing, that one needs a tax form.
 *
 * NO CONNECTS. This is the page where "buy Connects" lived on the surface being
 * replaced, and it is not coming back in any form.
 */
export const metadata = { title: "Billing & Payments · Panameer" };

export default async function BillingPage() {
  const viewer = await guardPage("canProvideServices");
  const methods = await listBillingMethods(viewer);
  return (
    <BillingMethods
      methods={methods.map((m) => ({
        id: m.id,
        kind: m.kind,
        label: m.label,
        last4: m.last4,
        expMonth: m.exp_month,
        expYear: m.exp_year,
        isDefault: m.is_default,
      }))}
    />
  );
}
