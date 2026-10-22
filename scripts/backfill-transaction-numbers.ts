// NB-E003: renumber existing transactions as PREFIX-CODE-YY-######## in creation order per prefix (per buyer company,
// year from each row's creation date); the old number goes to legacy_number. ERP refs (PO numbers, cXML ids) untouched.
// Usage: npx tsx --env-file=.env.local scripts/backfill-transaction-numbers.ts [--apply]
import { prisma } from "@/lib/prisma";
import { nextNumber, type NumberPrefix } from "@/lib/numbering";

const NEW = /^[A-Z]{2}-[A-Z0-9]{3,6}-\d{2}-\d{8}$/;
const apply = process.argv.includes("--apply");
const counts: Record<string, number> = {};
const samples: string[] = [];

async function run(prefix: "JB" | "WR" | "WO" | "ST" | "PY" | "CO" | "ES", rows: { id: string; at: Date; old: string | null; pAccountId: string | null; companyId?: string | null }[], write: (id: string, num: string, old: string | null) => Promise<unknown>) {
  const todo = rows.filter((r) => !(r.old && NEW.test(r.old))).sort((a, b) => a.at.getTime() - b.at.getTime());
  counts[prefix] = todo.length;
  for (const r of todo) {
    if (!r.pAccountId && !r.companyId) continue;
    if (!apply) continue;
    const num = await nextNumber(prefix as NumberPrefix, { pAccountId: r.pAccountId, companyId: r.companyId }, { at: r.at });
    await write(r.id, num, r.old);
    if (samples.length < 8 && r.old) samples.push(`${r.old} → ${num}`);
  }
}

(async () => {
  const woAccount = new Map((await prisma.workOrder.findMany({ select: { id: true, p_account_id: true } })).map((w) => [w.id, w.p_account_id]));
  await run("JB", (await prisma.job.findMany({ select: { id: true, created_at: true, job_number: true, p_account_id: true } })).map((r) => ({ id: r.id, at: r.created_at, old: r.job_number, pAccountId: r.p_account_id })),
    (id, num) => prisma.job.update({ where: { id }, data: { job_number: num } }));
  await run("WR", (await prisma.workRequest.findMany({ select: { id: true, created_at: true, wr_number: true, p_account_id: true } })).map((r) => ({ id: r.id, at: r.created_at, old: r.wr_number, pAccountId: r.p_account_id })),
    (id, num, old) => prisma.workRequest.update({ where: { id }, data: { wr_number: num, legacy_number: old } }));
  await run("WO", (await prisma.workOrder.findMany({ select: { id: true, created_at: true, order_number: true, p_account_id: true } })).map((r) => ({ id: r.id, at: r.created_at, old: r.order_number, pAccountId: r.p_account_id })),
    (id, num, old) => prisma.workOrder.update({ where: { id }, data: { order_number: num, legacy_number: old } }));
  await run("ST", (await prisma.paymentRequest.findMany({ select: { id: true, created_at: true, payment_request_number: true, work_order_id: true } })).map((r) => ({ id: r.id, at: r.created_at, old: r.payment_request_number, pAccountId: woAccount.get(r.work_order_id) ?? null })),
    (id, num, old) => prisma.paymentRequest.update({ where: { id }, data: { payment_request_number: num, legacy_number: old } }));
  await run("PY", (await prisma.payment.findMany({ select: { id: true, created_at: true, payment_number: true, p_account_id: true } })).map((r) => ({ id: r.id, at: r.created_at, old: r.payment_number, pAccountId: r.p_account_id })),
    (id, num, old) => prisma.payment.update({ where: { id }, data: { payment_number: num, legacy_number: old } }));
  await run("CO", (await prisma.workOrderRevision.findMany({ select: { id: true, created_at: true, change_order_number: true, work_order_id: true } })).map((r) => ({ id: r.id, at: r.created_at, old: r.change_order_number, pAccountId: woAccount.get(r.work_order_id) ?? null })),
    (id, num) => prisma.workOrderRevision.update({ where: { id }, data: { change_order_number: num } }));
  const est = await prisma.estimate.findMany({ select: { id: true, created_at: true, estimate_number: true, customer_person_id: true, provider_person_id: true } });
  const people = new Map((await prisma.person.findMany({ where: { id: { in: est.flatMap((e) => [e.customer_person_id, e.provider_person_id].filter((x): x is string => !!x)) } }, select: { id: true, company_id: true } })).map((p) => [p.id, p.company_id]));
  await run("ES", est.map((r) => ({ id: r.id, at: r.created_at, old: r.estimate_number, pAccountId: null, companyId: people.get(r.customer_person_id ?? "") ?? people.get(r.provider_person_id) ?? null })),
    (id, num, old) => prisma.estimate.update({ where: { id }, data: { estimate_number: num, legacy_number: old } }));
  console.log(JSON.stringify(counts));
  if (samples.length) console.log(samples.join("\n"));
  console.log(apply ? "Applied." : "Dry run — add --apply.");
  await prisma.$disconnect();
})();
