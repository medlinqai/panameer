import { guardPage } from "@/lib/guard";
import { getWithdrawals, logTaxFormAccess } from "@/lib/settings";
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
  /* ⚠⚠ BACK TO `canProvideServices` (`P2-J1.1-E050`), AND THAT IS NOT A REVERSAL
     OF `E046` — IT IS THE JUDGEMENT `E046` ASKED FOR. Scott opened the tree so
     fit could be judged by USING the pages; he then walked it as a buyer and
     judged this one seller-only.
     ⚠ SUPERSEDED, quoted: `guardPage("authenticated")`, and before that
     `guardPage("canProvideServices")` — the value returns, the reasoning does
     not. ⚠ ONE OF THREE LAYERS: `route-access.ts` narrows the prefix and
     `settings-nav.ts` declares the tab's `requires`. `settings/layout.tsx`
     deliberately STAYS `authenticated` — it gates the whole tree. */
  const viewer = await guardPage("canProvideServices");
  const { tax, methods } = await getWithdrawals(viewer);

  /*
    ── ⚠⚠ "DOCUMENT ALL OCCASIONS OF USER ACCESS" (`P1-ALL-E404` WS-3) ────────

    An IRS condition for an electronic substitute Form W-9, and the one that is
    NOT about submitting: opening the form is an occasion of access. ⚠ LOGGED
    HERE, IN THE RENDER, because a log that only fires on submit cannot answer
    the question the IRS asks — it records signatures, not access.

    ⚠ IT NEVER BLOCKS THE PAGE. The write is awaited so the record is real, and
    `logTaxFormAccess` swallows its own failure: an audit trail is evidence, and
    failing evidence must not stop somebody filing their tax form.
  */
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
