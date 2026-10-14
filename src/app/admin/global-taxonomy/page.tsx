import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { taxonomyV2 } from "@/lib/platform-settings";
import { GlobalTaxonomyAdmin } from "@/components/admin/GlobalTaxonomyAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Global Taxonomy · Admin · Panameer" };

// GT-E005: Knowledge (Process › Domain › Skill) · Systems (Vendor › Product › Module/Tool → Domain) · Way of Working (Mode › Role).
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; unlinked?: string }> }) {
  await guardPage("canAdminister");
  const { tab: raw, unlinked } = await searchParams;
  const tab = raw === "systems" || raw === "work" ? raw : "knowledge";
  const [on, domains, items, roles] = await Promise.all([
    taxonomyV2(),
    prisma.domain.findMany({ orderBy: [{ process: "asc" }, { sort_order: "asc" }, { name: "asc" }], select: { id: true, process: true, name: true, origin: true, knowledgeSkills: { orderBy: { name: "asc" }, select: { id: true, name: true, hidden: true } } } }),
    tab === "systems" ? prisma.systemItem.findMany({ where: unlinked ? { domain_id: null } : {}, orderBy: [{ product: { vendor: { sort_order: "asc" } } }, { product: { sort_order: "asc" } }, { name: "asc" }], select: { id: true, name: true, kind: true, hidden: true, domain_id: true, product: { select: { name: true, vendor: { select: { name: true } } } } } }) : [],
    prisma.workRole.findMany({ orderBy: [{ mode: "asc" }, { sort_order: "asc" }], select: { id: true, mode: true, name: true, hidden: true } }),
  ]);
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-[28px] font-bold">Global Taxonomy</h1>
      <p className="mb-4 mt-1 max-w-[75ch] text-[14px] text-ink-2">
        Knowledge · Systems · Way of Working. Sellers see these only while Settings › Global Taxonomy is on (now <b>{on ? "on" : "off"}</b>). Existing capability domains are read-only here; only rows the Global Taxonomy added can be renamed.
      </p>
      <GlobalTaxonomyAdmin
        tab={tab}
        unlinkedOnly={!!unlinked}
        domains={domains.map((d) => ({ id: d.id, process: d.process, name: d.name, gt: !!d.origin, skills: d.knowledgeSkills }))}
        items={items.map((i) => ({ id: i.id, name: i.name, kind: i.kind, hidden: i.hidden, domainId: i.domain_id, product: i.product.name, vendor: i.product.vendor.name }))}
        roles={roles}
      />
    </div>
  );
}
