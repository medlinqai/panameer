import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { TileRow } from "@/components/console/ConsolePage";
import { TaxRateEditor } from "@/components/assessment/TaxRateEditor";
import { DEFAULT_TAX_RATE_BPS, bpsToPercent } from "@/lib/assessment/tax-rate";

export const dynamic = "force-dynamic";

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
      {}
      <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">
        Assessment Rate
      </h1>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        The tax-credit rate the assessment report multiplies EBITDA by. ⚠ This is
        not a platform commission — those live on Commission Rate.
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
