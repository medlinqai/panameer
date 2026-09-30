/**
 * ── ⚠⚠⚠ `P2-A2-E725` item 2 — SPLIT THE POLLUTED LANGUAGE NAMES ─────────────────────────
 *
 * ⚠ **SCOTT, 2026-09-30: *"split the polluted names ('Spanish Native' → Spanish · Native,
 * 'German Basic' → German · Beginner, etc.). Leave 'English Advanced intermediate' untouched
 * and report it. Show every row before and after."***
 *
 * ── ⚠⚠ WHY THESE ROWS EXIST ─────────────────────────────────────────────────────────────
 *
 * ⚠ Both boxes were free text (`E723` fixed that), so the proficiency was typed into the NAME
 * field. **All three affected rows have `level: null` and `proficiency: null`** — the
 * proficiency is in the name and nowhere else, which is why they cannot simply be renamed.
 *
 * ── ⚠⚠⚠ IT SPLITS ONLY WHAT IT CAN NAME, AND REPORTS THE REST ───────────────────────────
 *
 * ⚠⚠ **THE RULE IS: the name must end in a word this codebase already maps to a
 * proficiency**, via `mapLegacyProficiency` — the SAME function `E723` wrote, not a second
 * matcher (`E585`). ⚠⚠⚠ **ANYTHING ELSE IS LEFT ALONE AND PRINTED.** `"English Advanced
 * intermediate"` is not obviously any of the five, Scott said so explicitly, and a guessed
 * proficiency is a claim about a person's competence on the page Panameer sells on.
 * ⚠ **AND THE REMAINING NAME MUST BE A REAL ISO 639-1 LANGUAGE.** `"Spanish Native"` splits
 * only because `Spanish` is in `WORLD_LANGUAGES`; a row like `"Klingon Fluent"` would be
 * reported, not written.
 *
 * ⚠⚠ RUN: bundle with esbuild, then `node … [--apply]`. **Without `--apply` it only prints.**
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync } from "node:fs";
import { LANGUAGE_NAMES, mapLegacyProficiency, PROFICIENCY_LABEL } from "@/lib/languages";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
const UNDO = "prisma/repairs/E725-undo-2026-09-30.json";

/**
 * ⚠ Try to read `"<Language> <Proficiency>"`, longest proficiency tail first.
 * ⚠⚠ Returns `null` unless BOTH halves are recognised — no partial credit.
 */
function split(name: string): { language: string; level: string } | null {
  const words = name.trim().split(/\s+/);
  /* ⚠ Tails of up to three words, so "Native or Bilingual" is reachable. */
  for (let take = 1; take <= 3 && take < words.length; take++) {
    const tail = words.slice(words.length - take).join(" ");
    const head = words.slice(0, words.length - take).join(" ");
    const level = mapLegacyProficiency(tail);
    if (level && LANGUAGE_NAMES.has(head)) return { language: head, level };
  }
  return null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const all = await prisma.language.findMany({
    select: { id: true, provider_profile_id: true, name: true, proficiency: true, level: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  console.log(`═══ EVERY Language ROW BEFORE (${all.length}) ═══`);
  /* ⚠ Grouped, because 59 of them are `E724`'s identical backfill and listing each would
     bury the three rows this repair is about. */
  const grouped = new Map<string, number>();
  for (const r of all) {
    const k = `${JSON.stringify(r.name)} · level=${JSON.stringify(r.level)} · proficiency=${JSON.stringify(r.proficiency)}`;
    grouped.set(k, (grouped.get(k) ?? 0) + 1);
  }
  for (const [k, n] of [...grouped].sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(3)} × ${k}`);

  /* ⚠⚠ A CANDIDATE IS A ROW WHOSE NAME IS NOT A KNOWN LANGUAGE. That is the population —
     not "rows I noticed", which is how a repair misses one. */
  const suspect = all.filter((r) => !LANGUAGE_NAMES.has(r.name));
  console.log(`\n═══ NAMES THAT ARE NOT A KNOWN LANGUAGE: ${suspect.length} ═══`);
  const planned: { id: string; from: string; language: string; level: string }[] = [];
  const left: { id: string; name: string; why: string }[] = [];
  for (const r of suspect) {
    const s = split(r.name);
    if (s) {
      planned.push({ id: r.id, from: r.name, language: s.language, level: s.level });
      console.log(`   SPLIT  ${JSON.stringify(r.name).padEnd(34)} → ${s.language} · ${PROFICIENCY_LABEL[s.level]} (${s.level})`);
    } else {
      const why = "no trailing word maps to one of the five proficiencies, or the remainder is not an ISO 639-1 language";
      left.push({ id: r.id, name: r.name, why });
      console.log(`   LEAVE  ${JSON.stringify(r.name).padEnd(34)} → ${why}`);
    }
  }

  if (!apply) {
    console.log(`\nDRY RUN — nothing written. ${planned.length} would split, ${left.length} left alone.`);
    return;
  }
  if (planned.length === 0) {
    console.log("\nNOTHING TO DO — no splittable rows. Undo file left untouched.");
    return;
  }

  /* ⚠ UNDO FIRST, and only when there is something to undo (`E724`'s lesson, same day). */
  writeFileSync(UNDO, JSON.stringify({ wroteAt: new Date().toISOString(), brief: "P2-A2-E725 item 2",
    note: "Restore each row's `name` to `from` and set level/proficiency back to null.",
    rows: planned, leftAlone: left }, null, 2));
  console.log(`\nUNDO written to ${UNDO} (${planned.length} rows)`);

  for (const p of planned) {
    await prisma.language.update({
      where: { id: p.id },
      /* ⚠⚠ `proficiency` IS MIRRORED, as every other writer does, so pre-`brief_P` readers
         keep rendering a word. `level` is the canonical value. */
      data: { name: p.language, level: p.level as never, proficiency: PROFICIENCY_LABEL[p.level] },
    });
  }

  const after = await prisma.language.findMany({
    where: { id: { in: [...planned.map((p) => p.id), ...left.map((l) => l.id)] } },
    select: { id: true, name: true, level: true, proficiency: true },
    orderBy: { name: "asc" },
  });
  console.log(`\n═══ AFTER — the rows this repair looked at ═══`);
  for (const r of after)
    console.log(`   ${JSON.stringify(r.name).padEnd(34)} level=${JSON.stringify(r.level).padEnd(22)} proficiency=${JSON.stringify(r.proficiency)}`);
  const stillSuspect = (await prisma.language.findMany({ select: { name: true } }))
    .filter((r) => !LANGUAGE_NAMES.has(r.name));
  console.log(`\nSTILL not a known language: ${stillSuspect.length} → ${stillSuspect.map((s) => JSON.stringify(s.name)).join(", ") || "none"}`);
}

main().finally(() => prisma.$disconnect());
