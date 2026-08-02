import { getSpecializations } from "@/lib/catalog";
import { TileRow } from "@/components/console/ConsolePage";
import { CatalogTree, CatalogEditBar, type CatalogNode } from "@/components/console/CatalogTree";

export const dynamic = "force-dynamic";

/**
 * Specializations (WS6 / E017) — REAL data.
 *
 * The brief asks to "confirm flat list vs catalog hierarchy". Confirmed as a
 * hierarchy, because the data already is one: `Specialization.kind` groups
 * every row into Products & Platforms / Processes & Methodologies / Industries,
 * and getSpecializations has returned them grouped since brief_R. A flat list
 * would throw away a distinction the schema already keeps.
 */
export default async function Page() {
  const groups = await getSpecializations();
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const nodes: CatalogNode[] = groups.map((g) => ({
    id: g.kind,
    label: g.label,
    meta: `${g.items.length}`,
    children: g.items.map((i) => ({ id: i.id, label: i.name })),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <TileRow
        tiles={[
          { label: "Specializations", value: total, hint: "All kinds" },
          ...groups.map((g) => ({ label: g.label, value: g.items.length })),
          { label: "In Use", hint: "Needs a usage rollup" },
        ]}
      />
      <div className="mt-6">
        <CatalogTree nodes={nodes} />
        <CatalogEditBar />
      </div>
    </div>
  );
}
