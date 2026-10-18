import { redirect } from "next/navigation";
import { taxonomyLoaded } from "@/lib/service-product-types";
import { prisma } from "@/lib/prisma";
import { listProductTypes } from "@/lib/service-product-types";
import { BackLink } from "@/components/console/BackLink";
import { ServiceTypeReview } from "@/components/admin/ServiceTypeReview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Service Product Types · Admin · Panameer" };

// WS-E008: Service Taxonomy › Service Product Types — the Shop's grouped list and the types members suggest.
export default async function Page() {
  // TX-E005: once the Service Taxonomy is seeded, suggestions are reviewed there.
  if (await taxonomyLoaded()) redirect("/admin/category-hierarchy");
  const types = await listProductTypes({ includeUnreviewed: true });
  const counts = new Map((await prisma.serviceProduct.groupBy({ by: ["product_type_id"], _count: { _all: true } })).map((g) => [g.product_type_id, g._count._all]));
  return (
    <div className="mx-auto w-full max-w-4xl">
      <BackLink href="/admin/category-hierarchy" label="Category Hierarchy" />
      <h1 className="mb-1 mt-2 text-[28px] font-bold">Service Product Types</h1>
      <p className="mb-5 text-[14px] text-ink-2">The Shop&apos;s Service Type filter: Build and Run groups, plus types members suggest. Approve a suggestion, or merge it into an existing type (its products move with it).</p>
      <ServiceTypeReview endpoint="/api/admin/service-product-types" countLabel="Products" rows={types.map((t) => ({ id: t.id, name: t.group_label ? `${t.name} · ${t.group_label}` : t.name, baseline: t.is_baseline, reviewed: !!t.reviewed_at, services: counts.get(t.id) ?? 0 }))} />
    </div>
  );
}
