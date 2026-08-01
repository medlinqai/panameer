import { prisma } from "@/lib/prisma";
import { normalizeVimeoRef } from "@/lib/learn-admin";

/**
 * Bulk video-URL load from CSV (brief_learn_admin_authoring WS5).
 *
 * THE GOVERNING RULE, inherited from the Archive-Scott join that was killed
 * during the catalog import: NEVER GUESS-ATTACH. A row that matches one lesson
 * confidently is filled; a row that matches several, or none, is REPORTED and
 * left alone. Attaching the wrong video to a lesson is worse than leaving it
 * empty, because "coming soon" is visibly incomplete and a wrong video looks
 * finished — nobody goes looking for it.
 *
 * Matching accepts either a lesson id or a title path, because the two callers
 * are different people: an export from this console has ids, and a hand-built
 * spreadsheet has the titles someone can actually read.
 */

export type BulkRow = {
  line: number;
  identifier: string;
  url: string;
};

export type BulkMatch = {
  row: BulkRow;
  outcome: "matched" | "ambiguous" | "unmatched" | "invalid-url" | "unchanged";
  lessonId?: string;
  /** Human-readable path to the lesson, for the preview table. */
  lessonPath?: string;
  normalizedRef?: string;
  /** Every candidate, when ambiguous — so the admin can see what to disambiguate. */
  candidates?: { id: string; path: string }[];
  note?: string;
};

export type BulkPlan = {
  rows: number;
  matched: number;
  ambiguous: number;
  unmatched: number;
  invalid: number;
  unchanged: number;
  matches: BulkMatch[];
};

