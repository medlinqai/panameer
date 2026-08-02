import { prisma } from "@/lib/prisma";
import { getProviderFieldTree } from "@/lib/catalog";
import { TileRow } from "@/components/console/ConsolePage";
import { CatalogTree, CatalogEditBar, type CatalogNode } from "@/components/console/CatalogTree";

export const dynamic = "force-dynamic";

/**
 * Roles > Domains > Skills (WS6 / E016) on the Medlinq catalog UX.
 *
 * REAL DATA — this is one of the few admin surfaces with a full dataset behind
 * it. The previous version was a flat read-only dump of pillars and offerings;
 * the hierarchy is what makes 400-odd skills navigable, which is exactly why
 * Medlinq's service catalog is shaped this way.
 */
export default async function Page() {
  const [roles, skillCount, pillarCount] = await Promise.all([
    getProviderFieldTree(),
    prisma.skill.count(),
    prisma.pillar.count(),
  ]);

  const nodes: CatalogNode[] = await Promise.all(
    roles.map(async (r) => ({
      id: r.id,
      label: r.display || r.name,
      meta: `${r.domains.length} domains`,
      children: r.domains.map((d) => ({
        id: `${r.id}-${d.id}`,
        label: d.name,
        meta: `${d.skillCount} skills`,
        // Skills load with the page: the whole catalog is a few hundred rows,
        // and a fetch-on-expand would add a spinner to every click for no gain.
        children: [] as CatalogNode[],
      })),
    }))
  );

  // Fill the leaf level in one query rather than per-domain.
  const skills = await prisma.skill.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, role_type_id: true, pillar_id: true },
  });
  for (const role of nodes) {
    for (const domain of role.children ?? []) {
      const [roleId, pillarId] = domain.id.split("-").length > 1
        ? [role.id, domain.id.slice(role.id.length + 1)]
        : [role.id, ""];
      domain.children = skills
        .filter((s) => s.role_type_id === roleId && s.pillar_id === pillarId)
        .map((s) => ({ id: s.id, label: s.name }));
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <TileRow
        tiles={[
          { label: "Roles", value: roles.length, hint: "Top of the catalog" },
          { label: "Domains", value: pillarCount, hint: "ERP pillars" },
          { label: "Skills", value: skillCount, hint: "Leaf vocabulary" },
          { label: "Custom Skills", hint: "Needs a provenance flag" },
          { label: "Unmapped", hint: "Needs a mapping report" },
        ]}
      />

      <div className="mt-6">
        <CatalogTree nodes={nodes} emptyLabel="The service catalog is empty." />
        <CatalogEditBar />
      </div>
    </div>
  );
}
