import { guardPage } from "@/lib/guard";
import { getWithdrawals } from "@/lib/settings";
import { Withdrawals } from "@/components/settings/Withdrawals";

/**
 * WITHDRAWALS (J2.4 WS-H / E017) — the seller money-gate.
 *
 * TAX FIRST, THEN A METHOD. A withdrawal method cannot be added until a W-9 or
 * W-8 is on file, because paying somebody with no form is the one thing on
 * these pages that creates a real obligation for Panameer. The gate is enforced
 * in the lib, not by the disabled button — a rule that only exists in the UI is
 * a rule that holds until somebody uses curl.
 *
 * Which form applies is DERIVED from the payout country rather than chosen: a
 * dropdown here invites the wrong answer, and the wrong answer has consequences
 * for both sides.
 */
export const metadata = { title: "Withdrawals · Panameer" };

export default async function WithdrawalsPage() {
  /* ⚠ `authenticated` (`P2-J1.1-E046`) — ⚠ SUPERSEDED, quoted:
     `guardPage("canProvideServices")`. One of three layers; see
     `settings/layout.tsx` and `route-access.ts`. Scott opened the tree whole. */
  const viewer = await guardPage("authenticated");
  const { tax, methods } = await getWithdrawals(viewer);

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
