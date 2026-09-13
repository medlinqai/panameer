import Link from "next/link";
import { Tags, Boxes, Workflow, Building2, Inbox } from "lucide-react";
import {
  getSpecializations,
  getSpecializationProviderCounts,
  getSpecializationClaims,
  providersCell,
} from "@/lib/catalog";
import { TileRow, Listing, VolumeFooter } from "@/components/console/ConsolePage";
import { CatalogTree, type CatalogNode } from "@/components/console/CatalogTree";
import { CatalogCard } from "@/components/console/CatalogCard";
import { CatalogMark } from "@/components/console/CatalogMark";
import { CatalogAddBar } from "@/components/console/CatalogEditor";
import { SPECIALIZATION_MARKS, KIND_FALLBACK } from "@/lib/catalog-marks";

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
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; claimed?: string }>;
}) {
  /*
    ⚠⚠ THE ADMIN TREE ASKS FOR RETIRED ROWS EXPLICITLY (`P1-A1.5-E481`).
    `lib/catalog.ts` defaults every read to `status: ACTIVE`, so a picker that
    forgets to think about status gets the SAFE answer. ⚠ THIS PAGE IS THE ONE
    SURFACE THAT MUST SEE RETIRED ROWS — an admin cannot bring a row back if the
    page it lives on hides it. They render MARKED, never silently.
  */
  const sp = await searchParams;

  const [groups, providerCounts, kindClaims] = await Promise.all([
    getSpecializations({ includeRetired: true }),
    getSpecializationProviderCounts(),
    getSpecializationClaims(),
  ]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  /* ⚠ WHITELIST AGAINST THE DATA, not against a literal list — `getSpecializations`
     already groups by kind, so an unknown `?kind=` simply finds nothing and falls
     back to the tree rather than rendering an empty listing that looks broken.
     ⚠⚠ THIS IS WHAT WS-10 REPOINTS THE INDUSTRIES RAIL ITEM AT. */
  const filtered = sp.kind ? groups.find((g) => g.kind === sp.kind) ?? null : null;
  const claimedKind = sp.claimed ? groups.find((g) => g.kind === sp.claimed) ?? null : null;

  const nodes: CatalogNode[] = groups.map((g) => ({
    id: g.kind,
    label: g.label,
    meta: `${g.items.length}`,
    /* ⚠ `E465` — the group's own mark, so the left column is straight at both
       levels rather than starting one indent in. */
    mark: KIND_FALLBACK[g.kind] ?? null,
    children: g.items.map((i) => ({
      id: i.id,
      label: i.name,
      /* ⚠ `N providers` (S-3) — DISTINCT people, never link rows. A provider who
         claimed twelve is one person. ⚠ ZERO RENDERS `—`, never `0`: a
         specialization nobody has claimed is honest, and it is the most
         actionable row on the page. */
      meta: providersCell(providerCounts.get(i.id)),
      /* ⚠ `E471` — 11 vendor monograms, 6 process chips, 10 industry icons.
         ⚠⚠ KEYED ON THE NAME because `Specialization` has no `code`, and mapped
         against the LIVE rows rather than the seed JSON: the JSON still carries
         the malformed `Enterprise Business Suite ()EBS)` and the seed's
         `fixTypo` repairs it on the way in, so a JSON-keyed map would have
         missed that row entirely.
         ⚠ A provider-authored `is_custom` row is unmapped BY DEFINITION and
         falls back to its kind's muted icon — permanent, not a gap to fill. */
      mark: SPECIALIZATION_MARKS[i.name] ?? KIND_FALLBACK[g.kind] ?? null,
      custom: i.is_custom,
      /* ⚠ `E481` — retired rows render here, MARKED. They are filtered out of
         every provider-facing picker by lib/catalog.ts's ACTIVE default. */
      retired: i.status === "RETIRED",
      edit: {
        table: "specialization" as const,
        id: i.id,
        name: i.name,
        kind: g.kind as "PRODUCT" | "METHODOLOGY" | "INDUSTRY",
        status: i.status,
        origin: i.origin,
      },
    })),
  }));

  /*
    ── ⚠⚠ A DRILL-IN TAKES OVER THE PAGE (`P1-A1.5-E485`) ────────────────────

    > **SCOTT, 2026-09-13:** *"none of these link to reports"*

    ⚠⚠ THEY DO LINK, AND THEY ALWAYS DID. The bug is WHERE THE RESULT APPEARS:
    the footer tiles sit at the bottom of a long page and the ranked listing
    rendered in the page BODY, above them — outside the viewport being looked at.
    Nothing visibly happened, so the tile read as dead.

    ⚠ THE BRIEF'S PREMISE WAS HALF RIGHT, AND THE HALF IT MISSED IS THE CAUSE.
    It says to hide the tree and the tile row *"as `?view=` already does"*.
    ⚠⚠ MEASURED: `?view=` HID THE TREE AND NOTHING ELSE. The tile row and the
    footer strip rendered on EVERY drill-in, so `?claimed=` put its listing
    between two strips instead of replacing them — and `?view=` had the same
    flaw, just less visibly because its tiles are at the top.

    ⚠ SO ONE FLAG COVERS BOTH, and both drill-ins now behave identically: tiles
    out, tree out, footer out, the listing IS the page. Same shape as the Users
    page's `?stage=` drill-in, which is the pattern Scott approved.
    ⚠ ZEROES STAY, AT THE BOTTOM — `E465b`'s rule holds: a category nobody has
    claimed is the most actionable row on the page. Moving the listing does not
    filter it.
  */
  const isDrillIn = !!filtered || !!claimedKind;

  /*
    ⚠ `E486` — ONE LINK COLOUR ON THE PAGE. `BackLink` does NOT render here
    (reported: the brief expected it to), so this is the catalog's own back
    affordance and it takes the same `--color-magenta-ink` token rather than
    saturated `#d72cd6`. ⚠ SUPERSEDED, quoted not deleted: `text-magenta`.
    ⚠ IT STAYS IN THE LISTING'S `action` SLOT, not above the title — the card
    header is where it already sits and `E485` says to keep it wired as-is.
  */
  const clearLink = (
    <Link
      href="/admin/specializations"
      className="text-[14px] font-bold text-magenta-ink transition-colors hover:text-magenta-ink-hover hover:underline"
    >
      ‹ Back to Specializations
    </Link>
  );

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
      {!isDrillIn && (
      <TileRow
        tiles={[
          {
            label: "Specializations",
            value: total,
            tone: "neutral",
            /* ⚠ TILE 1 CLEARS THE FILTER (`E469`) — no `?kind=`, so it is the
               way back to the full tree from any drill-in. */
            href: "/admin/specializations",
            icon: <Tags className="h-[19px] w-[19px]" aria-hidden />,
          },
          ...groups.map((g, i) => ({
            label: g.label,
            value: g.items.length,
            tone: (["amber", "emerald", "emeraldDeep"] as const)[i] ?? "neutral",
            href: `/admin/specializations?kind=${g.kind}`,
            icon: [
              <Boxes key="i" className="h-[19px] w-[19px]" aria-hidden />,
              <Workflow key="i" className="h-[19px] w-[19px]" aria-hidden />,
              <Building2 key="i" className="h-[19px] w-[19px]" aria-hidden />,
            ][i],
          })),
          {
            label: "Suggested",
            /* ⚠ NO `value` — `TileRow` renders "—" in muted type for an absent
               one, which is exactly the honest state until Part 3.
               ⚠⚠ AND NO `href`: the moderation queue does not exist yet, and a
               tile that opens an empty page is worse than one that does not
               open at all. */
            tone: "neutral" as const,
            icon: <Inbox className="h-[19px] w-[19px]" aria-hidden />,
          },
        ]}
      />
      )}
      {!isDrillIn && (
      <p className="mt-2 mb-6 text-[12.5px] text-ink-2">
        Provider counts are DISTINCT people, not selections — someone who claimed
        twelve specializations is one person in each kind they touched. ⚠ A
        provider spanning two kinds counts in both, so these do not sum to the
        provider total.
      </p>
      )}

      {/*
        ⚠ THE CATALOG MOVES INTO THE CONSOLE'S LISTING SLOT (`E470`), same as RDS.
        ⚠ THE ROWS STAY EXPANDABLE — the three kinds are the top level and the
        hierarchy is not flattened.
      */}
      {/*
        ── ⚠ EVERY TILE OPENS A LISTING (`P1-A1.5-E469`) ──────────────────────

        **SCOTT, on both pages:** *"the tiles do not link to lists of their
        contents."*

        ⚠ FLAT, NO ACCORDION — one kind is one level, so there is nothing to
        nest. ⚠ THE DRILL-IN REPLACES THE TREE rather than sitting beside it:
        two data containers stacked is exactly what WS-4a just removed.
      */}
      {filtered && (
        <Listing
          title={`${filtered.label} (${filtered.items.length})`}
          columns={["Specialization", "Providers", "Source"]}
          rows={filtered.items.map((i) => [
            /* ⚠ THE SAME MARK AS THE TREE — a row must not change identity
               between the accordion and its drill-in. */
            <span key={i.id} className="flex items-center gap-2.5">
              <CatalogMark mark={SPECIALIZATION_MARKS[i.name] ?? KIND_FALLBACK[filtered.kind]} />
              {i.name}
            </span>,
            providerCounts.get(i.id) ? `${providerCounts.get(i.id)}` : "—",
            i.is_custom ? "Custom" : "Baseline",
          ])}
          rowMeta={filtered.items.map((i) => ({
            text: i.name.toLowerCase(),
            sort: [i.name, providerCounts.get(i.id) ?? 0, i.is_custom ? 1 : 0] as (
              | string
              | number
              | null
            )[],
          }))}
          searchPlaceholder={`Search ${filtered.items.length} ${filtered.label.toLowerCase()}`}
          sortable
          action={clearLink}
          empty="Nothing in this kind yet."
        />
      )}

      {claimedKind && (
        /* ⚠⚠ RANKED BY DISTINCT PROVIDERS, ZEROES INCLUDED AT THE BOTTOM —
           a specialization nobody has claimed is the most actionable row here,
           and dropping it would hide exactly that. */
        <Listing
          title={`Most claimed — ${claimedKind.label}`}
          columns={["Specialization", "Providers", "Source"]}
          rows={[...claimedKind.items]
            .sort(
              (a, b) =>
                (providerCounts.get(b.id) ?? 0) - (providerCounts.get(a.id) ?? 0) ||
                a.name.localeCompare(b.name)
            )
            .map((i) => [
              <span key={i.id} className="flex items-center gap-2.5">
                <CatalogMark mark={SPECIALIZATION_MARKS[i.name] ?? KIND_FALLBACK[claimedKind.kind]} />
                {i.name}
              </span>,
              providerCounts.get(i.id) ? `${providerCounts.get(i.id)}` : "—",
              i.is_custom ? "Custom" : "Baseline",
            ])}
          rowMeta={[...claimedKind.items]
            .sort(
              (a, b) =>
                (providerCounts.get(b.id) ?? 0) - (providerCounts.get(a.id) ?? 0) ||
                a.name.localeCompare(b.name)
            )
            .map((i) => ({
              text: i.name.toLowerCase(),
              sort: [i.name, providerCounts.get(i.id) ?? 0, i.is_custom ? 1 : 0] as (
                | string
                | number
                | null
              )[],
            }))}
          searchPlaceholder={`Search ${claimedKind.items.length} ${claimedKind.label.toLowerCase()}`}
          sortable
          action={clearLink}
          empty="Nothing in this kind yet."
        />
      )}

      {!filtered && !claimedKind && (
        <CatalogCard title={`Specializations (${total})`}>
          <CatalogTree nodes={nodes} emptyLabel="No specializations yet." />
        </CatalogCard>
      )}
      {/* ⚠⚠ `E479` STOPPED RENDERING THE OLD BAR PRECISELY SO IT COULD COME BACK
          MEANING SOMETHING (`E481`). It used to say "editing needs write
          endpoints that aren't built yet"; they are built now, so the same slot
          carries a live Add. */}
      {!isDrillIn && <CatalogAddBar table="specialization" label="specialization" />}

      {/*
        ── ⚠ THE OLD EDIT BAR, SUPERSEDED (`P1-A1.5-E479`) ────────────────────

        > **SCOTT, 2026-09-13, on the bar:** *"What does this mean?"*

        ⚠ SUPERSEDED, quoted not deleted (`E164`): `<CatalogEditBar />` — a
        sticky footer reading *"Editing this catalog needs write endpoints that
        aren't built yet — it's read-only for now"* beside a dead Save button.

        ⚠⚠ THIS IS THE THIRD INSTANCE OF A PATTERN SCOTT HAS DELETED TWICE
        ALREADY — the `TBD / metric to be defined` tiles (`E470c`) and the
        explanatory paragraph (`E457`). A page that explains why part of itself
        does not work is a page apologising for itself, and these two pages are
        ones he is considering showing buyers.
        ⚠⚠ THE COMPONENT IS NOT DELETED. Part 3 brings it back with a Save that
        works; `E164`, and it is five lines. Only the call site goes.
      */}

      {/*
        ── ⚠⚠ "Most claimed", NOT "Volume Last 90 Days" (`P1-A1.5-E470c`) ─────

        ⚠⚠ FIXED CATALOG ORDER — `getSpecializationClaims` returns the three
        kinds in catalog order and this does NOT re-sort by count. The ranking
        lives inside the drill-in.
      */}
      {!isDrillIn && (
      <VolumeFooter
        title="Most claimed"
        tiles={kindClaims.map((c) => ({
          label: c.label,
          value: c.providers || undefined,
          href: `/admin/specializations?claimed=${c.key}`,
          hint: c.top
            ? `top: ${c.top.name} (${c.top.providers})`
            : "nobody has claimed this kind yet",
        }))}
      />
      )}
    </div>
  );
}
