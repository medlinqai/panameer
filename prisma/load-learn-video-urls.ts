import { readFileSync } from "fs";
import { prisma } from "../src/lib/prisma";
import { normalizeVimeoRef, setLessonUrl } from "../src/lib/learn-admin";
import { normalizeLearnTitle } from "../src/lib/learn-match";

/**
 * Load Vimeo URLs onto Learn lessons (brief_learn_video_url_load).
 *
 *   npm run learn:video-urls              # dry — reports, writes nothing
 *   npm run learn:video-urls -- --apply   # writes
 *
 * Bundled by esbuild with the `@` alias and run under `-r dotenv/config`, the
 * same shape `check:ai-fixtures` uses. Two reasons, both learned the hard way
 * here: ts-node cannot resolve `@/`, which `learn-admin.ts` imports; and an
 * in-file `dotenv.config()` runs AFTER the hoisted imports, so the Prisma client
 * is constructed with no DATABASE_URL and the first query dies on ECONNREFUSED.
 *
 * DRY BY DEFAULT, matching `learn:thumbnails`. The decision this script makes is
 * which video plays on which lesson, and the house rule for that class of job is
 * that you get to read the plan before it happens.
 *
 * IT WRITES THROUGH `setLessonUrl`, not with its own `prisma.update`. That
 * function is the admin console's URL path and it already does the three things
 * that matter: it refuses anything that isn't a Vimeo reference (so a YouTube
 * link cannot sneak in), it promotes `production_status` to URL_ADDED_TO_LESSON
 * so the lesson passes `isPlayable` — the gate the brief names, which needs BOTH
 * a ref and a status — and it sets `is_custom` so a re-seed doesn't wipe the
 * work. A parallel writer here would have to re-implement all three and would
 * eventually disagree with the console about what "has a URL" means.
 *
 * NEVER GUESS-ATTACH. A row is written only when the CSV's path resolves to
 * EXACTLY ONE lesson. Zero candidates or two, and it is skipped and listed.
 */

const CSV = "scripts/data/video_url_load.csv";

