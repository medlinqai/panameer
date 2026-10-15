import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { prisma } from "@/lib/prisma";
import { taxonomyV2 } from "@/lib/platform-settings";
import { listServiceProviders, servicesFilterOptions, type ServicesQuery } from "@/lib/shop-services";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { FilterBar, type FilterDef } from "@/components/casing/FilterBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Services · Shop · Panameer" };

// GT-E005: Shop › Services — find providers by how they work, what they know and the system (behind taxonomy_v2).
export default async function Page({ searchParams }: { searchParams: Promise<ServicesQuery> }) {
  if (!(await taxonomyV2())) notFound();
  const viewer = await memberOrPublicTwin("/shop");
  const sp = await searchParams;
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  const [rows, o] = await Promise.all([listServiceProviders(sp, { includeTestPersonId: me?.id ?? null }), servicesFilterOptions()]);
  const filters: FilterDef[] = [
    { key: "mode", label: "How They Work", options: [{ value: "IMPLEMENT", label: "Implement" }, { value: "SUPPORT", label: "Support" }, { value: "OPERATE", label: "Do the Work" }] },
    { key: "process", label: "Process", options: o.processes.map((p) => ({ value: p, label: p })) },
    { key: "domain", label: "Capability Domain", options: o.domains.filter((d) => !sp.process || d.process === sp.process).map((d) => ({ value: d.id, label: d.name, group: d.process })) },
    { key: "industry", label: "Industry", options: (await prisma.specialization.findMany({ where: { kind: "INDUSTRY", status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } })).map((i) => ({ value: i.id, label: i.name })) },
    { key: "vendor", label: "Vendor", options: o.vendors.map((v) => ({ value: v.id, label: v.name })) },
    { key: "product", label: "Product", options: o.products.filter((p) => !sp.vendor || p.vendor.id === sp.vendor).map((p) => ({ value: p.id, label: `${p.vendor.name} ${p.name}` })) },
  ];
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl" data-shop-services>
      <ShopTabs services />
      <h1 className="mb-3 mt-2 text-[24px] font-bold">Services</h1>
      <Suspense>
        <FilterBar placeholder="Search providers…" filters={filters} />
      </Suspense>
      {rows.length === 0 ? (
        <p className="border-t border-line py-5 text-[14px] text-ink-2">No provider matches these filters yet.</p>
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2">
          {rows.map((r) => (
            <li key={r.profileId} data-service-provider={r.name} className="border border-line p-4">
              <Link href={`/providers/${r.profileId}`} className="text-[15px] font-bold hover:underline">{r.name}</Link>
              {r.title && <span className="block text-[13px] text-ink-2">{r.title}</span>}
              {r.capabilities.length > 0 && <ul className="mt-2 text-[13px]">{r.capabilities.map((c) => <li key={c}>{c}</li>)}</ul>}
              <ul className="mt-2 border-t border-[#ECEEF4] pt-2 text-[13px] text-ink-2">{r.rates.map((x) => <li key={x}>{x}</li>)}</ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
