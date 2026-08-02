import { getSpecializations } from "@/lib/catalog";
import { TileRow } from "@/components/console/ConsolePage";
import { CatalogTree, CatalogEditBar, type CatalogNode } from "@/components/console/CatalogTree";

export const dynamic = "force-dynamic";

/**
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
    </div>
  );
}
