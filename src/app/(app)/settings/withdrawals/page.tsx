import { guardPage } from "@/lib/guard";
import { getWithdrawals, logTaxFormAccess } from "@/lib/settings";
import { Withdrawals } from "@/components/settings/Withdrawals";

export const metadata = { title: "Withdrawals · Panameer" };

export default async function WithdrawalsPage() {
  const viewer = await guardPage("canProvideServices");
  const { tax, methods } = await getWithdrawals(viewer);

  await logTaxFormAccess(viewer, tax?.form ?? "W9", "VIEW");

  return (
    <Withdrawals
      tax={
        tax
          ? {
              form: tax.form,
              legalName: tax.legal_name,
              country: tax.country,
              tinLast4: tax.tin_last4,
              signedAt: tax.signed_at.toISOString().slice(0, 10),
            }
          : null
      }
      methods={methods.map((m) => ({
        id: m.id,
        kind: m.kind,
        label: m.label,
        last4: m.last4,
        country: m.country,
        isDefault: m.is_default,
      }))}
    />
  );
}
