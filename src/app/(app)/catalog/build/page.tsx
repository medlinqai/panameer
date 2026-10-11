import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { buildCatalogData } from "@/lib/build-catalog";
import { BuildCatalog } from "@/components/catalog/BuildCatalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Build Your Catalog · Panameer" };

// TX-E004: road stop 4 — the provider's Service Catalog, priced.
export default async function Page() {
  const viewer = await guardPage("canProvideServices");
  const d = await buildCatalogData(viewer);
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl" data-build-your-catalog>
      <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">YOUR PATH · STEP 4 OF 8 · BUILD YOUR CATALOG</p>
      <h1 className="mt-1 text-[30px] font-bold">Build Your Catalog</h1>
      <p className="mt-1 max-w-[70ch] text-[14.5px] text-ink-2">Turn on what you offer and set your rate. Each one becomes a Service buyers can hire you for. Add Service Products for fixed-price offers. Everything saves as you go.</p>
      {!d.businessTypes.length ? (
        <p className="mt-6 border-l-2 border-magenta py-1 pl-3 text-[14.5px]">
          Pick your company&apos;s business type first. <Link href="/company#business-types" className="font-bold text-magenta-dark underline underline-offset-4">Choose a Business Type</Link>
        </p>
      ) : !d.categories.length ? (
        <p className="mt-6 border-l-2 border-magenta py-1 pl-3 text-[14.5px]">The Service Catalog for {d.businessTypes.map((b) => b.name).join(" and ")} isn&apos;t loaded yet. Meanwhile, <Link href="/catalog/services/new" className="font-bold underline">create a service</Link> or <Link href="/catalog/products/new" className="font-bold underline">a service product</Link>.</p>
      ) : (
        <BuildCatalog
          businessTypes={d.businessTypes}
          categories={d.categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind, types: c.serviceTypes }))}
          services={d.services.map((s) => ({ serviceTypeId: s.service_type_id!, rateCents: s.rate_cents, unit: s.uom, published: !!s.published_at }))}
          products={d.products.map((p) => ({ serviceTypeId: p.service_type_id!, title: p.title }))}
          gate={d.gate}
        />
      )}
    </div>
  );
}
