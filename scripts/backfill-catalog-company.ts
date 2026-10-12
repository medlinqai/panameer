// BT-E005: the company owns the catalog — set company_id on services and service products from the provider's approved company.
// Dry run by default: writes scripts/out/catalog_company_dryrun.csv. Scott runs it with --apply. Rows with no company stay null.
// Run: npx tsx --env-file=.env.local scripts/backfill-catalog-company.ts [--apply]
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");

async function main() {
  const [svcs, prods] = await Promise.all([
    prisma.providerService.findMany({ where: { company_id: null }, select: { id: true, name: true, provider_profile_id: true } }),
    prisma.serviceProduct.findMany({ where: { company_id: null }, select: { id: true, title: true, provider_profile_id: true } }),
  ]);
  const profileIds = [...new Set([...svcs, ...prods].map((r) => r.provider_profile_id))];
  const profiles = await prisma.providerProfile.findMany({
    where: { id: { in: profileIds } },
    select: { id: true, person: { select: { first_name: true, last_name: true, companyMemberships: { where: { status: "APPROVED" }, select: { company: { select: { id: true, name: true } } } } } } },
  });
  const co = new Map(profiles.map((p) => [p.id, { who: `${p.person.first_name} ${p.person.last_name}`.trim(), companies: p.person.companyMemberships.map((m) => m.company) }]));
  const rows = [
    ...svcs.map((r) => ({ table: "provider_services", id: r.id, name: r.name, pid: r.provider_profile_id })),
    ...prods.map((r) => ({ table: "service_products", id: r.id, name: r.title, pid: r.provider_profile_id })),
  ].map((r) => {
    const c = co.get(r.pid);
    const one = c?.companies.length === 1 ? c.companies[0] : null;
    return { ...r, who: c?.who ?? "", company: one, action: one ? "set" : c?.companies.length ? "skip: several companies" : "skip: no company" };
  });
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  mkdirSync("scripts/out", { recursive: true });
  writeFileSync("scripts/out/catalog_company_dryrun.csv", ["table,row_id,item,provider,company_id,company,action", ...rows.map((r) => [r.table, r.id, r.name, r.who, r.company?.id ?? "", r.company?.name ?? "", r.action].map(esc).join(","))].join("\n") + "\n");
  const set = rows.filter((r) => r.company);
  console.log(JSON.stringify({ applied: APPLY, services: svcs.length, serviceProducts: prods.length, set: set.length, skipped: rows.length - set.length, csv: "scripts/out/catalog_company_dryrun.csv" }));
  if (!APPLY) return;
  for (const r of set) {
    if (r.table === "provider_services") await prisma.providerService.updateMany({ where: { id: r.id, company_id: null }, data: { company_id: r.company!.id } });
    else await prisma.serviceProduct.updateMany({ where: { id: r.id, company_id: null }, data: { company_id: r.company!.id } });
  }
  console.log("applied");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
