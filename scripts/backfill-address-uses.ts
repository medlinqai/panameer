// LS-E001 backfill: each company's registered (else oldest) address → Corporate + Bill To + Ship To (+ Remit To for sellers).
// Companies that already have a ticked address are skipped. Dry run writes scripts/out/address_uses_backfill.csv; --apply writes.
// Run: npx tsx --env-file=.env.local scripts/backfill-address-uses.ts [--apply]
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { REGISTERED_SITE_NAME } from "@/lib/company";

const APPLY = process.argv.includes("--apply");

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  const rows: string[] = ["company_id,company,address_id,line1,city,country,site,seller"];
  const plan: { id: string; seller: boolean }[] = [];
  for (const c of companies) {
    const flagged = await prisma.address.count({ where: { site: { company_id: c.id }, OR: [{ is_corporate: true }, { is_bill_to: true }, { is_ship_to: true }, { is_remit_to: true }] } });
    if (flagged) continue;
    const a =
      (await prisma.address.findFirst({ where: { site: { company_id: c.id, name: REGISTERED_SITE_NAME }, line1: { not: "" } }, orderBy: { created_at: "asc" }, select: { id: true, line1: true, city: true, country: true, site: { select: { name: true } } } })) ??
      (await prisma.address.findFirst({ where: { site: { company_id: c.id }, line1: { not: "" } }, orderBy: { created_at: "asc" }, select: { id: true, line1: true, city: true, country: true, site: { select: { name: true } } } }));
    if (!a) continue;
    const seller = (await prisma.companyMembership.count({ where: { company_id: c.id, status: "APPROVED", person: { is_service_provider: true } } })) > 0;
    plan.push({ id: a.id, seller });
    const q = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
    rows.push([c.id, q(c.name), a.id, q(a.line1), q(a.city), q(a.country), q(a.site.name), seller].join(","));
  }
  writeFileSync("scripts/out/address_uses_backfill.csv", rows.join("\n") + "\n");
  console.log(JSON.stringify({ applied: APPLY, companies: companies.length, addressesToTick: plan.length, sellers: plan.filter((p) => p.seller).length, csv: "scripts/out/address_uses_backfill.csv" }));
  if (!APPLY) return;
  for (const p of plan) await prisma.address.update({ where: { id: p.id }, data: { is_corporate: true, is_bill_to: true, is_ship_to: true, is_remit_to: p.seller } });
  console.log("applied");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
