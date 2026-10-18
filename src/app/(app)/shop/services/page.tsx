import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { prisma } from "@/lib/prisma";
import { taxonomyV2 } from "@/lib/platform-settings";
import { seesTestAccounts } from "@/lib/admin/test-accounts";
import { attributeFilterOptions, listServiceProviders, servicesFilterOptions, type ServicesQuery } from "@/lib/shop-services";
import { HelpTip } from "@/components/ui/HelpTip";
import { fieldHelp } from "@/lib/field-guide";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { FilterBar, type FilterDef } from "@/components/casing/FilterBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Services · Shop · Panameer" };

// GT-E005: Shop › Services — find providers by how they work, what they know and the system (behind taxonomy_v2).
export default async function Page({ searchParams }: { searchParams: Promise<ServicesQuery> }) {
  if (!(await taxonomyV2())) notFound();
  const viewer = await memberOrPublicTwin("/shop");
  const sp = await searchParams;
  const [rows, o, attrs] = await Promise.all([listServiceProviders(sp, { seesTest: await seesTestAccounts(viewer) }), servicesFilterOptions(), attributeFilterOptions()]);
  const filters: FilterDef[] = [
    { key: "mode", label: "How They Work", options: [{ value: "IMPLEMENT", label: "Implement" }, { value: "SUPPORT", label: "Support" }, { value: "OPERATE", label: "Do the Work" }] },
    { key: "process", label: "Process", options: o.processes.map((p) => ({ value: p, label: p })) },
    { key: "domain", label: "Capability Domain", options: o.domains.filter((d) => !sp.process || d.process === sp.process).map((d) => ({ value: d.id, label: d.name, group: d.process })) },
    { key: "industry", label: "Industry", options: (await prisma.specialization.findMany({ where: { kind: "INDUSTRY", status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } })).map((i) => ({ value: i.id, label: i.name })) },
    ...attrs.map((a) => ({ key: `a_${a.id}`, label: a.label, options: a.values.map((v) => ({ value: v, label: v })) })),
    { key: "vendor", label: "Vendor", options: o.vendors.map((v) => ({ value: v.id, label: v.name })) },
    { key: "product", label: "Product", options: o.products.filter((p) => !sp.vendor || p.vendor.id === sp.vendor).map((p) => ({ value: p.id, label: `${p.vendor.name} ${p.name}` })) },
  ];
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl" data-shop-services>
      <ShopTabs services />
      <h1 className="mb-1 mt-2 text-[24px] font-bold">Services</h1>
      <p className="mb-3 flex flex-wrap items-center gap-x-4 text-[13px] text-ink-2" data-buyer-help>
        <span className="inline-flex items-center">How they work · what they know<HelpTip label="What I Do" text={fieldHelp("What I Do", "buyer")} /></span>
        <span className="inline-flex items-center">Industry<HelpTip label="Industry" text={fieldHelp("Industry", "buyer")} /></span>
        <span className="inline-flex items-center">Trade filters<HelpTip label="Attributes" text={fieldHelp("Attributes", "buyer")} /></span>
      </p>
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
