// BT-E002: no one hits the wall — every provider company without a business type gets ERP Consulting (test companies skipped).
// Dry run by default: writes scripts/out/company_business_type_dryrun.csv. Scott runs it with --apply.
// Run: npx tsx --env-file=.env.local scripts/backfill-company-business-type.ts [--apply]
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { REAL_COMPANY } from "@/lib/business-types";

const APPLY = process.argv.includes("--apply");

async function main() {
  const erp = await prisma.businessType.findUnique({ where: { code: "PANAMEER_V1" }, select: { id: true, name: true } });
  if (!erp) throw new Error("ERP Consulting (PANAMEER_V1) not found — run the Service Taxonomy seed first");
  const companies = await prisma.company.findMany({
    where: { AND: [{ archived_at: null, businessTypes: { none: {} }, memberships: { some: { status: "APPROVED", person: { is_service_provider: true } } } }, REAL_COMPANY] },
    select: { id: true, name: true, memberships: { where: { status: "APPROVED", person: { is_service_provider: true } }, select: { person: { select: { first_name: true, last_name: true } } } } },
    orderBy: { name: "asc" },
  });
  const skippedTest = await prisma.company.count({ where: { archived_at: null, businessTypes: { none: {} }, memberships: { some: { status: "APPROVED", person: { is_service_provider: true } } }, NOT: REAL_COMPANY } });
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  mkdirSync("scripts/out", { recursive: true });
  writeFileSync("scripts/out/company_business_type_dryrun.csv", ["company_id,company,providers,action", ...companies.map((c) => [c.id, c.name, c.memberships.map((m) => `${m.person.first_name} ${m.person.last_name}`.trim()).join("; "), `link ${erp.name}`].map(esc).join(","))].join("\n") + "\n");
  console.log(JSON.stringify({ applied: APPLY, link: companies.length, skippedTestCompanies: skippedTest, to: erp.name, csv: "scripts/out/company_business_type_dryrun.csv" }));
  if (!APPLY) return;
  await prisma.companyBusinessType.createMany({ data: companies.map((c) => ({ company_id: c.id, business_type_id: erp.id })), skipDuplicates: true });
  console.log("applied");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