/**
 * A minimal RFC-4180 reader: quoted fields, doubled quotes, embedded commas and
 * newlines. Written rather than pulled in because the format we accept is two
 * columns wide and a dependency for that is more surface than it saves.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      // Swallow CRLF as one break.
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalise a title for comparison — case, whitespace and stray punctuation. */
function key(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

type LessonIndexRow = {
  id: string;
  title: string;
  sectionTitle: string;
  courseTitle: string;
  pathTitle: string;
  vimeoRef: string | null;
};

async function loadIndex(): Promise<LessonIndexRow[]> {
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
  return lessons.map((l) => ({
    id: l.id,
    title: l.title,
    sectionTitle: l.section.title,
    courseTitle: l.section.course.title,
    pathTitle: l.section.course.learningPath.title,
    vimeoRef: l.vimeo_ref,
  }));
}

const fullPath = (r: LessonIndexRow) =>
  `${r.pathTitle} › ${r.courseTitle} › ${r.sectionTitle} › ${r.title}`;

/**
 * Work out what a CSV would do, WITHOUT writing anything.
 *
 * Separating the plan from the apply is the whole safety story: the admin sees
 * matched / ambiguous / unmatched counts and the actual lesson each row would
 * touch before a single write happens.
 */
export async function planBulkUrls(csv: string): Promise<BulkPlan> {
  const grid = parseCsv(csv);
  if (grid.length === 0) {
    return { rows: 0, matched: 0, ambiguous: 0, unmatched: 0, invalid: 0, unchanged: 0, matches: [] };
  }

  // Drop a header row if it looks like one rather than data.
  const first = grid[0].map((c) => key(c));
  const hasHeader =
    first.some((c) => /lesson|identifier|title|path|id/.test(c)) &&
    first.some((c) => /url|vimeo|video|link/.test(c));
  const dataRows = hasHeader ? grid.slice(1) : grid;

  const index = await loadIndex();

  // Pre-build the lookup tables once — a 500-row CSV against 522 lessons would
  // otherwise be a quarter of a million string comparisons.
  const byId = new Map(index.map((r) => [r.id, r]));
  const byTitle = new Map<string, LessonIndexRow[]>();
  const byFullPath = new Map<string, LessonIndexRow[]>();
  for (const r of index) {
    const t = key(r.title);
    if (!byTitle.has(t)) byTitle.set(t, []);
    byTitle.get(t)!.push(r);

    // Accept several separators so a hand-typed path still lands.
    for (const sep of [" › ", " > ", " / ", " | "]) {
      const p = key(
        [r.pathTitle, r.courseTitle, r.sectionTitle, r.title].join(sep)
      );
      if (!byFullPath.has(p)) byFullPath.set(p, []);
      if (!byFullPath.get(p)!.includes(r)) byFullPath.get(p)!.push(r);
    }
  }

  const matches: BulkMatch[] = [];

  for (const [i, cells] of dataRows.entries()) {
    const identifier = (cells[0] ?? "").trim();
    const url = (cells[1] ?? "").trim();
    const row: BulkRow = { line: i + (hasHeader ? 2 : 1), identifier, url };

    if (!identifier && !url) continue;

    if (!url) {
      matches.push({ row, outcome: "invalid-url", note: "No URL in this row." });
      continue;
    }
    const normalized = normalizeVimeoRef(url);
    if (!normalized) {
      matches.push({
        row,
        outcome: "invalid-url",
        note: "Not a Vimeo link or id we can play.",
      });
      continue;
    }

    let candidates: LessonIndexRow[] = [];
    if (UUID.test(identifier)) {
      const hit = byId.get(identifier);
      candidates = hit ? [hit] : [];
    } else {
      candidates = byFullPath.get(key(identifier)) ?? byTitle.get(key(identifier)) ?? [];
    }

    if (candidates.length === 0) {
      matches.push({
        row,
        outcome: "unmatched",
        note: UUID.test(identifier)
          ? "No lesson has that id."
          : "No lesson has that title. Use the full Path › Course › Section › Lesson path, or the lesson id.",
      });
      continue;
    }

    if (candidates.length > 1) {
      matches.push({
        row,
        outcome: "ambiguous",
        note: `${candidates.length} lessons share that title. Use the full path or the lesson id.`,
        candidates: candidates.slice(0, 8).map((c) => ({ id: c.id, path: fullPath(c) })),
      });
      continue;
    }

    const hit = candidates[0];
    if (hit.vimeoRef === normalized) {
      matches.push({
        row,
        outcome: "unchanged",
        lessonId: hit.id,
        lessonPath: fullPath(hit),
        normalizedRef: normalized,
        note: "Already set to this URL.",
      });
      continue;
    }

    matches.push({
      row,
      outcome: "matched",
      lessonId: hit.id,
      lessonPath: fullPath(hit),
      normalizedRef: normalized,
      note: hit.vimeoRef ? `Replaces the current URL (${hit.vimeoRef}).` : undefined,
    });
  }

  const count = (o: BulkMatch["outcome"]) => matches.filter((m) => m.outcome === o).length;
  return {
    rows: matches.length,
    matched: count("matched"),
    ambiguous: count("ambiguous"),
    unmatched: count("unmatched"),
    invalid: count("invalid-url"),
    unchanged: count("unchanged"),
    matches,
  };
}

/**
 * Apply a plan — CONFIDENT MATCHES ONLY.
 *
 * Re-plans from the CSV rather than trusting a client-supplied list of lesson
 * ids. The preview the admin approved was computed server-side; letting the
 * browser hand back "these ids, these URLs" would make the confirm step
 * decorative, and this endpoint could then write anywhere in the catalog.
 */
export async function applyBulkUrls(csv: string): Promise<BulkPlan & { applied: number }> {
  const plan = await planBulkUrls(csv);

  /*
    Deduplicate by lesson before writing. A CSV can name the same lesson twice —
    once by title path and once by id, which is exactly what happens when two
    exports are pasted together — and both rows are legitimately "matched". Left
    alone that puts two updates for one row in the transaction and, worse,
    reports "filled 3 lessons" when three rows touched two. Last row wins, which
    matches how a person reading top-to-bottom would expect a later correction to
    override an earlier line.
  */
  const byLesson = new Map<string, BulkMatch>();
  for (const m of plan.matches) {
    if (m.outcome === "matched" && m.lessonId) byLesson.set(m.lessonId, m);
  }
  const writes = [...byLesson.values()];

  // Advance the ladder with the URL, for the same reason setLessonUrl does:
  // a URL that doesn't make the lesson play is a filled field and no result.
  await prisma.$transaction(
    writes.map((m) =>
      prisma.lesson.update({
        where: { id: m.lessonId! },
        data: {
          vimeo_ref: m.normalizedRef!,
          production_status: "URL_ADDED_TO_LESSON",
          is_custom: true,
        },
      })
    )
  );

  console.info(
    `[learn-bulk] applied=${writes.length} ambiguous=${plan.ambiguous} ` +
      `unmatched=${plan.unmatched} invalid=${plan.invalid} unchanged=${plan.unchanged}`
  );

  return { ...plan, applied: writes.length };
}
