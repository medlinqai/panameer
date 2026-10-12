// MC-E004: Services become four rate types. ERP Consulting → ERP Related (code unchanged); one SERVICE category "Rates"
// (Onsite Hourly · Offsite Hourly · Monthly Retainer · Mentoring); retire Go-Live & Hypercare, Staff Augmentation,
// Managed Services (AMS), Training & Workshops (hidden, not deleted); hide emptied categories; cover pictures → image #1.
// Dry run by default: writes scripts/out/my_catalog_rates_dryrun.csv. Scott runs it with --apply.
// Run: npx tsx --env-file=.env.local scripts/my-catalog-rates.ts [--apply]
import { mkdirSync, writeFileSync } from "node:fs";
import type { ServiceDelivery, ServiceUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");
const RATES: { name: string; was: string[]; units: ServiceUnit[]; delivery: ServiceDelivery; code: string; defaultOn: boolean; description: string }[] = [
  { name: "Onsite Hourly", was: ["Onsite Consulting"], units: ["HOUR"], delivery: "ONSITE", code: "80101500", defaultOn: true, description: "At the buyer's site" },
  { name: "Offsite Hourly", was: ["Offsite Consulting", "Remote Consulting"], units: ["HOUR"], delivery: "OFFSITE", code: "80101500", defaultOn: true, description: "From your location" },
  { name: "Monthly Retainer", was: [], units: ["MONTH"], delivery: "EITHER", code: "81112200", defaultOn: false, description: "A set price each month for a block of hours" },
  { name: "Mentoring", was: [], units: ["HOUR"], delivery: "OFFSITE", code: "86132000", defaultOn: false, description: "One-to-one guidance, usually a lower rate" },
];
const RETIRE = ["Go-Live & Hypercare", "Staff Augmentation", "Managed Services (AMS)", "Training & Workshops"];

type Row = { step: string; action: string; target: string; detail: string };
const plan: Row[] = [];
const note = (step: string, action: string, target: string, detail = "") => plan.push({ step, action, target, detail });

async function main() {
  const bt = await prisma.businessType.findUnique({ where: { code: "PANAMEER_V1" }, include: { serviceCategories: { include: { serviceTypes: true } } } });
  if (!bt) throw new Error("PANAMEER_V1 not found — run the Service Taxonomy seed first");
  const types = bt.serviceCategories.flatMap((c) => c.serviceTypes);
  const byName = (n: string) => types.find((t) => t.name === n);
  const writes: (() => Promise<unknown>)[] = [];

  // 1 · business type name
  if (bt.name !== "ERP Related") { note("1 business type", "rename", bt.name, "→ ERP Related (code PANAMEER_V1 unchanged)"); writes.push(() => prisma.businessType.update({ where: { id: bt.id }, data: { name: "ERP Related" } })); }

  // 2 · one SERVICE category "Rates" (the old Consulting category is renamed into it)
  const rates = bt.serviceCategories.find((c) => c.name === "Rates" && c.kind === "SERVICE");
  const consulting = bt.serviceCategories.find((c) => c.name === "Consulting" && c.kind === "SERVICE");
  let ratesId: string | null = rates?.id ?? consulting?.id ?? null;
  if (!rates && consulting) { note("2 category", "rename", "Consulting", "→ Rates"); writes.push(() => prisma.serviceCategory.update({ where: { id: consulting.id }, data: { name: "Rates", sort_order: 1, hidden: false } })); }
  if (!rates && !consulting) {
    note("2 category", "create", "Rates", "SERVICE");
    writes.push(async () => { ratesId = (await prisma.serviceCategory.create({ data: { business_type_id: bt.id, name: "Rates", kind: "SERVICE", sort_order: 1 } })).id; });
  }

  // 3 · the four rate types (rename, move into Rates, set unit/delivery/code/default)
  const rateTypeIds: string[] = [];
  RATES.forEach((r, i) => {
    const t = byName(r.name) ?? r.was.map(byName).find(Boolean);
    const data = { name: r.name, units: r.units, delivery: r.delivery, commodity_code: r.code, default_on: r.defaultOn, pricing_model: r.units[0] === "MONTH" ? ("RECURRING" as const) : ("TIME" as const), sort_order: i + 1, hidden: false, description: r.description, required: false };
    if (t) {
      rateTypeIds.push(t.id);
      note("3 rate type", t.name === r.name ? "update" : "rename", t.name, `${t.name === r.name ? "" : `→ ${r.name} · `}${r.units.join("/")} · ${r.delivery} · ${r.code}${r.defaultOn ? " · on by default" : ""}`);
      writes.push(() => prisma.serviceType.update({ where: { id: t.id }, data: { ...data, service_category_id: ratesId } }));
    } else {
      note("3 rate type", "create", r.name, `${r.units.join("/")} · ${r.delivery} · ${r.code}`);
      writes.push(() => prisma.serviceType.create({ data: { ...data, kind: "SERVICE", status: "STOCK", is_baseline: true, service_category_id: ratesId } }));
    }
  });

  // 4 · provider services named like a rate type (old name or new) take that type and name — matched by their own name,
  //     because some rows were linked to the wrong stock type by the taxonomy fold.
  const rateTypeFor = (name: string) => { const i = RATES.findIndex((r) => r.name === name || r.was.includes(name)); return i >= 0 ? { name: RATES[i].name, id: rateTypeIds[i] as string | undefined } : null; };
  const linked = await prisma.providerService.findMany({ where: { service_type_id: { not: null } }, select: { id: true, name: true, service_type_id: true, active: true, published_at: true, provider_profile_id: true } });
  const moved = new Set<string>();
  for (const s of linked) {
    const to = rateTypeFor(s.name);
    if (!to) continue;
    moved.add(s.id);
    const relink = to.id && s.service_type_id !== to.id;
    if (s.name !== to.name || relink) {
      note("4 provider service", relink ? "rename + relink" : "rename", s.name, `→ ${to.name} (${s.id}${relink ? `; was linked to ${types.find((t) => t.id === s.service_type_id)?.name ?? "?"}` : ""})`);
      writes.push(() => prisma.providerService.update({ where: { id: s.id }, data: { name: to.name, ...(to.id ? { service_type_id: to.id } : {}) } }));
    }
  }

  // 5 · retire four types (hidden, not deleted); provider services on them go inactive
  const retired = RETIRE.map(byName).filter((t): t is NonNullable<typeof t> => !!t);
  for (const t of retired) { if (!t.hidden) { note("5 retire type", "hide", t.name); writes.push(() => prisma.serviceType.update({ where: { id: t.id }, data: { hidden: true, default_on: false } })); } }
  const onRetired = linked.filter((s) => s.active && !moved.has(s.id) && retired.some((t) => t.id === s.service_type_id));
  for (const s of onRetired) { note("5 provider service", "set inactive", s.name, `${s.id} · profile ${s.provider_profile_id}${s.published_at ? " · was live" : ""}`); writes.push(() => prisma.providerService.update({ where: { id: s.id }, data: { active: false } })); }

  // 6 · SERVICE categories left with no visible type are hidden
  const keep = new Set(rateTypeIds);
  for (const c of bt.serviceCategories.filter((c) => c.kind === "SERVICE" && c.id !== ratesId && !c.hidden)) {
    if (c.serviceTypes.every((t) => keep.has(t.id) || t.hidden || RETIRE.includes(t.name))) { note("6 category", "hide", c.name, "empty after the fold"); writes.push(() => prisma.serviceCategory.update({ where: { id: c.id }, data: { hidden: true } })); }
  }

  // 7 · cover picture → image #1
  const covers = await prisma.serviceProduct.findMany({ where: { cover_image_url: { not: null }, images: { none: {} } }, select: { id: true, title: true, cover_image_url: true } });
  for (const p of covers) { note("7 picture", "copy cover", p.title, p.id); writes.push(() => prisma.serviceProductImage.create({ data: { service_product_id: p.id, url: p.cover_image_url!, sort_order: 0 } })); }

  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  mkdirSync("scripts/out", { recursive: true });
  writeFileSync("scripts/out/my_catalog_rates_dryrun.csv", ["step,action,target,detail", ...plan.map((r) => [r.step, r.action, r.target, r.detail].map(esc).join(","))].join("\n") + "\n");
  for (const r of plan) console.log(`  ${r.step.padEnd(20)} ${r.action.padEnd(14)} ${r.target}${r.detail ? `  ${r.detail}` : ""}`);
  console.log(JSON.stringify({ applied: APPLY, changes: plan.length, csv: "scripts/out/my_catalog_rates_dryrun.csv" }));
  if (!APPLY) return;
  for (const w of writes) await w();
  console.log("applied");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
