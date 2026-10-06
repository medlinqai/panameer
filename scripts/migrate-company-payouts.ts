import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";

// Company v3 lane 2: move payout accounts to the company. Dry run by default (CSV only); --apply needs Scott's OK.
// Only-admin of their company → attach their default payout method to that company. Everyone else → flag for review.
async function main() {
  const apply = process.argv.includes("--apply");
  const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "test-results/company-v3/payout-migration-dry-run.csv";
  const methods = await prisma.payoutMethod.findMany({
    where: { company_id: null },
    select: { id: true, kind: true, label: true, last4: true, is_default: true, person: { select: { id: true, first_name: true, last_name: true, companyMemberships: { where: { status: "APPROVED" }, select: { role: true, company: { select: { id: true, name: true, _count: { select: { memberships: { where: { status: "APPROVED", role: "ADMIN" } } } } } } } } } } },
  });
  const rows = [["payout_method_id", "person", "company", "kind", "label", "last4", "is_default", "action", "reason"]];
  let attach = 0;
  for (const m of methods) {
    const admin = m.person.companyMemberships.find((x) => x.role === "ADMIN");
    const name = `${m.person.first_name ?? ""} ${m.person.last_name ?? ""}`.trim();
    const onlyAdmin = admin && admin.company._count.memberships === 1;
    const action = onlyAdmin && m.is_default ? "attach" : "flag";
    const reason = !admin ? "not an admin of any company" : !onlyAdmin ? "company has other admins" : !m.is_default ? "not the default method" : "only admin, default method";
    rows.push([m.id, name, admin?.company.name ?? "", m.kind, m.label, m.last4 ?? "", String(m.is_default), action, reason]);
    if (action === "attach") {
      attach++;
      if (apply) await prisma.payoutMethod.update({ where: { id: m.id }, data: { company_id: admin!.company.id } });
    }
  }
  writeFileSync(out, rows.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",")).join("\n") + "\n");
  console.log(`payout migration ${apply ? "APPLIED" : "dry run"} — ${methods.length} methods: ${attach} attach, ${methods.length - attach} flag → ${out}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
