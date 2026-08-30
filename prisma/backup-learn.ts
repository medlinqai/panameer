import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { createHash } from "crypto";

/**
 * A COMPLETE, ROUND-TRIPPABLE BACKUP OF THE LEARN CONTENT.
 *
 *   npm run learn:backup -- <out.json>            # write it
 *   npm run learn:backup -- <out.json> --verify   # re-read the DB and diff
 *
 * ⚠⚠ WHY THIS EXISTS WHEN `export-learn-catalog.ts` ALREADY DUMPS THE CATALOG.
 * THAT SCRIPT IS NOT A BACKUP AND MUST NOT BE USED AS ONE. Its own docblock
 * says what it is — step 1 of the thumbnail-matching pipeline — and it selects
 * THREE of `Lesson`'s twelve scalar fields: `id`, `title`, `thumbnail_url`.
 * Measured on 2026-08-30 against the live database, its output contained:
 *
 *   · ZERO occurrences of `expert` — so all 522 lessons' `expert_person_id` is
 *     absent, which is the ONLY irreplaceable data here (Scott 338, Linus 70,
 *     Marelise 33, Eddie 25, 56 unattributed);
 *   · ZERO occurrences of `vimeo` — 305 lessons carry a `vimeo_ref`;
 *   · ZERO occurrences of `sort_order` — so lesson ORDER is not recoverable;
 *   · no `description` (179 lessons have one), no `run_time`, no `section_id`,
 *     no `production_status`, no `is_custom`, no `created_at`.
 *
 * Restoring from it would rebuild titles and lose the attribution, the videos
 * and the ordering. It round-trips a thumbnail manifest, not the content.
 *
 * ── HOW THIS ONE AVOIDS THE SAME TRAP ──────────────────────────────────────
 *
 * ⚠ IT USES BARE `findMany()` WITH NO `select`. That is deliberate and is the
 * whole design: a `select` list is a hand-maintained copy of the schema, and the
 * day somebody adds a column the backup silently stops capturing it — which is
 * exactly how the other script came to be missing nine fields. With no `select`,
 * Prisma returns every scalar, so a NEW COLUMN IS CAPTURED THE DAY IT IS ADDED,
 * with no edit here.
 *
 * ⚠ FLAT TABLES, NOT A NESTED TREE. Nesting duplicates parent rows and makes a
 * field-by-field diff awkward; flat arrays keyed by id can be compared exactly.
 * The parent links (`learning_path_id`, `course_id`, `section_id`) are scalars,
 * so the tree is fully reconstructable from them.
 *
 * ⚠ EXPERTS ARE RESOLVED TO EMAIL AS WELL AS ID. `expert_person_id` is a uuid
 * that would not survive a rebuild of the Person table; the email is the stable
 * identity the seeder already keys on. Both are stored so a restore can match on
 * whichever still exists. ⚠ This mirrors the standing rule that the protected
 * set is derived from `learn_lessons.expert_person_id` AT RUNTIME rather than
 * from a name list.
 *
 * ⚠ READ-ONLY. There is no create/update/upsert/delete anywhere in this file,
 * by design — a backup tool that can write to the database it is protecting is
 * one typo from being the disaster it exists to prevent.
 */
const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const OUT = process.argv[2];
const VERIFY = process.argv.includes("--verify");

/** Everything, in a stable order so two dumps of the same data are identical. */
async function read() {
  const [paths, courses, sections, lessons] = await Promise.all([
    p.learningPath.findMany({ orderBy: { id: "asc" } }),
    p.course.findMany({ orderBy: { id: "asc" } }),
    p.section.findMany({ orderBy: { id: "asc" } }),
    p.lesson.findMany({ orderBy: { id: "asc" } }),
  ]);

  /* The expert identities behind the ids, so attribution survives id churn. */
  const ids = [
    ...new Set(
      [
        ...lessons.map((l) => l.expert_person_id),
        ...paths.map((x) => x.expert_person_id),
      ].filter((x): x is string => !!x)
    ),
  ].sort();
  const experts = await p.person.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      user: { select: { email: true } },
    },
    orderBy: { id: "asc" },
  });

  return { paths, courses, sections, lessons, experts };
}

function stable(v: unknown) {
  return JSON.stringify(v, null, 1);
}

