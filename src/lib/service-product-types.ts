import { prisma } from "@/lib/prisma";

// WS-E008: Shop › Service Type — the grouped baseline (created on first read, like service types) plus member suggestions.
export const BASELINE_PRODUCT_TYPES: { name: string; group: "Build" | "Run" }[] = [
  { name: "Reports", group: "Build" },
  { name: "Dashboards & Analytics", group: "Build" },
  { name: "Integrations & Interfaces", group: "Build" },
  { name: "Conversions (Data Loads)", group: "Build" },
  { name: "Extensions & Workflows", group: "Build" },
  { name: "AI Agents", group: "Run" },
  { name: "Health Checks & Assessments", group: "Run" },
  { name: "Configuration & Setup", group: "Run" },
];

/** Live types: the baseline and approved suggestions, merged ones folded away. */
export async function listProductTypes(opts: { includeUnreviewed?: boolean } = {}) {
  const n = await prisma.serviceProductType.count({ where: { is_baseline: true } });
  if (n < BASELINE_PRODUCT_TYPES.length)
    for (const [i, t] of BASELINE_PRODUCT_TYPES.entries())
      await prisma.serviceProductType.upsert({ where: { name: t.name }, create: { name: t.name, group_label: t.group, is_baseline: true, sort_order: i, reviewed_at: new Date() }, update: { is_baseline: true, group_label: t.group } });
  return prisma.serviceProductType.findMany({
    where: { merged_into_id: null, ...(opts.includeUnreviewed ? {} : { reviewed_at: { not: null } }) },
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, group_label: true, is_baseline: true, reviewed_at: true },
  });
}

/** "Don't see yours? Suggest a Service Type" — reused if it exists; new ones wait for admin review. */
export async function suggestProductType(name: string, personId: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 60);
  if (clean.length < 3) throw new Error("Give the service type a name");
  const hit = await prisma.serviceProductType.findFirst({ where: { name: { equals: clean, mode: "insensitive" } } });
  if (hit) return { id: hit.merged_into_id ?? hit.id, existing: true };
  const row = await prisma.serviceProductType.create({ data: { name: clean, created_by_person_id: personId }, select: { id: true } });
  return { id: row.id, existing: false };
}
