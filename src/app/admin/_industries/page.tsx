import { getSpecializations } from "@/lib/catalog";
import { TileRow } from "@/components/console/ConsolePage";
import { SpecPage } from "@/components/console/SpecPage";
import { CatalogTree, CatalogEditBar, type CatalogNode } from "@/components/console/CatalogTree";

export const dynamic = "force-dynamic";

/**
 * ── ⚠⚠ RETIRED. THIS FILE NO LONGER RENDERS A ROUTE (`P1-A1.5-E470d`) ───────
 *
 * **SCOTT, 2026-09-13:** *"On industries, that content is a specialization...it
 * should be managed on the specialization page."*
 *
 * ⚠ THE FOLDER IS `_industries`, NOT `industries`. Next.js App Router treats an
 * underscore-prefixed folder as PRIVATE and does not route it, so
 * `/admin/industries` is gone while the file survives.
 *
 * ⚠⚠ WHY NOT DELETED, WHEN THE BRIEF SAID "DELETE": `E164` — *"never delete a
 * file"* — is a HOUSE RULE and a brief does not override one. Its established
 * form on this repo is the file staying on disk, unmounted: `SettingsHeading`
 * (`settings/layout.tsx:70`), the seventeen unimported marketing sections
 * (`app/page.tsx:263`), and Scott's own instruction in `E418` to keep *"the
 * company routes on disk, unrouted (E164)."* ⚠ UNROUTING IS THE SAME OUTCOME
 * THE BRIEF ASKED FOR — the second PAGE is gone — and it is reversible.
 * ⚠ REPORTED AS A DEVIATION, not done quietly.
 *
 * ⚠ THE RAIL ITEM SURVIVES, repointed to
 * `/admin/specializations?kind=INDUSTRY` (`nav.ts`), which reads the same ten
 * rows from the same table. ⚠ `admin-pages.ts` KEEPS its `industries` entry:
 * `SpecPage` is shared by eight pages and pruning its spec table as tidy-up
 * would break the other seven.
 *
 * ── the original header, kept verbatim ──────────────────────────────────────
 *
 * Industries (WS6 / E017) — REAL data, and a FLAT list, unlike its neighbour.
 *
 * Industries are one `kind` of Specialization in this schema, not a dimension
 * of their own. So this page is the same console pattern reading the same
 * table, filtered — rather than a second catalog that would drift from the
 * first. If Industries ever become their own model, this is the one page that
 * changes.
 *
 * Flat because there is nothing below an industry to nest: the rows are leaves.
 */
export default async function Page() {
  const groups = await getSpecializations();
  const industries = groups.find((g) => g.kind === "INDUSTRY")?.items ?? [];

  const nodes: CatalogNode[] = industries.map((i) => ({ id: i.id, label: i.name }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <TileRow
        tiles={[
          { label: "Industries", value: industries.length, hint: "Specialization kind" },
          { label: "Providers Tagged", hint: "Needs a usage rollup" },
          { label: "Companies Tagged", hint: "Needs a usage rollup" },
        ]}
      />
      <div className="mt-6">
        <p className="mb-3 text-[13.5px] text-ink-2">
          Industries are a <b>kind</b> of Specialization in this schema, not a
          separate dimension — so this reads the same table, filtered. Flat
          rather than hierarchical: there is nothing below an industry to nest.
        </p>
        <CatalogTree nodes={nodes} emptyLabel="No industries in the catalog." />
        <CatalogEditBar />
      </div>

      {/*
        The deck's listing + Volume strip sit BELOW the real catalog (slides
        13/14). Both are stubs — the deck's columns describe a moderation queue
        that has no model behind it — while the tree above is live data. Keeping
        them on one page rather than choosing between them is deliberate: the
        catalog is what an admin edits today, the listing is what the design
        says this page becomes.
      */}
      <SpecPage slug="industries" />
    </div>
  );
}
