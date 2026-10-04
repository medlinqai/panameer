import { readFileSync as rawRead, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

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
const EXEMPT = new Set([
  relative(ROOT, join(ROOT, "scripts", "check-derived-source.ts")),
  join("scripts", "check-skills-visible.ts"),
  join("src", "lib", "provider-rollup.test.ts"),
]);

console.log("\ncheck:derived-source — only the rollup may write DERIVED\n");

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
   ⚠⚠ THE EXEMPTION IS GONE (`P2-J1.4-E517`, 2026-09-17). ⚠ SUPERSEDED, quoted
   not deleted (`E164`): *"ONE EXEMPTION, AND IT IS DELIBERATE: `E517`'s ROLE
   PRUNE deletes by `role_type_id` regardless of source. Scott ruled that
   deletion correct on 2026-09-11."*
   ⚠ THAT PRUNE NO LONGER DELETES ANYTHING — the role filter moved to the READ
   (`lib/shown-skills.ts`), so there is nothing left to exempt. ⚠⚠ Scott:
   *"REMOVING it is a tightening and I want it."* Every `providerSkill.deleteMany`
   in `src/` is now scoped by `source`, with no exceptions. ⚠ A new unscoped
   delete is a STOP AND REPORT, never a quiet re-exemption.                     */
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
      if (!/\bsource\s*:/.test(call)) {
        offenders.push(`${f}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
  }
  check(
    "4 — ⚠⚠ every providerSkill deleteMany outside the rollup is scoped by `source`, with NO exemption (E517)",
    offenders.length === 0,
    offenders.join(" · ")
  );
}

if (failures.length > 0) {
  console.error(`\ncheck:derived-source — ${failures.length} FAILED, ${pass} passed\n`);
  process.exit(1);
}
console.log(`\ncheck:derived-source — ${pass}/${pass} passed\n`);
