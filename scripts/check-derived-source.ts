/**
 * `check:derived-source` — ⚠⚠ ONLY THE ROLLUP MAY WRITE `source: DERIVED`.
 *
 *   npm run check:derived-source
 *
 * ── ⚠⚠⚠ WHY THIS GATE EXISTS (`P1-A1.4-E553`) ──────────────────────────────
 *
 * `recomputeProviderRollup` DELETES every `DERIVED` row for a profile and then
 * rebuilds only those a dated, skill-linked job can support. That is correct and
 * deliberate: a recompute that left rows it can no longer justify would let a
 * skill outlive the job that proved it, and the number stops meaning anything.
 *
 * ⚠⚠ IT RESTS ON ONE ASSUMPTION — **`DERIVED` MEANS "THE ROLLUP WROTE THIS"** —
 * AND THAT ASSUMPTION WAS FALSE. `ProviderSkill.source` DEFAULTS TO `DERIVED`, so
 * every writer that omitted the field minted a row the rollup would later delete
 * and could never rebuild. ⚠ MEASURED 2026-09-17: **297 such rows across 51
 * profiles**, including two protected lesson-holders who would have lost every
 * skill they had (Marelise 16 of 16, Linus 15 of 15).
 *
 * ⚠ Scott, 2026-09-17: *"A SAVE DELETES DATA IT DID NOT CREATE."* That is the rule
 * both `E553` and `E552` break, and this gate is what keeps `E553` shut — the
 * backfill repairs history, the guard stops it refilling. ⚠⚠ **GUARD FIRST,
 * BACKFILL SECOND** (the `E535` order: stop the bleeding, then clean up).
 *
 * ⚠ MUTATION TEST: delete `source: "SELF_ADDED"` from any writer below, or write
 * `source: "DERIVED"` anywhere outside `provider-rollup.ts`, and this goes red.
 */
import { readFileSync as rawRead, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/*
  ⚠⚠ COMMENTS ARE STRIPPED BEFORE SCANNING, AND THAT IS LOAD-BEARING HERE.
  This codebase quotes superseded code in comments by house rule (`E164`) — the
  skills step carries the exact `deleteMany` this gate forbids, as a quote of what
  it replaced. Scanning raw text flagged the QUOTE and not the code, which is the
  same trap `check:company-binding` documents.
*/
const readFileSync = (p: string): string =>
  rawRead(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const ROOT = process.cwd();
const ROLLUP = join("src", "lib", "provider-rollup.ts");

let pass = 0;
const failures: string[] = [];
const check = (label: string, cond: boolean, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

/** Every .ts/.tsx under the directories that can reach the database. */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) continue;
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) walk(rel, out);
    else if (/\.tsx?$/.test(name)) out.push(rel);
  }
  return out;
}

const files = ["src", "prisma", "scripts"].flatMap((d) => walk(d));
/* ⚠ The gate's own source quotes the literal it forbids; so does the rollup's
   test. Neither is a writer. */
const EXEMPT = new Set([
  relative(ROOT, join(ROOT, "scripts", "check-derived-source.ts")),
  join("scripts", "check-skills-visible.ts"),
  join("src", "lib", "provider-rollup.test.ts"),
]);

console.log("\ncheck:derived-source — only the rollup may write DERIVED\n");

