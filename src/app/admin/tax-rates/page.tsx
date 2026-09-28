import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { TileRow } from "@/components/console/ConsolePage";
import { TaxRateEditor } from "@/components/assessment/TaxRateEditor";
import { DEFAULT_TAX_RATE_BPS, bpsToPercent } from "@/lib/assessment/tax-rate";

export const dynamic = "force-dynamic";

/**
 * FUNDING RATE — the assessment's one tax variable, in Panameer Admin (WS-C).
 *
 * Phase 1's entire tax logic is `EBITDA x rate`, and this is where the rate
 * lives: a global default plus optional per-state overrides, both editable by a
 * Panameer Admin. It exists on day one precisely because Scott intends to
 * refine the number and build out the geography table, and a constant in a
 * source file would make each of those a code change.
 *
 * ⚠ CHANGING A RATE CHANGES EVERY REPORT that resolves to it, including ones
 * already emailed — the report recomputes funding on each render. That is the
 * intended behaviour (the rate is a current statement, not a historical one)
 * but it is stated on the page so nobody discovers it by surprise.
 */
export default async function TaxRatesPage() {
  await guardPage("canAdminister");

  const rows = await prisma.taxRate.findMany({
    orderBy: [{ geography: "asc" }],
    select: { id: true, geography: true, rate_bps: true, note: true, updated_at: true },
  });

  const global = rows.find((r) => r.geography === null) ?? null;
  const overrides = rows.filter((r) => r.geography !== null);

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/*
        ── ⚠⚠⚠ THE PAGE HAD NO NAME AT ALL (`P2-A15-E696` WS-A, ruling 95 check 1)

        ⚠⚠ Ruling 95's first check is *"verify page name — the `<h1>` and the menu
        label disagree, **or the page has no name at all**."* ⚠ **This page had
        none: it opened straight onto a `TileRow`.** So the only name it had was
        the menu label, and that label said `Funding Rate`, which is the thing
        ruling `97a` says it is not.
        ⚠ It now names the assessment, and it matches the menu word for word.
      */}
      <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">
        Assessment Funding Rate
      </h1>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        The tax-credit rate the assessment report multiplies EBITDA by. ⚠ This is
        not a platform commission — those live on Application Commissions.
      </p>
      <div className="mt-5" />
      <TileRow
        tiles={[
          {
            label: "Global rate",
            value: `${bpsToPercent(global?.rate_bps ?? DEFAULT_TAX_RATE_BPS)}%`,
            hint: global ? "Set here" : "Built-in default — not yet saved",
          },
          { label: "Geography overrides", value: overrides.length, hint: "Most specific wins" },
          { label: "Used by", value: "Assessment reports", hint: "Funding = EBITDA × rate" },
        ]}
      />
      <TaxRateEditor
        global={global ? { rate_bps: global.rate_bps, note: global.note } : null}
        overrides={overrides.map((o) => ({
          geography: o.geography as string,
          rate_bps: o.rate_bps,
          note: o.note,
        }))}
        builtInBps={DEFAULT_TAX_RATE_BPS}
      />
    </div>
  );
}
