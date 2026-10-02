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

  /*
    ── ⚠⚠⚠ ONE MILESTONE, SEEDED BY TITLE (`P2-ALL-E757`, Scott 2026-10-02) ────

    ⚠ **`R1 — Public beta`, 2026-11-01, In progress, PUBLISHED.** It is the one
    date Scott has actually set, and it is the Build Line's flag.
    ⚠⚠ **MATCHED ON TITLE, NOT ON AN ID**, so a re-run finds the row an admin may
    have edited instead of creating a second one. ⚠ Like the task seed, it FILLS A
    GAP and never overwrites: if the row exists, its date, status and text are the
    admin's and are left alone. `--force` re-asserts the seed's values.
    ⚠ **THE OTHER PHASE DATES ARE NOT SEEDED** — Scott's drafts (Define Jul 1–15 …)
    are explicitly "do not seed"; until he enters them the Build Line says
    `Dates coming soon` and the hero drops its `Day N` clause.
  */
  const MILESTONE = {
    code: "R1",
    summary: "The first public release.",
    title: "R1 — Public beta",
    description: "Panameer opens to the public.",
    date: new Date("2026-11-01T00:00:00Z"),
    /* ⚠ `target_date` is the field the reader prefers; `date` is kept in step so
       the legacy column never goes stale while both exist. */
    target_date: new Date("2026-11-01T00:00:00Z"),
    status: "In progress",
    sort: 0,
    published: true,
  };
  const existingMilestone = await prisma.workTrackerRelease.findFirst({
    where: { title: MILESTONE.title },
  });
  let milestoneNote: string;
  if (!existingMilestone) {
    if (!dry) await prisma.workTrackerRelease.create({ data: MILESTONE });
    milestoneNote = "created";
  } else if (force) {
    if (!dry) {
      await prisma.workTrackerRelease.update({ where: { id: existingMilestone.id }, data: MILESTONE });
    }
    milestoneNote = "overwritten";
  } else {
    milestoneNote = "left as the admin set it";
  }

  /*
    ── ⚠⚠⚠ JOURNEY STAGES AND THE CURRENT PHASE (Scott, 2026-10-02) ───────────

    ⚠ **`Register` and `Profile` = `test` · `Pay` = `design` · everything else =
    `build`.** His words, and they are the state of the build today.
    ⚠⚠ Keyed on the catalog's SEGMENT, not on a task id, so the seed still reads
    correctly if the ids move. ⚠ Fill-gaps-only like the rest: a stage an admin
    has already set is left alone unless `--force`.

    ⚠⚠⚠ **AND THE PHASE IS `Build`.** It is the admin-set answer — the first of
    the three sources — and it exists precisely because the inference said
    `Define` while the work was in `Build`.
  */
  const STAGE_BY_SEGMENT: Record<string, string> = {
    Register: "test",
    Profile: "test",
    Pay: "design",
  };
  const DEFAULT_STAGE = "build";
  const MILESTONE_SEGMENT = "Milestones";

  let stagesSet = 0;
  let stagesKept = 0;
  for (const t of catalog.tasks as { id: string; segment?: string }[]) {
    if (!t.id.startsWith("PNM-") || t.segment === MILESTONE_SEGMENT) continue;
    const want = STAGE_BY_SEGMENT[t.segment ?? ""] ?? DEFAULT_STAGE;
    const row = await prisma.workTrackerTaskState.findUnique({ where: { task_id: t.id } });
    if (row?.stage && !force) {
      stagesKept++;
      continue;
    }
    if (!dry) {
      await prisma.workTrackerTaskState.upsert({
        where: { task_id: t.id },
        update: { stage: want },
        create: { task_id: t.id, status: "Not Started", stage: want },
      });
    }
    stagesSet++;
  }

  const CURRENT_PHASE = "Build";
  const already = await prisma.workTrackerPhaseDate.findFirst({ where: { is_current: true } });
  let phaseNote: string;
  if (already && !force) {
    phaseNote = `left as the admin set it (${already.phase})`;
  } else {
    if (!dry) {
      await prisma.$transaction(async (tx) => {
        await tx.workTrackerPhaseDate.updateMany({ where: { is_current: true }, data: { is_current: false } });
        await tx.workTrackerPhaseDate.upsert({
          where: { phase: CURRENT_PHASE },
          update: { is_current: true },
          create: { phase: CURRENT_PHASE, is_current: true },
        });
      });
    }
    phaseNote = `set to ${CURRENT_PHASE}`;
  }

  /*
    ── ⚠⚠ MIGRATE THE EXISTING R1 ROW, AND GIVE IT SCOPE (`P2-ALL-E765`) ───────

    ⚠ The row predates `code`, `summary` and `target_date`, so a fill-gaps seed
    would leave it nameless. ⚠⚠ These three are backfilled WHERE THEY ARE NULL
    only — an admin's own edit is never overwritten.

    ⚠⚠⚠ **R1 = Register · Profile · Connect** (Scott's direction). ⚠ Only those
    three journeys are assigned; everything else stays unassigned, and unassigned
    is NOT "in R1" — it is out of scope until somebody says otherwise, which is why
    the column is nullable and why R1's percentage counts only what it holds.
  */
  const r1 = await prisma.workTrackerRelease.findFirst({ where: { title: MILESTONE.title } });
  if (r1 && !dry) {
    await prisma.workTrackerRelease.update({
      where: { id: r1.id },
      data: {
        ...(r1.code ? {} : { code: MILESTONE.code }),
        ...(r1.summary ? {} : { summary: MILESTONE.summary }),
        ...(r1.target_date ? {} : { target_date: MILESTONE.target_date }),
      },
    });
  }

  const R1_SEGMENTS = ["Register", "Profile", "Connect"];
  let assigned = 0;
  let assignKept = 0;
  if (r1) {
    for (const t of catalog.tasks as { id: string; segment?: string }[]) {
      if (!t.id.startsWith("PNM-") || !R1_SEGMENTS.includes(t.segment ?? "")) continue;
      const row = await prisma.workTrackerTaskState.findUnique({ where: { task_id: t.id } });
      if (row?.release_id && !force) {
        assignKept++;
        continue;
      }
      if (!dry) {
        await prisma.workTrackerTaskState.upsert({
          where: { task_id: t.id },
          update: { release_id: r1.id },
          create: { task_id: t.id, status: "Not Started", release_id: r1.id },
        });
      }
      assigned++;
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
      `  milestone    : "${MILESTONE.title}" ${milestoneNote}`,
      `  journey stages: ${stagesSet} set · ${stagesKept} left as the admin set them`,
      `  current phase : ${phaseNote}`,
      `  R1 journeys   : ${assigned} assigned · ${assignKept} left as the admin set them`,
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
