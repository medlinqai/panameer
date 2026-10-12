import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { buildCatalogData, ensureDefaultRates } from "@/lib/build-catalog";
import { CatalogTabs } from "@/components/catalog/CatalogTabs";
import { RatesTable, type RateType } from "@/components/catalog/RatesTable";
import { ResumeSuggestions } from "@/components/catalog/ResumeSuggestions";
import { openSuggestions, pendingImport } from "@/lib/catalog-suggestions";
import { ownedProviderProfile } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { companyIdForProfile, companyProviderCount } from "@/lib/company-catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Services · My Catalog · Panameer" };

// MC-E005: My Catalog › Services — your rates (mockup C). Road stop 4 lands here.
export default async function Page() {
  const viewer = await guardPage("canProvideServices");
  await ensureDefaultRates(viewer).catch(() => null);
  const d = await buildCatalogData(viewer);
  const me = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person_id: true, onsite_rate_cents: true, remote_rate_cents: true, hourly_rate_cents: true } });
  const companyId = me ? await companyIdForProfile(me.id) : null;
  const multiProvider = companyId ? (await companyProviderCount(companyId)) > 1 : false;
  const overrides = new Map(multiProvider && me ? (await prisma.providerRateOverride.findMany({ where: { person_id: me.person_id }, select: { service_id: true, rate_cents: true } })).map((o) => [o.service_id, o.rate_cents]) : []);
  const [sugs, pending] = me && d.categories.length ? await Promise.all([openSuggestions(me.id), pendingImport(me.id)]) : [[], null];
  const typeName = new Map(d.categories.flatMap((c) => c.serviceTypes.map((t) => [t.id, t.name] as const)));
  const types: RateType[] = d.categories.filter((c) => c.kind === "SERVICE").flatMap((c) => c.serviceTypes.map((t) => ({ id: t.id, name: t.name, description: t.description, units: t.units, delivery: t.delivery })));
  const bt = d.businessTypes.map((b) => b.name).join(" · ");
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl" data-catalog-services>
      <CatalogTabs current="services" />
      <h1 className="mt-1 text-[28px] font-bold">Services</h1>
      <p className="mt-1 max-w-[70ch] text-[14px] text-ink-2">Your rates. Turn on the ones you offer. Changes save as you go.</p>
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
          <ResumeSuggestions
            pending={!!pending}
            items={sugs.map((s) => ({ id: s.id, kind: s.kind, typeName: typeName.get(s.service_type_id) ?? "Service", why: s.why, rateCents: s.rate_cents, unit: s.unit, title: s.title }))}
          />
          {types.length ? (
            <RatesTable
              key={`${d.services.map((s) => s.service_type_id).join()}`}
              types={types}
              rows={d.services.map((s) => ({ id: s.id, serviceTypeId: s.service_type_id!, rateCents: s.rate_cents, unit: s.uom, published: !!s.published_at, expenses: s.expenses, hoursIncluded: s.hours_included, overrideCents: overrides.get(s.id) ?? null }))}
              registration={{ ONSITE: me?.onsite_rate_cents ?? null, OFFSITE: me?.remote_rate_cents ?? me?.hourly_rate_cents ?? null }}
              gate={d.gate}
              multiProvider={multiProvider}
            />
          ) : (
            <p className="mt-6 text-[14px] text-ink-2">The rate types for {bt} aren&apos;t loaded yet.</p>
          )}
        </>
      )}
    </div>
  );
}