/** RFC-4180 enough for this file: quoted cells, embedded commas and quotes. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [head, ...rest] = rows;
  return rest
    .filter((r) => r.some((v) => v.trim()))
    .map((r) =>
      Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()]))
    );
}

type Candidate = {
  id: string;
  ref: string | null;
  lesson: string;
  section: string;
  course: string;
  lp: string;
  path: string;
};

async function main() {
  const apply = process.argv.includes("--apply");
  const rows = parseCsv(readFileSync(CSV, "utf8"));

  const lessons = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      vimeo_ref: true,
      section: {
        select: {
          title: true,
          course: {
            select: { title: true, learningPath: { select: { title: true } } },
          },
        },
      },
    },
  });

  const index: Candidate[] = lessons.map((l) => ({
    id: l.id,
    ref: l.vimeo_ref,
    lesson: normalizeLearnTitle(l.title),
    section: normalizeLearnTitle(l.section.title),
    course: normalizeLearnTitle(l.section.course.title),
    lp: normalizeLearnTitle(l.section.course.learningPath.title),
    path: `${l.section.course.learningPath.title} › ${l.section.course.title} › ${l.section.title} › ${l.title}`,
  }));

  const matched: {
    row: Record<string, string>;
    hit: Candidate;
    /** Normalised — for the idempotence comparison only. */
    ref: string;
    /** What actually goes to `setLessonUrl`. See the note at the write. */
    raw: string;
  }[] = [];
  const ambiguous: { row: Record<string, string>; hits: Candidate[] }[] = [];
  const unmatched: { row: Record<string, string>; reason: string }[] = [];

  for (const row of rows) {
    /*
      ONLY VIMEO. The CSV is Vimeo-only by construction, but this is the last
      gate before a URL reaches a lesson and the brief asks for it explicitly —
      a non-Vimeo row is reported rather than trusted to have been filtered
      upstream.
    */
    const ref = normalizeVimeoRef(row.video_url ?? "");
    if (!ref) {
      unmatched.push({ row, reason: "not a Vimeo URL" });
      continue;
    }

    /*
      MATCH ON AS MUCH PATH AS THE ROW ACTUALLY CARRIES.

      The brief specifies Learning Path → Course → Section → Lesson. The export
      only fills `learning_path` on 6 of 308 rows and `course` on 17 — the tabs
      carry section and lesson name, and the higher levels were the spreadsheet's
      structure rather than its columns. So each present component narrows, and
      an absent one simply doesn't.

      That is NOT a relaxation of the never-guess rule, because the rule is
      enforced on the OUTCOME rather than on the key: whatever the row supplies,
      it is written only if exactly one lesson survives. A row whose section and
      lesson name are unique in the catalog is not a guess just because the
      spreadsheet didn't repeat the path above it; a row that stays ambiguous is
      skipped no matter how much path it had.
    */
    const want = {
      lesson: normalizeLearnTitle(row.lesson_name),
      section: normalizeLearnTitle(row.section),
      course: normalizeLearnTitle(row.course),
      lp: normalizeLearnTitle(row.learning_path),
    };
    if (!want.lesson) {
      unmatched.push({ row, reason: "no lesson name" });
      continue;
    }

    let hits = index.filter((c) => c.lesson === want.lesson);
    if (want.section) hits = hits.filter((c) => c.section === want.section);
    if (want.course) hits = hits.filter((c) => c.course === want.course);
    if (want.lp) hits = hits.filter((c) => c.lp === want.lp);

    if (hits.length === 1)
      matched.push({ row, hit: hits[0], ref, raw: row.video_url });
    else if (hits.length === 0)
      unmatched.push({ row, reason: "no lesson with that path" });
    else ambiguous.push({ row, hits });
  }

  /*
    IDEMPOTENCE IS DECIDED HERE, not by letting the write be harmless. A lesson
    already holding this exact ref is not re-written: `setLessonUrl` also flips
    `is_custom` and can move `production_status`, so a "harmless" repeat would
    still touch 304 rows on every run and make the second run indistinguishable
    from the first in any audit.
  */
  const toWrite = matched.filter((m) => m.hit.ref !== m.ref);
  const already = matched.length - toWrite.length;

  console.log(`\n${CSV}: ${rows.length} rows`);
  console.log(`catalog: ${lessons.length} lessons\n`);
  console.log(`  matched    ${matched.length}`);
  console.log(`    to write ${toWrite.length}`);
  console.log(`    unchanged ${already}  (already hold this exact ref)`);
  console.log(`  ambiguous  ${ambiguous.length}   → skipped`);
  console.log(`  unmatched  ${unmatched.length}   → skipped`);

  if (ambiguous.length) {
    console.log(`\nAMBIGUOUS — more than one lesson fits, so nothing was attached:`);
    for (const a of ambiguous) {
      console.log(`  [${a.row.sheet}] ${a.row.section} › ${a.row.lesson_name}`);
      console.log(`      ${a.row.video_url}`);
      for (const h of a.hits) console.log(`      candidate: ${h.path}`);
    }
  }

  if (unmatched.length) {
    console.log(`\nUNMATCHED — no lesson fits:`);
    for (const u of unmatched) {
      console.log(`  [${u.row.sheet}] ${u.row.section} › ${u.row.lesson_name}`);
      console.log(`      ${u.row.video_url}   (${u.reason})`);
    }
  }

  if (!apply) {
    console.log(
      `\nDRY RUN — nothing written. Re-run with --apply to set ${toWrite.length} lesson${toWrite.length === 1 ? "" : "s"}.`
    );
    return;
  }

  let written = 0;
  let failed = 0;
  for (const m of toWrite) {
    try {
      /*
        THE RAW URL, not our normalised ref. `setLessonUrl` normalises what it
        is given, and normalising twice used to annihilate the unlisted-video
        hash form — 243 of 304 rows were rejected as "not a Vimeo link" on the
        first apply. `normalizeVimeoRef` is now idempotent, so either would
        work; passing the raw value keeps this script out of the business of
        deciding what the column holds, which is `setLessonUrl`'s job.
      */
      await setLessonUrl(m.hit.id, m.raw);
      written++;
    } catch (e) {
      failed++;
      console.error(
        `  FAILED ${m.hit.path}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  console.log(`\nWROTE ${written} lesson${written === 1 ? "" : "s"}.`);
  if (failed) console.log(`${failed} failed — see above.`);

  const playable = await prisma.lesson.count({
    where: {
      NOT: { vimeo_ref: null },
      production_status: {
        in: ["URL_ADDED_TO_LESSON", "BLOG_CREATED", "BLOG_RELEASED"] as never,
      },
    },
  });
  console.log(`Lessons now playable: ${playable} of ${lessons.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
