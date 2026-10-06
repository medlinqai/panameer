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
import { suggestionQueue } from "@/lib/catalog-write";
import { SPECIALIZATION_MARKS, KIND_FALLBACK } from "@/lib/catalog-marks";
import { BackLink } from "@/components/console/BackLink";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; claimed?: string }>;
}) {
  const sp = await searchParams;

  // One review place: suggestions are reviewed in Skill Catalog › Compare › Specializations.
  const waiting = (await suggestionQueue()).filter((q) => q.status === "SUGGESTED").length;

  const [groups, providerCounts, kindClaims] = await Promise.all([
    getSpecializations({ includeRetired: true, includeAllCatalogs: true }),
    getSpecializationProviderCounts(),
    getSpecializationClaims(),
  ]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const filtered = sp.kind ? groups.find((g) => g.kind === sp.kind) ?? null : null;
  const claimedKind = sp.claimed ? groups.find((g) => g.kind === sp.claimed) ?? null : null;

  const nodes: CatalogNode[] = groups.map((g) => ({
    id: g.kind,
    label: g.label,
    meta: `${g.items.length}`,
    // — the group's own mark, so the left column is straight at both
    mark: KIND_FALLBACK[g.kind] ?? null,
    children: g.items.map((i) => ({
      id: i.id,
      label: i.name,
      // claimed twelve is one person. ZERO RENDERS `—`, never `0`: a
      meta: providersCell(providerCounts.get(i.id)),
      // — 11 vendor monograms, 6 process chips, 10 industry icons.
      mark: SPECIALIZATION_MARKS[i.name] ?? KIND_FALLBACK[g.kind] ?? null,
      custom: i.is_custom,
      // — retired rows render here, MARKED. They are filtered out of
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

  // A DRILL-IN TAKES OVER THE PAGE
  const isDrillIn = !!filtered || !!claimedKind;

  // — ONE LINK COLOUR ON THE PAGE. `BackLink` does NOT render here
  const clearLink = (
    <BackLink href="/admin/specializations" label="Specializations" />
  );

  return (
    <div className="pm-white-page pm-square mx-auto w-full max-w-5xl">
      {/* FIVE TILES, AND THE FIFTH IS NOT WHAT WAS THERE */}
      {!isDrillIn && (
      <TileRow
        tiles={[
          {
            label: "Specializations",
            value: total,
            tone: "neutral",
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
            // SHIPPED THIS TILE SHOWING "—" BECAUSE THE QUEUE DID NOT
            value: waiting || undefined,
            href: "/admin/skill-catalog?tab=compare&sub=specs",
            // NO `value` — `TileRow` renders "—" in muted type for an absent
            tone: "neutral" as const,
            icon: <Inbox className="h-[19px] w-[19px]" aria-hidden />,
          },
        ]}
      />
      )}
      {!isDrillIn && <div className="mb-6" />}

      {/* THE CATALOG MOVES INTO THE CONSOLE'S LISTING SLOT , same as RDS. */}
      {/* EVERY TILE OPENS A LISTING */}
      {filtered && (
        <Listing
          title={`${filtered.label} (${filtered.items.length})`}
          columns={["Specialization", "Providers", "Source"]}
          rows={filtered.items.map((i) => [
            // THE SAME MARK AS THE TREE — a row must not change identity
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
        // RANKED BY DISTINCT PROVIDERS, ZEROES INCLUDED AT THE BOTTOM —
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

      {/* THE MODERATION QUEUE */}

      {!isDrillIn && (
        <CatalogCard title={`Specializations (${total})`}>
          <CatalogTree nodes={nodes} emptyLabel="No specializations yet." />
        </CatalogCard>
      )}
      {/* STOPPED RENDERING THE OLD BAR PRECISELY SO IT COULD COME BACK */}
      {!isDrillIn && <CatalogAddBar table="specialization" label="specialization" />}

      {/* THE OLD EDIT BAR */}

      {/* FIXED CATALOG ORDER — `getSpecializationClaims` returns the three */}
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
