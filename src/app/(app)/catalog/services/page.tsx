import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { buildCatalogData } from "@/lib/build-catalog";
import { CatalogTabs } from "@/components/catalog/CatalogTabs";
import { BuildCatalog } from "@/components/catalog/BuildCatalog";
import { ResumeSuggestions } from "@/components/catalog/ResumeSuggestions";
import { openSuggestions, pendingImport } from "@/lib/catalog-suggestions";
import { ownedProviderProfile } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { companyIdForProfile, companyProviderCount } from "@/lib/company-catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Services · My Catalog · Panameer" };

// TX-E004: road stop 4 — the provider's Service Catalog, priced.
export default async function Page() {
  const viewer = await guardPage("canProvideServices");
  const d = await buildCatalogData(viewer);
  const me = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person_id: true } });
  const companyId = me ? await companyIdForProfile(me.id) : null;
  const multiProvider = companyId ? (await companyProviderCount(companyId)) > 1 : false;
  const overrides = new Map(multiProvider && me ? (await prisma.providerRateOverride.findMany({ where: { person_id: me.person_id }, select: { service_id: true, rate_cents: true } })).map((o) => [o.service_id, o.rate_cents]) : []);
  const [sugs, pending] = me && d.categories.length ? await Promise.all([openSuggestions(me.id), pendingImport(me.id)]) : [[], null];
  const typeName = new Map(d.categories.flatMap((c) => c.serviceTypes.map((t) => [t.id, t.name] as const)));
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl" data-build-your-catalog>
      <CatalogTabs current="services" />
      <h1 className="mt-1 text-[28px] font-bold">Services</h1>
      <p className="mt-1 max-w-[70ch] text-[14.5px] text-ink-2">Turn on what you offer and set your rate. Each one becomes a Service buyers can hire you for. Add Service Products for fixed-price offers. Everything saves as you go.</p>
      {!d.businessTypes.length ? (
        <p className="mt-6 border-l-2 border-magenta py-1 pl-3 text-[14.5px]">
          Pick your company&apos;s business type first. <Link href="/company#business-types" className="font-bold text-magenta-dark underline underline-offset-4">Choose a Business Type</Link>
        </p>
      ) : !d.categories.length ? (
        <p className="mt-6 border-l-2 border-magenta py-1 pl-3 text-[14.5px]">The Service Catalog for {d.businessTypes.map((b) => b.name).join(" and ")} isn&apos;t loaded yet. Meanwhile, <Link href="/catalog/services/new" className="font-bold underline">create a service</Link> or <Link href="/catalog/products/new" className="font-bold underline">a service product</Link>.</p>
      ) : (
        <>
        <ResumeSuggestions
          pending={!!pending}
          items={sugs.map((s) => ({ id: s.id, kind: s.kind, typeName: typeName.get(s.service_type_id) ?? "Service", why: s.why, rateCents: s.rate_cents, unit: s.unit, title: s.title }))}
        />
        <BuildCatalog
          key={`${d.services.map((s) => s.service_type_id).join()}|${d.products.length}`}
          businessTypes={d.businessTypes}
          categories={d.categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind, types: c.serviceTypes }))}
          services={d.services.map((s) => ({ id: s.id, serviceTypeId: s.service_type_id!, rateCents: s.rate_cents, unit: s.uom, published: !!s.published_at, overrideCents: overrides.get(s.id) ?? null }))}
          products={d.products.map((p) => ({ serviceTypeId: p.service_type_id!, title: p.title }))}
          gate={d.gate}
          multiProvider={multiProvider}
        />
        </>
      )}
    </div>
  );
}
