import Link from "next/link";
import { taxonomyTree } from "@/lib/service-taxonomy-admin";
import { ServiceTaxonomyAdmin } from "@/components/admin/ServiceTaxonomyAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Category Hierarchy · Admin · Panameer" };

// CH-E001: Admin › Category Hierarchy (Panameer's PCCH; was Service Taxonomy).
export default async function Page() {
  const { groups, suggested, used, homeless } = await taxonomyTree();
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-[28px] font-bold">Category Hierarchy</h1>
      <p className="mb-5 mt-1 text-[14px] text-ink-2">
        Category (the Shop tile) › Business Type › Service Type (rates) and Service Product Type — the leaves sellers pick. Delete works only when nothing uses the item; otherwise use Hide. Areas and Skills: <Link href="/admin/skill-catalog" className="font-semibold underline">Areas &amp; Skills</Link>.
      </p>
      {homeless.length > 0 && (
        <section data-homeless-pillars className="mb-6 border border-line bg-white p-4">
          <h2 className="text-[17px] font-bold">Pillars Needing a Home ({homeless.length})</h2>
          <ul className="mt-2 text-[13.5px]">
            {homeless.map((p) => (
              <li key={p.id} className="border-t border-line py-1.5"><b>{p.name}</b> · {p._count.skills} skills{p.admin_note && <span className="block text-[12.5px] text-ink-2">{p.admin_note}</span>}</li>
            ))}
          </ul>
        </section>
      )}
      {groups.length === 0 ? (
        <p className="border-l-2 border-magenta py-1 pl-3 text-[14px]">Not loaded yet. Run <code>npx tsx --env-file=.env.local scripts/seed-service-taxonomy.ts</code> (dry run), then with <code>--apply</code>.</p>
      ) : (
        <ServiceTaxonomyAdmin
          suggested={suggested.map((s) => ({ id: s.id, name: s.name, kind: s.kind }))}
          groups={groups.map((g) => ({
            id: g.id, name: g.name, segments: g.unspsc_segments, hidden: g.hidden, description: g.description,
            rates: g.serviceCategories.filter((c) => c.kind === "SERVICE").flatMap((c) => c.serviceTypes.map((t) => ({ id: t.id, name: t.name, description: t.description, pricing_model: t.pricing_model, units: t.units, delivery: t.delivery, lead_time_days: t.lead_time_days, commodity_code: t.commodity_code, default_on: t.default_on, hidden: t.hidden, used: (used.get(t.id) ?? 0) + t._count.serviceProducts }))),
            businessTypes: g.businessTypes.map((b) => ({
              id: b.id, name: b.name, hidden: b.hidden, uses_skills: b.uses_skills, companies: b._count.companies, description: b.description,
              categories: b.serviceCategories.map((c) => ({
                id: c.id, name: c.name, kind: c.kind, hidden: c.hidden,
                types: c.serviceTypes.map((t) => ({ id: t.id, name: t.name, description: t.description, pricing_model: t.pricing_model, units: t.units, delivery: t.delivery, lead_time_days: t.lead_time_days, commodity_code: t.commodity_code, default_on: t.default_on, hidden: t.hidden, used: (used.get(t.id) ?? 0) + t._count.serviceProducts })),
              })),
            })),
          }))}
        />
      )}
    </div>
  );
}
