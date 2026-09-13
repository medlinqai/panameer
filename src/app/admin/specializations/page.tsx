import { Tags, Boxes, Workflow, Building2, Inbox } from "lucide-react";
import {
  getSpecializations,
  getSpecializationProviderCounts,
} from "@/lib/catalog";
import { TileRow } from "@/components/console/ConsolePage";
import { CatalogTree, CatalogEditBar, type CatalogNode } from "@/components/console/CatalogTree";
import { CatalogCard } from "@/components/console/CatalogCard";

export const dynamic = "force-dynamic";

/**
 * Specializations (WS6 / E017) — REAL data.
 *
 * The brief asks to "confirm flat list vs catalog hierarchy". Confirmed as a
 * hierarchy, because the data already is one: `Specialization.kind` groups
 * every row into Products & Platforms / Processes & Methodologies / Industries,
 * and getSpecializations has returned them grouped since brief_R. A flat list
 * would throw away a distinction the schema already keeps.
 *
 * ── ⚠⚠ NINE PLACEHOLDER TILES AND AN EMPTY GRID ARE GONE (`P1-A1.5-E470`) ───
 *
 * ⚠ MEASURED, top to bottom, before this change: the live TileRow, the live
 * catalog, the dead edit bar, then **a second TileRow of four `TBD` tiles**, an
 * **empty `Listing`** reading *"No specialization records yet"*, and a
 * **`VolumeFooter` of five more `TBD`s`** — nine placeholder tiles and an empty
 * grid sitting UNDER a working catalog, on a page Scott may show buyers.
 *
 * ⚠ ALL THREE CAME FROM ONE LINE: `<SpecPage slug="specializations" />`.
 * ⚠⚠ `SpecPage.tsx` AND `admin-pages.ts` ARE UNTOUCHED. They are shared by EIGHT
 * pages — payments, work-orders, settlements, contracts, work-packages,
 * work-requests, industries, specializations — and the other six are legitimately
 * un-built stubs. ⚠ THIS PAGE STOPS CALLING IT. That is the whole change, and
 * `admin-pages.ts` keeps its `specializations` entry: it is the shape the
 * moderation queue is built to in Part 3.
 */
export default async function Page() {
  const [groups, providerCounts] = await Promise.all([
    getSpecializations(),
    getSpecializationProviderCounts(),
  ]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const nodes: CatalogNode[] = groups.map((g) => ({
    id: g.kind,
    label: g.label,
    meta: `${g.items.length}`,
    children: g.items.map((i) => ({
      id: i.id,
      label: i.name,
      /* ⚠ `N providers` (S-3) — DISTINCT people, never link rows. A provider who
         claimed twelve is one person. ⚠ ZERO RENDERS `—`, never `0`: a
         specialization nobody has claimed is honest, and it is the most
         actionable row on the page. */
      meta: providerCounts.get(i.id) ? `${providerCounts.get(i.id)} providers` : "—",
      /* ⚠ `E470b` — the flag that existed and was never selected, let alone shown. */
      custom: i.is_custom,
    })),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/*
        ── ⚠ FIVE TILES, AND THE FIFTH IS NOT WHAT WAS THERE (`E468`) ──────────

        ⚠ SUPERSEDED, quoted not deleted: `{ label: "In Use", hint: "Needs a
        usage rollup" }` — a tile that rendered an em-dash and explained why.

        ⚠⚠ A SINGLE "in use" NUMBER ACROSS 27 ROWS ANSWERS NOTHING. The useful
        question is WHICH ones, and that is the `N providers` COLUMN in the grid
        below, not a tile. `Suggested` replaces it: the moderation queue's depth.
        ⚠ THE QUEUE DOES NOT EXIST UNTIL PART 3, so it shows `—`. An honest dash
        beats a tile explaining why it is empty.
        ⚠ `hint` IS DROPPED ON ALL FIVE (S-1) — the Learn tile is two lines.
      */}
      <TileRow
        tiles={[
          {
            label: "Specializations",
            value: total,
            tone: "neutral",
            icon: <Tags className="h-[19px] w-[19px]" aria-hidden />,
          },
          ...groups.map((g, i) => ({
            label: g.label,
            value: g.items.length,
            tone: (["amber", "emerald", "emeraldDeep"] as const)[i] ?? "neutral",
            icon: [
              <Boxes key="i" className="h-[19px] w-[19px]" aria-hidden />,
              <Workflow key="i" className="h-[19px] w-[19px]" aria-hidden />,
              <Building2 key="i" className="h-[19px] w-[19px]" aria-hidden />,
            ][i],
          })),
          {
            label: "Suggested",
            /* ⚠ NO `value` — `TileRow` renders "—" in muted type for an absent
               one, which is exactly the honest state until Part 3. */
            tone: "neutral" as const,
            icon: <Inbox className="h-[19px] w-[19px]" aria-hidden />,
          },
        ]}
      />
      <p className="mt-2 mb-6 text-[12.5px] text-ink-2">
        Provider counts are DISTINCT people, not selections — someone who claimed
        twelve specializations is one person in each kind they touched. ⚠ A
        provider spanning two kinds counts in both, so these do not sum to the
        provider total.
      </p>

      {/*
        ⚠ THE CATALOG MOVES INTO THE CONSOLE'S LISTING SLOT (`E470`), same as RDS.
        ⚠ THE ROWS STAY EXPANDABLE — the three kinds are the top level and the
        hierarchy is not flattened.
      */}
      <CatalogCard title={`Specializations (${total})`}>
        <CatalogTree nodes={nodes} emptyLabel="No specializations yet." />
      </CatalogCard>
      {/* ⚠ STAYS — it is the right home for Discard/Save in Part 3. */}
      <CatalogEditBar />
    </div>
  );
}
