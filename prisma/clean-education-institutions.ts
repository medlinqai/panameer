/**
 * ONE-TIME BACKFILL — scrub `Education.institution` (WS-3, 2026-08-13).
 *
 * The résumé parser has been writing degrees, fields, GPA fragments and plain
 * accomplishment bullets into the column that is supposed to hold a school
 * name. `scrubInstitution` (src/lib/resume/ai-extract.ts) fixes that going
 * forward, but a parser fix cannot reach a row that was imported last month —
 * and the public talent card reads this column. This is the pass over what is
 * already stored.
 *
 * SAME FUNCTION AS THE PARSER, IMPORTED not re-implemented. A backfill with its
 * own private copy of the cleaning rules is a second source of truth that
 * starts drifting the day either one is edited, and then "cleaned" means two
 * different things depending on when a row arrived.
 *
 * ── THE RULES IT OBEYS ───────────────────────────────────────────────────────
 *
 *   · NEVER fabricates. A school name only ever comes out of the string that
 *     was already there. Nothing is inferred from the person, their employers,
 *     their other education rows, or anything else.
 *   · Blank beats wrong. When no school survives the scrub, the institution is
 *     emptied — the card then shows two pedigree items instead of three, which
 *     is a missing fact rather than a false one.
 *   · Loses nothing silently. Text evicted from the column is refiled into
 *     `degree` (when it is a qualification) or `description` (when it is
 *     anything else), and is dropped ONLY when it duplicates a value the row
 *     already carries.
 *
 * ── DRY RUN BY DEFAULT ───────────────────────────────────────────────────────
 *
 *   npm run db:clean-education            # prints every change, writes nothing
 *   npm run db:clean-education -- --apply # writes
 *
 * A destructive pass over a column you cannot reconstruct should have to be
 * asked for twice.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { scrubInstitution, fixEducationRow } from "../src/lib/resume/ai-extract";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const APPLY = process.argv.includes("--apply");

type Bucket = "unchanged" | "cleaned" | "blanked" | "empty";

async function main() {
  const rows = await prisma.education.findMany({
    select: {
      id: true,
      institution: true,
      degree: true,
      field: true,
      description: true,
      providerProfile: { select: { person: { select: { first_name: true } } } },
    },
    orderBy: { created_at: "asc" },
  });

  const counts: Record<Bucket, number> = {
    unchanged: 0,
    cleaned: 0,
    blanked: 0,
    empty: 0,
  };
  const writes: { id: string; data: Record<string, string | null> }[] = [];

  for (const r of rows) {
    const before = r.institution ?? "";
    if (!before.trim()) {
      counts.empty++;
      continue;
    }

    const { institution, salvage } = scrubInstitution(before);

    /*
      Refiling is `fixEducationRow`'s job, so it is asked rather than copied.
      It is fed this row's CURRENT degree/field so a salvage that merely repeats
      what is already recorded is recognised as a duplicate and dropped.
    */
    const fixed = fixEducationRow({
      institution: before,
      degree: r.degree,
      field: r.field,
    });

    const bucket: Bucket =
      institution === before
        ? "unchanged"
        : institution
          ? "cleaned"
          : "blanked";
    counts[bucket]++;
    if (bucket === "unchanged") continue;

    /*
      `description` is APPENDED to, never overwritten — `fixEducationRow`
      builds a fresh row and always starts description at null, so taking its
      value wholesale would erase a note the provider typed themselves.
    */
    const description =
      fixed.description && r.description
        ? `${r.description}\n${fixed.description}`
        : (fixed.description ?? r.description);

    const data: Record<string, string | null> = { institution };
    if (fixed.degree !== r.degree) data.degree = fixed.degree;
    if (description !== r.description) data.description = description;

    const who = r.providerProfile.person.first_name;
    const moved = [
      data.degree !== undefined ? `degree <- "${data.degree}"` : null,
      data.description !== undefined ? `description <- "${fixed.description}"` : null,
      salvage && data.degree === undefined && data.description === undefined
        ? `dropped "${salvage}" (duplicate)`
        : null,
    ].filter(Boolean);

    console.log(
      `${bucket.toUpperCase().padEnd(8)} ${who.padEnd(9)} "${before}"\n` +
        `         -> "${institution}"${moved.length ? `   [${moved.join(", ")}]` : ""}`
    );
    writes.push({ id: r.id, data });
  }

  if (APPLY) {
    for (const w of writes) {
      await prisma.education.update({ where: { id: w.id }, data: w.data });
    }
  }

  console.log(
    `\n${rows.length} education rows — ` +
      `${counts.cleaned} cleaned, ${counts.blanked} blanked, ` +
      `${counts.unchanged} already clean, ${counts.empty} already empty.`
  );
  console.log(
    APPLY
      ? `WROTE ${writes.length} rows.`
      : `DRY RUN — ${writes.length} rows would change. Re-run with --apply.`
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
