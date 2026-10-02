/**
 * ⚠⚠⚠ SEED THE WORK TRACKER'S FIRST STATUSES (`P2-ALL-E752`).
 *
 *   npm run seed:work-tracker            — fill gaps only, never overwrite
 *   npm run seed:work-tracker -- --force — overwrite every seeded id
 *   npm run seed:work-tracker -- --dry   — report, write nothing
 *
 * ⚠⚠ **THE DEFAULT IS UPSERT-WHERE-ABSENT, AND THAT IS THE BRIEF'S REQUIREMENT,
 * NOT A CONVENIENCE.** Scott merges his own updates into the seed file later, so
 * a re-run must not undo what an admin changed in between. ⚠ A row that already
 * exists is LEFT ALONE and counted as `kept`, and the report says so — a seed
 * that silently reverted an edit would be `E517`'s rule broken again: a write
 * that destroys data it did not create.
 *
 * ⚠ `--force` exists so the seed file can be made authoritative deliberately,
 * once, with the decision visible in the command rather than in the code.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type SeedFile = {
  aim?: string;
  project?: string;
  publishedAt?: string;
  tasks: Record<string, { status?: string; owner?: string; note?: string }>;
  gates: Record<string, Record<string, string>>;
};

type Catalog = { tasks: { id: string }[]; gates: { id: string; criteria: unknown[] }[] };

const STATUSES = ["Not Started", "In Progress", "Blocked", "Done", "N/A"];
const GATE_VALUES = ["No", "Yes", "N/A"];

async function main() {
  const force = process.argv.includes("--force");
  const dry = process.argv.includes("--dry");

  const seed = JSON.parse(
    readFileSync(join(process.cwd(), "prisma/seed-data/work-tracker-state.json"), "utf8")
  ) as SeedFile;
  const catalog = JSON.parse(
    readFileSync(join(process.cwd(), "src/lib/work-tracker/aim-catalog.json"), "utf8")
  ) as Catalog;

  const catalogIds = new Set(catalog.tasks.map((t) => t.id));
  const gateById = new Map(catalog.gates.map((g) => [g.id, g]));

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  let created = 0;
  let updated = 0;
  let kept = 0;
  /* ⚠⚠ UNKNOWN IDS ARE REPORTED, NEVER WRITTEN. The tables have no foreign keys,
     so a typo in the seed file would otherwise sit in the database forever
     pointing at nothing — and the admin page, which iterates the CATALOG, would
     never show it. An orphan you cannot see is worse than a refusal. */
  const unknown: string[] = [];

  for (const [taskId, v] of Object.entries(seed.tasks ?? {})) {
    if (!catalogIds.has(taskId)) {
      unknown.push(taskId);
      continue;
    }
    const status = v.status ?? "Not Started";
    if (!STATUSES.includes(status)) {
      unknown.push(`${taskId} (status "${status}")`);
      continue;
    }
    const existing = await prisma.workTrackerTaskState.findUnique({ where: { task_id: taskId } });
    if (!existing) {
      if (!dry) await prisma.workTrackerTaskState.create({ data: { task_id: taskId, status } });
      created++;
    } else if (force) {
      if (!dry) await prisma.workTrackerTaskState.update({ where: { task_id: taskId }, data: { status } });
      updated++;
    } else {
      kept++;
    }
  }

  let gCreated = 0;
  let gKept = 0;
  let gUpdated = 0;
  for (const [gateId, criteria] of Object.entries(seed.gates ?? {})) {
    const gate = gateById.get(gateId);
    if (!gate) {
      unknown.push(`gate ${gateId}`);
      continue;
    }
    for (const [idxRaw, value] of Object.entries(criteria ?? {})) {
      const idx = Number(idxRaw);
      if (!Number.isInteger(idx) || idx < 0 || idx >= gate.criteria.length) {
        unknown.push(`${gateId}#${idxRaw}`);
        continue;
      }
      if (!GATE_VALUES.includes(value)) {
        unknown.push(`${gateId}#${idxRaw} (value "${value}")`);
        continue;
      }
      const existing = await prisma.workTrackerGateState.findUnique({
        where: { gate_id_criterion_index: { gate_id: gateId, criterion_index: idx } },
      });
      if (!existing) {
        if (!dry) {
          await prisma.workTrackerGateState.create({
            data: { gate_id: gateId, criterion_index: idx, value },
          });
        }
        gCreated++;
      } else if (force) {
        if (!dry) {
          await prisma.workTrackerGateState.update({
            where: { gate_id_criterion_index: { gate_id: gateId, criterion_index: idx } },
            data: { value },
          });
        }
        gUpdated++;
      } else {
        gKept++;
      }
    }
  }

  const total = await prisma.workTrackerTaskState.count();
  console.log(
    [
      "",
      `seed:work-tracker — ${dry ? "DRY RUN, nothing written" : force ? "FORCE" : "fill gaps only"}`,
      `  seed file   : ${Object.keys(seed.tasks ?? {}).length} task entries, ${Object.keys(seed.gates ?? {}).length} gates`,
      `  catalog     : ${catalogIds.size} tasks, ${gateById.size} gates`,
      `  tasks       : ${created} created · ${updated} overwritten · ${kept} left as the admin set them`,
      `  gates       : ${gCreated} created · ${gUpdated} overwritten · ${gKept} left as the admin set them`,
      `  task rows now: ${total}`,
      unknown.length
        ? `  ⚠ ${unknown.length} seed entries NOT in the catalog, skipped: ${unknown.slice(0, 8).join(", ")}${unknown.length > 8 ? " …" : ""}`
        : "  ✓ every seed entry resolved to a catalog id",
      "",
    ].join("\n")
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
