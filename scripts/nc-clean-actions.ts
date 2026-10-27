// NC-E001: existing news rows stop being actions. Dry run lists counts by event; --apply sets requires_action = false.
// Usage: npx tsx --env-file=.env.local scripts/nc-clean-actions.ts [--apply]
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { ACTION_EVENTS } from "../src/lib/action-rule";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
async function main() {
  const apply = process.argv.includes("--apply");
  const where = { requires_action: true, event_key: { notIn: [...ACTION_EVENTS] } };
  const by = await prisma.notification.groupBy({ by: ["event_key"], where, _count: { _all: true } });
  const open = await prisma.notification.count({ where: { ...where, resolved_at: null } });
  const total = by.reduce((n, b) => n + b._count._all, 0);
  for (const b of by.sort((x, y) => y._count._all - x._count._all)) console.log(`${b._count._all}\t${b.event_key}`);
  console.log(`\n${total} rows → news (${open} still open on the Worklist).${apply ? "" : " Dry run — add --apply."}`);
  if (apply) console.log(`Updated ${(await prisma.notification.updateMany({ where, data: { requires_action: false } })).count}.`);
}
main().finally(() => prisma.$disconnect());
