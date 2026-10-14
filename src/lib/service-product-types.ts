import { prisma } from "@/lib/prisma";
import { sellerTypeByName } from "@/lib/business-types";

// WS-E008 / TX-E006: Shop › Service Type. Reads the Service Taxonomy once seeded; before that, the WS-E008 list.
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

/** TX-E006: once the Service Taxonomy is seeded, Service Product Types are service_types (kind SERVICE_PRODUCT). */
export async function taxonomyLoaded() {
  return (await prisma.serviceType.count({ where: { kind: "SERVICE_PRODUCT", status: { in: ["STOCK", "APPROVED"] }, merged_into_id: null } })) > 0;
}

/** Live types grouped by Service Category (taxonomy), else the pre-taxonomy list: baseline and approved, merged ones folded away. */
export async function listProductTypes(opts: { includeUnreviewed?: boolean } = {}) {
  if (await taxonomyLoaded()) {
    const rows = await prisma.serviceType.findMany({
      where: { kind: "SERVICE_PRODUCT", merged_into_id: null, status: { in: opts.includeUnreviewed ? ["STOCK", "APPROVED", "SUGGESTED"] : ["STOCK", "APPROVED"] } },
      select: { id: true, name: true, is_baseline: true, reviewed_at: true, sort_order: true, serviceCategory: { select: { name: true, sort_order: true } } },
    });
    return rows
      .sort((a, b) => (a.serviceCategory?.sort_order ?? 99) - (b.serviceCategory?.sort_order ?? 99) || a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      .map((t) => ({ id: t.id, name: t.name, group_label: t.serviceCategory?.name ?? null, is_baseline: t.is_baseline, reviewed_at: t.reviewed_at }));
  }
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
  if (await taxonomyLoaded()) {
    const t = await sellerTypeByName(personId, clean);
    if (t) return { id: t.merged_into_id ?? t.id, existing: true };
    const row = await prisma.serviceType.create({ data: { name: clean, kind: "SERVICE_PRODUCT", status: "SUGGESTED", created_by_person_id: personId }, select: { id: true } });
    return { id: row.id, existing: false };
  }
  const hit = await prisma.serviceProductType.findFirst({ where: { name: { equals: clean, mode: "insensitive" } } });
  if (hit) return { id: hit.merged_into_id ?? hit.id, existing: true };
  const row = await prisma.serviceProductType.create({ data: { name: clean, created_by_person_id: personId }, select: { id: true } });
  return { id: row.id, existing: false };
}
