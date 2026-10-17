// NT-E001 backfill: open notifications for requests that are no longer PENDING (connection, mentor, company join) → resolved + read.
// Dry run by default (counts + a sample); --apply writes. Run: npx tsx --env-file=.env.local scripts/resolve-stale-notifications.ts [--apply]
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");

async function main() {
  const open = await prisma.notification.findMany({
    where: { resolved_at: null, OR: [{ dedupe_key: { startsWith: "colleague.invite:" } }, { dedupe_key: { startsWith: "mentor.request:" } }, { dedupe_key: { startsWith: "company.join_requested:" } }] },
    select: { id: true, dedupe_key: true, title: true },
  });
  const stale: { id: string; key: string; title: string | null }[] = [];
  for (const n of open) {
    const k = n.dedupe_key ?? "";
    let pending = true;
    const conn = /^(?:colleague\.invite|mentor\.request):([0-9a-f-]{36})/i.exec(k);
    const join = /^company\.join_requested:([0-9a-f-]{36}):([0-9a-f-]{36}):/i.exec(k);
    if (conn) pending = (await prisma.connection.count({ where: { id: conn[1], status: "PENDING" } })) > 0;
    else if (join) pending = (await prisma.companyMembership.count({ where: { company_id: join[1], person_id: join[2], status: "PENDING" } })) > 0;
    if (!pending) stale.push({ id: n.id, key: k.split(":")[0], title: n.title });
  }
  const byKind = stale.reduce<Record<string, number>>((m, s) => ((m[s.key] = (m[s.key] ?? 0) + 1), m), {});
  console.log(JSON.stringify({ applied: APPLY, open: open.length, stale: stale.length, byKind, sample: stale.slice(0, 8).map((s) => s.title) }, null, 1));
  if (!APPLY || !stale.length) return;
  const now = new Date();
  await prisma.notification.updateMany({ where: { id: { in: stale.map((s) => s.id) } }, data: { resolved_at: now } });
  await prisma.notification.updateMany({ where: { id: { in: stale.map((s) => s.id) }, read_at: null }, data: { read_at: now } });
  console.log("applied");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
