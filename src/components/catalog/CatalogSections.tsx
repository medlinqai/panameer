import Link from "next/link";
import type { Viewer } from "@/lib/access";
import { buildCatalogData, ensureDefaultRates } from "@/lib/build-catalog";
import { RatesTable, type RateType } from "@/components/catalog/RatesTable";
import { AddRateButton } from "@/components/catalog/AddRateButton";
import { ResumeSuggestions } from "@/components/catalog/ResumeSuggestions";
import { openSuggestions, pendingImport } from "@/lib/catalog-suggestions";
import { ownedProviderProfile } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { companyIdForProfile, companyProviderCount } from "@/lib/company-catalog";

import { catalogProductsPage } from "@/lib/catalog-products";
import { ProductsTab } from "@/components/catalog/ProductsTab";

/** WK-E003: Catalog › Services is a section of the one Catalog page. */
export async function ServicesSection({ viewer }: { viewer: Viewer }) {
  await ensureDefaultRates(viewer).catch(() => null);
  const d = await buildCatalogData(viewer);
  const me = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person_id: true, onsite_rate_cents: true, remote_rate_cents: true, hourly_rate_cents: true } });
  const companyId = me ? await companyIdForProfile(me.id) : null;
  const multiProvider = companyId ? (await companyProviderCount(companyId)) > 1 : false;
  const overrides = new Map(multiProvider && me ? (await prisma.providerRateOverride.findMany({ where: { person_id: me.person_id }, select: { service_id: true, rate_cents: true } })).map((o) => [o.service_id, o.rate_cents]) : []);
  const [sugs, pending] = me && d.categories.length ? await Promise.all([openSuggestions(me.id), pendingImport(me.id)]) : [[], null];
  const typeName = new Map(d.categories.flatMap((c) => c.serviceTypes.map((t) => [t.id, t.name] as const)));
  const types: RateType[] = d.categories.filter((c) => c.kind === "SERVICE").flatMap((c) => c.serviceTypes.map((t) => ({ id: t.id, name: t.name, description: t.description, units: t.units, delivery: t.delivery, custom: t.status === "SUGGESTED" })));
  const rateIds = new Set(types.map((t) => t.id));
  const haveIds = new Set(d.services.map((x) => x.service_type_id));
  const bt = d.businessTypes.map((b) => b.name).join(" · ");
  return (
    <section id="services" className="mt-10 scroll-mt-24 border-t border-ink pt-5" data-catalog-services>
      <h2 className="text-[22px] font-bold">Services</h2>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[14px] text-ink-2">Your rates. Turn on the ones you offer. Changes save as you go.</p>
        {d.businessTypes.length > 0 && <AddRateButton />}
      </div>
      {!d.businessTypes.length ? (
        <p className="mt-6 border-l-2 border-magenta py-1 pl-3 text-[14.5px]">
          Pick your company&apos;s business type first. <Link href="/company#business-types" className="font-bold text-magenta-dark underline underline-offset-4">Choose a Business Type</Link>
        </p>
      ) : (
        <>
          <p className="mt-3 inline-flex flex-wrap items-center gap-2 border border-line px-3 py-1.5 text-[12.5px] text-ink-2">
            Business Type: <b className="text-ink">{bt}</b>
            <Link href="/company#business-types" className="font-bold text-magenta-dark underline underline-offset-4">Change</Link>
          </p>

          {types.length ? (
            <RatesTable
              key={`${d.services.map((s) => s.service_type_id).join()}`}
              types={types}
              rows={d.services.map((s) => ({ id: s.id, serviceTypeId: s.service_type_id!, rateCents: s.rate_cents, unit: s.uom, published: !!s.published_at, expenses: s.expenses, hoursIncluded: s.hours_included, offersOverride: s.offers_override, overrideCents: overrides.get(s.id) ?? null }))}
              registration={{ ONSITE: me?.onsite_rate_cents ?? null, OFFSITE: me?.remote_rate_cents ?? me?.hourly_rate_cents ?? null }}
              gate={d.gate}
              multiProvider={multiProvider}
              openToOffers={!!(await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { open_to_offers: true } }))?.open_to_offers}
            />
          ) : (
            <p className="mt-6 text-[14px] text-ink-2">The rate types for {bt} aren&apos;t loaded yet.</p>
          )}
          {/* Résumé drafts for rates you don't have yet — below the table (mockup C). Product drafts live on Service Products. */}
          <ResumeSuggestions
            pending={!!pending}
            items={sugs.filter((x) => x.kind === "SERVICE" && rateIds.has(x.service_type_id) && !haveIds.has(x.service_type_id)).map((s) => ({ id: s.id, kind: s.kind, typeName: typeName.get(s.service_type_id) ?? "Service", why: s.why, rateCents: s.rate_cents, unit: s.unit, title: s.title }))}
          />
        </>
      )}
    </section>
  );
}

/** WK-E003: Catalog › Service Products is a section of the one Catalog page. */
export async function ProductsSection({ viewer, edit, type }: { viewer: Viewer; edit?: string; type?: string }) {
  const d = await catalogProductsPage(viewer);
  return (
    <section id="products" className="mt-10 scroll-mt-24 border-t border-ink pt-5" data-catalog-products>
      <h2 className="text-[22px] font-bold">Service Products</h2>
      <ProductsTab key={`${edit ?? ""}|${d.products.map((p) => `${p.id}:${p.status}`).join()}`} types={d.types} products={d.products} domains={d.domains} skills={d.skills} sellGaps={d.sellGaps} editId={edit ?? null} typeId={type ?? null} />
    </section>
  );
}