async function main() {
  if (!OUT) {
    console.error("usage: npm run learn:backup -- <out.json> [--verify]");
    process.exit(1);
  }
  const data = await read();

  const counts = {
    paths: data.paths.length,
    courses: data.courses.length,
    sections: data.sections.length,
    lessons: data.lessons.length,
    experts: data.experts.length,
  };

  /* Attribution, counted from the rows being written — not from a second query,
     so the number reported is provably the number stored. */
  const attribution = new Map<string, number>();
  for (const l of data.lessons) {
    const k = l.expert_person_id ?? "(unattributed)";
    attribution.set(k, (attribution.get(k) ?? 0) + 1);
  }
  const nameOf = (id: string) => {
    if (id === "(unattributed)") return id;
    const e = data.experts.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name} <${e.user?.email ?? "—"}>` : id;
  };

  if (VERIFY) {
    /*
      ⚠⚠ THE ROUND-TRIP PROOF, AND IT IS A REAL ONE.

      This re-reads the database and compares it to the FILE ON DISK, field by
      field, for every row of every model. It is not a count check — counts
      match happily while values rot. `stable()` serialises both sides
      identically (Dates become ISO strings on both), so a byte-equal result
      means every column of every row survived the trip.
    */
    const onDisk = JSON.parse(readFileSync(OUT, "utf8"));
    let ok = true;
    for (const k of ["paths", "courses", "sections", "lessons", "experts"] as const) {
      const a = stable(onDisk[k]);
      const b = stable((data as Record<string, unknown>)[k]);
      const same = a === b;
      if (!same) ok = false;
      console.log(
        `  ${same ? "✓" : "✗"} ${k.padEnd(9)} ${(data as Record<string, unknown[]>)[k].length} rows  ` +
          `sha ${createHash("sha256").update(a).digest("hex").slice(0, 12)} (file) vs ` +
          `${createHash("sha256").update(b).digest("hex").slice(0, 12)} (db)`
      );
    }

    /* Field completeness: is every scalar the DB returns actually in the file? */
    for (const k of ["paths", "courses", "sections", "lessons"] as const) {
      const dbKeys = new Set(Object.keys((data[k] as Record<string, unknown>[])[0] ?? {}));
      const fileKeys = new Set(Object.keys((onDisk[k] as Record<string, unknown>[])[0] ?? {}));
      const missing = [...dbKeys].filter((x) => !fileKeys.has(x));
      console.log(
        `  ${missing.length === 0 ? "✓" : "✗"} ${k.padEnd(9)} fields captured: ${fileKeys.size}/${dbKeys.size}` +
          (missing.length ? `  MISSING: ${missing.join(", ")}` : "")
      );
      if (missing.length) ok = false;
    }

    /* Referential completeness: the tree must rebuild from the flat tables. */
    const pathIds = new Set(onDisk.paths.map((x: { id: string }) => x.id));
    const courseIds = new Set(onDisk.courses.map((x: { id: string }) => x.id));
    const sectionIds = new Set(onDisk.sections.map((x: { id: string }) => x.id));
    const orphanCourses = onDisk.courses.filter((c: { learning_path_id: string }) => !pathIds.has(c.learning_path_id));
    const orphanSections = onDisk.sections.filter((s: { course_id: string }) => !courseIds.has(s.course_id));
    const orphanLessons = onDisk.lessons.filter((l: { section_id: string }) => !sectionIds.has(l.section_id));
    for (const [label, arr] of [
      ["courses -> path", orphanCourses],
      ["sections -> course", orphanSections],
      ["lessons -> section", orphanLessons],
    ] as [string, unknown[]][]) {
      console.log(`  ${arr.length === 0 ? "✓" : "✗"} ${label.padEnd(20)} orphans: ${arr.length}`);
      if (arr.length) ok = false;
    }

    /* Attribution, recounted FROM THE FILE — the point of the whole exercise. */
    const fileAttr = new Map<string, number>();
    for (const l of onDisk.lessons as { expert_person_id: string | null }[]) {
      const k = l.expert_person_id ?? "(unattributed)";
      fileAttr.set(k, (fileAttr.get(k) ?? 0) + 1);
    }
    console.log("  attribution recovered FROM THE FILE:");
    for (const [id, n] of [...fileAttr.entries()].sort((a, b) => b[1] - a[1])) {
      const dbN = attribution.get(id) ?? 0;
      console.log(`    ${n === dbN ? "✓" : "✗"} ${nameOf(id)}: ${n} (db ${dbN})`);
      if (n !== dbN) ok = false;
    }

    console.log(ok ? "\nROUND-TRIP: PASS" : "\nROUND-TRIP: FAIL");
    process.exit(ok ? 0 : 1);
  }

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, stable(data));
  console.log(`wrote ${OUT}`);
  console.log(
    `  paths ${counts.paths} · courses ${counts.courses} · sections ${counts.sections} · lessons ${counts.lessons} · experts ${counts.experts}`
  );
  for (const [id, n] of [...attribution.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${nameOf(id)}: ${n}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
