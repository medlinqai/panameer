// TX-E002: the Service Taxonomy seed — Commodity Group › Business Type › Service Category › Service Type — plus the folds
// Scott approved (naming audit "Scott decisions"): service_product_types → service_types (kind), skills → areas,
// pillars/offerings → areas, existing provider companies → ERP Related. Only approved UNSPSC codes load.
// Dry run by default: prints the plan and writes scripts/out/service_taxonomy_dryrun.csv. Scott runs it with --apply.
// Run: npx tsx --env-file=.env.local scripts/seed-service-taxonomy.ts [--apply]
import { mkdirSync, writeFileSync } from "node:fs";
import type { PricingModel, ServiceDelivery, ServiceKind, ServiceUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { REAL_COMPANY } from "@/lib/business-types";

const APPLY = process.argv.includes("--apply");

const GROUPS = [
  { name: "Professional & Technology Services", unspsc_segments: ["80", "81", "84"], sort_order: 1, hidden: false },
  { name: "Facilities & Trades", unspsc_segments: ["72", "76"], sort_order: 2, hidden: false },
  { name: "Marketing, Creative & Media", unspsc_segments: ["82"], sort_order: 3, hidden: false },
  { name: "Education & Training", unspsc_segments: ["86"], sort_order: 4, hidden: false },
  { name: "Logistics & Transportation", unspsc_segments: ["78"], sort_order: 5, hidden: false },
  { name: "Healthcare", unspsc_segments: ["85"], sort_order: 90, hidden: true },
  { name: "Personal & Domestic", unspsc_segments: ["91"], sort_order: 91, hidden: true },
];

type T = { name: string; units: ServiceUnit[]; pricing: PricingModel; delivery?: ServiceDelivery; required?: boolean; code?: string; was?: string[]; description?: string };
type C = { name: string; kind: ServiceKind; types: T[] };
// Commodity codes: only the ones Scott approved (naming audit › UNSPSC, decision 10). Build/Run proposals stay blank.
const ERP: C[] = [
  // MC-E004 (2026-10-12): Services are four rate types; Go-Live, Staff Aug, AMS and Training are retired (scripts/my-catalog-rates.ts).
  { name: "Rates", kind: "SERVICE", types: [
    { name: "Onsite Hourly", units: ["HOUR"], pricing: "TIME", delivery: "ONSITE", code: "80101500", was: ["Onsite Consulting"], description: "At the buyer's site" },
    { name: "Offsite Hourly", units: ["HOUR"], pricing: "TIME", delivery: "OFFSITE", code: "80101500", was: ["Remote Consulting", "Offsite Consulting"], description: "From your location" },
    { name: "Monthly Retainer", units: ["MONTH"], pricing: "RECURRING", delivery: "EITHER", code: "81112200", description: "A set price each month for a block of hours" },
    { name: "Mentoring", units: ["HOUR"], pricing: "TIME", delivery: "OFFSITE", code: "86132000", description: "One-to-one guidance, usually a lower rate" },
  ] },
  { name: "Build", kind: "SERVICE_PRODUCT", types: [
    { name: "Reports", units: ["EACH"], pricing: "FIXED" },
    { name: "Dashboards & Analytics", units: ["EACH"], pricing: "FIXED" },
    { name: "Integrations & Interfaces", units: ["EACH"], pricing: "FIXED" },
    { name: "Conversions (Data Loads)", units: ["EACH"], pricing: "FIXED", code: "81112000" },
    { name: "Extensions & Workflows", units: ["EACH"], pricing: "FIXED" },
  ] },
  { name: "Run", kind: "SERVICE_PRODUCT", types: [
    { name: "AI Agents", units: ["MONTH"], pricing: "RECURRING" },
    { name: "App Extensions", units: ["MONTH"], pricing: "RECURRING", description: "A ready-made app that extends a procurement application" },
    { name: "Health Checks & Assessments", units: ["EACH"], pricing: "FIXED" },
    { name: "Configuration & Setup", units: ["EACH"], pricing: "FIXED", code: "81111500" },
  ] },
];
const SAAS: C[] = [
  { name: "Subscriptions", kind: "SERVICE_PRODUCT", types: [
    { name: "App Subscription", units: ["MONTH"], pricing: "RECURRING" },
    { name: "Add-On Module", units: ["MONTH"], pricing: "RECURRING" },
    { name: "AI Agent", units: ["MONTH"], pricing: "RECURRING" },
    { name: "App Extension", units: ["MONTH"], pricing: "RECURRING", description: "A ready-made app that extends a business application" },
  ] },
];
// Decision 4: pillars fold into areas where the match is clear; the rest are listed for Scott.
const PILLAR_AREA: Record<string, string> = {
  PROCURE_TO_PAY: "PRC", ORDER_TO_CASH: "O2C", RECORD_TO_REPORT: "FIN", HIRE_TO_RETIRE: "HCM", PLAN_TO_PRODUCE: "SCM",
  CUSTOMER_EXPERIENCE_CX: "CX", PROJECT_PORTFOLIO_MGMT_PPM: "PPM", DATA_SUPPORT_SERVICES: "ANALYTICS", CORE_TECHNICAL_DEVELOPMENT: "TECH",
};

type Row = { step: string; action: string; target: string; detail: string };
const plan: Row[] = [];
const note = (step: string, action: string, target: string, detail = "") => plan.push({ step, action, target, detail });

async function main() {
  // ---- read everything first (the plan is the same with or without --apply) ----
  const [groups, bts, cats, types, ptypes, areas, pillars, offerings, skills, products] = await Promise.all([
    prisma.commodityGroup.findMany(), prisma.businessType.findMany({ include: { _count: { select: { skills: true } } } }), prisma.serviceCategory.findMany(),
    prisma.serviceType.findMany(), prisma.serviceProductType.findMany(), prisma.area.findMany(), prisma.pillar.findMany(), prisma.offering.findMany(),
    prisma.skill.findMany({ where: { area: { not: null }, area_id: null }, select: { id: true, area: true } }),
    prisma.serviceProduct.findMany({ where: { product_type_id: { not: null }, service_type_id: null }, select: { id: true, product_type_id: true } }),
  ]);
  for (const g of GROUPS) note("1 groups", groups.some((x) => x.name === g.name) ? "update" : "create", g.name, `segments ${g.unspsc_segments.join(",")}${g.hidden ? " · parked (hidden)" : ""}`);
  const erp = [...bts].sort((a, b) => b._count.skills - a._count.skills)[0];
  note("2 business types", "rename + link", `${erp?.code} "${erp?.name}" → "ERP Related"`, `holds ${erp?._count.skills ?? 0} skills (the active one)`);
  for (const b of bts.filter((b) => b.id !== erp?.id)) note("2 business types", "leave", `${b.code} "${b.name}"`, `${b._count.skills} skills — not touched; Scott to decide`);
  const saas = bts.find((b) => b.code === "SOFTWARE_SAAS");
  note("2 business types", saas ? "update" : "create", "Software & SaaS", "SOFTWARE_SAAS · uses_skills false");
  const byName = new Map(types.map((t) => [t.name, t]));
  const seen = new Set<string>();
  for (const [bt, list] of [["ERP Related", ERP], ["Software & SaaS", SAAS]] as const)
    for (const c of list) {
      note("3 categories", cats.some((x) => x.name === c.name) ? "update" : "create", `${bt} › ${c.name}`, c.kind);
      for (const t of c.types) {
        const was = (t.was ?? []).map((n) => byName.get(n)).find(Boolean);
        const hit = byName.get(t.name) ?? was;
        seen.add(t.name); (t.was ?? []).forEach((n) => seen.add(n));
        const pt = c.kind === "SERVICE_PRODUCT" ? ptypes.find((p) => p.name === t.name) : undefined;
        note("4 types", hit ? (hit.name !== t.name ? `rename ${hit.name} →` : "update") : "create", `${bt} › ${c.name} › ${t.name}`, `${t.pricing} · ${t.units.join("/")}${t.delivery ? ` · ${t.delivery}` : ""}${t.required ? " · required" : ""}${t.code ? ` · UNSPSC ${t.code}` : " · code blank (not approved)"}${pt ? " · folds service_product_types row" : ""}`);
      }
    }
  for (const t of types.filter((t) => !seen.has(t.name) && !t.merged_into_id)) note("4 types", "leave (no category)", t.name, t.is_baseline ? "baseline type not in the stock list — Scott to place or merge" : "provider-added — status SUGGESTED");
  for (const p of ptypes.filter((p) => !seen.has(p.name) && !p.merged_into_id)) note("5 product-type fold", "copy as SUGGESTED", p.name, "member suggestion — no category until approved");
  const ptByOld = new Map(ptypes.map((p) => [p.id, p.name]));
  for (const pr of products) note("5 product-type fold", "link", `service_product ${pr.id}`, `→ service type "${ptByOld.get(pr.product_type_id!)}"`);
  const areaByCode = new Map(areas.map((a) => [a.code, a]));
  const skillMiss = skills.filter((s) => !areaByCode.has(s.area!));
  note("6 skills → areas", "set area_id", `${skills.length - skillMiss.length} skills`, skillMiss.length ? `${skillMiss.length} have an area code with no Area row: ${[...new Set(skillMiss.map((s) => s.area))].join(", ")}` : "");
  for (const p of pillars) {
    const code = PILLAR_AREA[p.code];
    note("7 pillars → areas", code && areaByCode.has(code) ? "map" : "needs Scott", `${p.code} "${p.name}"`, code ? `→ ${code}` : "no clear area");
  }
  for (const o of offerings) {
    const a = areas.find((x) => x.label.toLowerCase().startsWith(o.name.toLowerCase()));
    note("7 offerings → areas", a ? "map" : "needs Scott", o.name, a ? `→ ${a.code}` : "no clear area");
  }
  const providerCos = await prisma.company.findMany({ where: { AND: [{ archived_at: null, memberships: { some: { status: "APPROVED", person: { is_service_provider: true } } }, businessTypes: { none: {} } }, REAL_COMPANY] }, select: { id: true, name: true } });
  note("8 provider business types", "link ERP Related", `${providerCos.length} provider companies with none yet`, providerCos.slice(0, 8).map((c) => c.name).join(", "));

  mkdirSync("scripts/out", { recursive: true });
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  writeFileSync("scripts/out/service_taxonomy_dryrun.csv", ["step,action,target,detail", ...plan.map((r) => [r.step, r.action, r.target, r.detail].map(esc).join(","))].join("\n") + "\n");
  const tally: Record<string, number> = {};
  for (const r of plan) tally[`${r.step} · ${r.action}`] = (tally[`${r.step} · ${r.action}`] ?? 0) + 1;
  console.log(JSON.stringify({ applied: APPLY, rows: plan.length, ...tally, csv: "scripts/out/service_taxonomy_dryrun.csv" }, null, 1));
  if (!APPLY) return;

  // ---- apply: one transaction, upserts only, nothing deleted ----
  await prisma.$transaction(async (tx) => {
    const g: Record<string, string> = {};
    for (const x of GROUPS) g[x.name] = (await tx.commodityGroup.upsert({ where: { name: x.name }, create: x, update: x, select: { id: true } })).id;
    const prof = g["Professional & Technology Services"];
    await tx.businessType.update({ where: { id: erp.id }, data: { name: "ERP Related", commodity_group_id: prof, uses_skills: true, sort_order: 1, hidden: false } });
    const saasId = (await tx.businessType.upsert({ where: { code: "SOFTWARE_SAAS" }, create: { code: "SOFTWARE_SAAS", name: "Software & SaaS", commodity_group_id: prof, uses_skills: false, sort_order: 2 }, update: { name: "Software & SaaS", commodity_group_id: prof, uses_skills: false } })).id;
    const typeIds = new Map<string, string>();
    for (const [btId, list] of [[erp.id, ERP], [saasId, SAAS]] as const) {
      for (const [ci, c] of list.entries()) {
        const cat = await tx.serviceCategory.upsert({ where: { business_type_id_name: { business_type_id: btId, name: c.name } }, create: { business_type_id: btId, name: c.name, kind: c.kind, sort_order: ci + 1 }, update: { kind: c.kind, sort_order: ci + 1 } });
        for (const [ti, t] of c.types.entries()) {
          const data = { name: t.name, service_category_id: cat.id, kind: c.kind, pricing_model: t.pricing, units: t.units, delivery: t.delivery ?? null, required: !!t.required, commodity_code: t.code ?? null, status: "STOCK" as const, is_baseline: true, reviewed_at: new Date(), sort_order: ti + 1, description: t.description ?? null };
          const existing = await tx.serviceType.findFirst({ where: { name: { in: [t.name, ...(t.was ?? [])] }, merged_into_id: null }, orderBy: { created_at: "asc" } });
          const row = existing ? await tx.serviceType.update({ where: { id: existing.id }, data }) : await tx.serviceType.create({ data });
          typeIds.set(t.name, row.id);
        }
      }
    }
    // Fold service_product_types into service_types (same names map to the stock row; others become SUGGESTED).
    for (const p of ptypes) {
      let id = typeIds.get(p.name);
      if (!id) {
        const hit = await tx.serviceType.findFirst({ where: { name: p.name } });
        id = hit?.id ?? (await tx.serviceType.create({ data: { name: p.name, kind: "SERVICE_PRODUCT", status: p.reviewed_at ? "APPROVED" : "SUGGESTED", created_by_person_id: p.created_by_person_id, reviewed_at: p.reviewed_at } })).id;
      }
      await tx.serviceProduct.updateMany({ where: { product_type_id: p.id, service_type_id: null }, data: { service_type_id: id } });
    }
    await tx.serviceType.updateMany({ where: { is_baseline: false, status: "STOCK", merged_into_id: null }, data: { status: "SUGGESTED" } });
    await tx.serviceType.updateMany({ where: { is_baseline: false, reviewed_at: { not: null }, merged_into_id: null, status: "SUGGESTED" }, data: { status: "APPROVED" } });
    await tx.serviceType.updateMany({ where: { merged_into_id: { not: null } }, data: { status: "MERGED" } });
    for (const a of areas) await tx.skill.updateMany({ where: { area: a.code, area_id: null }, data: { area_id: a.id } });
    for (const p of pillars) { const a = areaByCode.get(PILLAR_AREA[p.code] ?? ""); if (a) await tx.pillar.update({ where: { id: p.id }, data: { area_id: a.id } }); }
    for (const o of offerings) { const a = areas.find((x) => x.label.toLowerCase().startsWith(o.name.toLowerCase())); if (a) await tx.offering.update({ where: { id: o.id }, data: { area_id: a.id } }); }
    for (const c of providerCos) await tx.companyBusinessType.upsert({ where: { company_id_business_type_id: { company_id: c.id, business_type_id: erp.id } }, create: { company_id: c.id, business_type_id: erp.id }, update: {} });
  }, { timeout: 120_000 });
  console.log("applied");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