/* ═══ 1 · EVERY WRITER NAMES ITS SOURCE ════════════════════════════════════
   A `providerSkill` create/upsert that omits `source` inherits the schema
   default — which is `DERIVED`. That is how all 297 rows were minted.        */
{
  const offenders: string[] = [];
  for (const f of files) {
    if (f === ROLLUP || EXEMPT.has(f)) continue;
    const src = readFileSync(join(ROOT, f));
    const re = /providerSkill\s*\.\s*(create|createMany|upsert)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      /* The call's own text: from the match to the balanced close paren. */
      let depth = 0;
      let i = m.index + m[0].length - 1;
      const start = i;
      for (; i < src.length; i++) {
        if (src[i] === "(") depth++;
        else if (src[i] === ")") {
          depth--;
          if (depth === 0) break;
        }
      }
      const call = src.slice(start, i + 1);
      if (!/\bsource\s*:/.test(call)) {
        offenders.push(`${f}:${src.slice(0, m.index).split("\n").length} (${m[1]})`);
      }
    }
  }
  check(
    "1 — ⚠⚠ every providerSkill writer outside the rollup names its `source`",
    offenders.length === 0,
    offenders.join(" · ")
  );
}

/* ═══ 2 · THE LITERAL IS THE ROLLUP'S ALONE ════════════════════════════════ */
{
  const offenders = files.filter(
    (f) => f !== ROLLUP && !EXEMPT.has(f) && /source\s*:\s*"DERIVED"/.test(readFileSync(join(ROOT, f)))
  );
  check(
    '2 — ⚠⚠ `source: "DERIVED"` is written ONLY by provider-rollup.ts',
    offenders.length === 0,
    offenders.join(" · ")
  );
}

/* ═══ 3 · AND THE ROLLUP STILL DOES IT ═════════════════════════════════════
   ⚠ Without this, deleting the feature would satisfy §2.                     */
{
  const rollup = readFileSync(join(ROOT, ROLLUP));
  check(
    "3 — the rollup still writes DERIVED rows",
    /source:\s*"DERIVED"/.test(rollup)
  );
  check(
    "3 — ⚠ and still clears only DERIVED (plus upgraded SELF_ADDED) rows",
    /\{ source: "DERIVED" \}/.test(rollup) && /source: "SELF_ADDED", skill_id: \{ in: derivedIds \}/.test(rollup)
  );
}

/* ═══ 4 · ⚠⚠ A SAVE MUST NOT DELETE ROWS IT DOES NOT OWN (`P1-A1.4-E552`) ══
   The skills step deleted EVERY ProviderSkill row for the profile — including
   the rollup's, with their months. Any `deleteMany` outside the rollup must be
   scoped by `source`, so it can only remove what that writer created.
   ⚠ ONE EXEMPTION, AND IT IS DELIBERATE: `E517`'s ROLE PRUNE deletes by
   `role_type_id` regardless of source. Scott ruled that deletion correct on
   2026-09-11 — its defect is that it is SILENT, which is `E517`, not this.     */
{
  const offenders: string[] = [];
  /* ⚠ APP CODE ONLY. A gate or a dev script deleting its own throwaway probe
     profile owns every row on it — `check:cert-skills`, `check:role-prune` and
     `dev-reset-resume` all do exactly that. */
  for (const f of files.filter((x) => x.startsWith("src"))) {
    if (f === ROLLUP || EXEMPT.has(f)) continue;
    const src = readFileSync(join(ROOT, f));
    const re = /providerSkill\s*\.\s*deleteMany\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      let depth = 0;
      let i = m.index + m[0].length - 1;
      const start = i;
      for (; i < src.length; i++) {
        if (src[i] === "(") depth++;
        else if (src[i] === ")") { depth--; if (depth === 0) break; }
      }
      const call = src.slice(start, i + 1);
      const isRolePrune = /role_type_id:\s*\{\s*notIn/.test(call);
      if (!/\bsource\s*:/.test(call) && !isRolePrune) {
        offenders.push(`${f}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
  }
  check(
    "4 — ⚠⚠ every providerSkill deleteMany outside the rollup is scoped by `source` (or is E517's role prune)",
    offenders.length === 0,
    offenders.join(" · ")
  );
}

if (failures.length > 0) {
  console.error(`\ncheck:derived-source — ${failures.length} FAILED, ${pass} passed\n`);
  process.exit(1);
}
console.log(`\ncheck:derived-source — ${pass}/${pass} passed\n`);
