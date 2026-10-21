// HP-E001 backfill: resolve open work notifications whose action is already done. Dry run writes a CSV; --apply writes.
import { writeFileSync, mkdirSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { settleWork } from "../src/lib/work-resolve";

(async () => {
  const apply = process.argv.includes("--apply");
  const { open, done } = await settleWork(null, { apply });
  const people = await prisma.person.findMany({ where: { id: { in: [...new Set(done.map((d) => d.person_id))] } }, select: { id: true, first_name: true, last_name: true } });
  const name = (id: string) => { const p = people.find((x) => x.id === id); return p ? `${p.first_name} ${p.last_name}`.trim() : id; };
  mkdirSync("scripts/out", { recursive: true });
  writeFileSync("scripts/out/settle_work_dryrun.csv", ["notification_id,person,event_key,entity_id", ...done.map((d) => `${d.id},"${name(d.person_id)}",${d.event_key},${d.entity_id ?? ""}`)].join("\n") + "\n");
  const byPerson = done.reduce<Record<string, number>>((m, d) => ((m[name(d.person_id)] = (m[name(d.person_id)] ?? 0) + 1), m), {});
  const byEvent = done.reduce<Record<string, number>>((m, d) => ((m[d.event_key] = (m[d.event_key] ?? 0) + 1), m), {});
  console.log(JSON.stringify({ openWorkItems: open, toResolve: done.length, byEvent, byPerson }, null, 1));
  console.log(apply ? "APPLIED" : "DRY RUN — scripts/out/settle_work_dryrun.csv");
  await prisma.$disconnect();
  process.exit(0);
})();
