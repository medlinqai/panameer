import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { TileRow } from "@/components/console/ConsolePage";
import {
  ApplicationCommissionsEditor,
  type CommissionRow,
} from "@/components/admin/ApplicationCommissionsEditor";
import { bpsToPercentLabel } from "@/lib/application-commissions";

export const dynamic = "force-dynamic";

/**
 * APPLICATION COMMISSIONS — the platform's cut, by sourcing kind (`P2-A15-E696`
 * WS-E, ruling 97).
 *
 * ⚠⚠ **THIS IS NOT THE ASSESSMENT'S FUNDING RATE.** That is `/admin/tax-rates`,
 * it multiplies EBITDA on a report, and **its changes reach reports already
 * sent.** ⚠⚠⚠ **THIS PAGE'S CHANGES REACH NEW TRANSACTIONS ONLY** — the rate is
 * stamped onto the work order line at creation and never looked up again.
 * ⚠ The two sit side by side in the admin menu, which is exactly why each says
 * its own rule in full rather than relying on the reader.
 */
export const metadata = { title: "Application Commissions · Panameer" };

export default async function ApplicationCommissionsPage() {
  await guardPage("canAdminister");

  const rows = (await prisma.applicationCommission.findMany({
    orderBy: [{ sourcing_kind: "asc" }, { transaction_type: "asc" }],
    select: {
      sourcing_kind: true,
      transaction_type: true,
      rate_bps: true,
      note: true,
    },
  })) as CommissionRow[];

  const defaults = rows.filter((r) => r.transaction_type === null);
  const overrides = rows.filter((r) => r.transaction_type !== null);
  const byKind = (k: CommissionRow["sourcing_kind"]) =>
    defaults.find((r) => r.sourcing_kind === k);

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* ⚠ Ruling 95 check 1 — the page is named, and the name matches the menu
          label word for word. */}
      <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">
        Application Commissions
      </h1>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        What Panameer takes on a transaction, by how much sourcing the platform
        did. ⚠ Not the assessment&apos;s funding rate — that is a different
        number on a different page.
      </p>

      <div className="mt-5">
        <TileRow
          tiles={[
            {
              label: "Sole-sourced",
              value: byKind("SOLE_SOURCED")
                ? `${bpsToPercentLabel(byKind("SOLE_SOURCED")!.rate_bps)}%`
                : "—",
              hint: "The buyer already knew them",
            },
            {
              label: "App-sourced",
              value: byKind("APP_SOURCED")
                ? `${bpsToPercentLabel(byKind("APP_SOURCED")!.rate_bps)}%`
                : "—",
              hint: "Panameer matched and proposed",
            },
            {
              label: "Service product",
              value: byKind("SERVICE_PRODUCT")
                ? `${bpsToPercentLabel(byKind("SERVICE_PRODUCT")!.rate_bps)}%`
                : "—",
              hint: "The catalogue made the sale",
            },
            {
              label: "Overrides",
              value: overrides.length,
              hint: "Most specific wins",
            },
          ]}
        />
      </div>

      <ApplicationCommissionsEditor rows={rows} />
    </div>
  );
}
