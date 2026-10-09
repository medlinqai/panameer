import { prisma } from "@/lib/prisma";
import { listServiceTypes } from "@/lib/my-catalog";
import { BackLink } from "@/components/console/BackLink";
import { ServiceTypeReview } from "@/components/admin/ServiceTypeReview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Service Types · Admin · Panameer" };

// CAT-E002: Business Type Taxonomy › Service Types — the baseline list and the ones providers added.
export default async function Page() {
  const types = await listServiceTypes();
  const counts = new Map((await prisma.providerService.groupBy({ by: ["service_type_id"], _count: { _all: true } })).map((g) => [g.service_type_id, g._count._all]));
  const reviewed = new Set((await prisma.serviceType.findMany({ where: { reviewed_at: { not: null } }, select: { id: true } })).map((t) => t.id));
  return (
    <div className="mx-auto w-full max-w-4xl">
      <BackLink href="/admin/skill-catalog" label="Business Type Taxonomy" />
      <h1 className="mb-1 mt-2 text-[28px] font-bold">Service Types</h1>
      <p className="mb-5 text-[14px] text-ink-2">Panameer&apos;s baseline list plus the types providers add. Approve a new one, or merge it into an existing type (its services move with it).</p>
      <ServiceTypeReview rows={types.map((t) => ({ id: t.id, name: t.name, baseline: t.is_baseline, reviewed: reviewed.has(t.id), services: counts.get(t.id) ?? 0 }))} />
    </div>
  );
}
