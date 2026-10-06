import { guardPage } from "@/lib/guard";
import { getWithdrawals, logTaxFormAccess } from "@/lib/settings";
import Link from "next/link";
import { Withdrawals } from "@/components/settings/Withdrawals";
import { getCompanyBinding } from "@/lib/company";

export const metadata = { title: "Withdrawals · Panameer" };

export default async function WithdrawalsPage() {
  const viewer = await guardPage("canProvideServices");
  const { tax, methods } = await getWithdrawals(viewer);

  await logTaxFormAccess(viewer, tax?.form ?? "W9", "VIEW");
  const binding = await getCompanyBinding(viewer);
  const co = binding?.status === "APPROVED" ? binding.company : null;

  return (
    <>
    {co && (
      <p data-paid-to={binding!.isAdmin ? "admin" : "member"} className="mx-auto mb-5 w-full max-w-3xl border-l-2 border-ink py-2 pl-3.5 text-[14px]">
        {binding!.isAdmin ? (
          <>
            {co.name}&apos;s payout account is set in{" "}
            <Link href="/company/legal#payout" className="font-semibold text-magenta-dark underline">Company › Legal, Tax &amp; Banking</Link>.
          </>
        ) : (
          <>
            <b>Your work is paid to {co.name}.</b> Its admins manage where the money goes.
          </>
        )}
      </p>
    )}
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
    </>
  );
}
