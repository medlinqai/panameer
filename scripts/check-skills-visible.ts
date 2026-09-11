/**
 * `check:skills-visible` — imported skills survive to the step, and the
 * at-least-one rule still holds on all three layers (`P1-A1.4-E416` WS-2).
 * `npm run check:skills-visible`.
 *
 * ── ⚠⚠ WHAT WENT WRONG, SO NOBODY UNDOES IT ────────────────────────────────
 *
 * `ProviderSkill.source` defaults to `DERIVED`. The import wrote its matched
 * skills with NO `source`, then called `recomputeProviderRollup` a few lines
 * later — which deletes every `DERIVED` row and rebuilds only what a job with a
 * `software_suite` can account for. ⚠ THE IMPORT DESTROYED ITS OWN WRITE IN THE
 * SAME REQUEST. Measured: `test22@panameer.com` had five parsed imports
 * reporting 40–90 skills and ZERO rows; a provider whose résumé supplied skills
 * arrived at step 4/8 with none and could not pass the at-least-one rule.
 *
 * ⚠⚠ THE ROLLUP IS NOT THE BUG AND MUST NOT BE "FIXED". Scott, 2026-09-11:
 * *"Do NOT change the rollup — its deletion is correct and the escape hatch
 * depends on it."* §2 pins it.
 *
 * ⚠ NO MODEL CALL, NO DATABASE, NO BROWSER — text scans only.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
const read = (...p: string[]) => strip(readFileSync(join(...p), "utf8"));

const IMPORT = read("src", "lib", "resume", "import.ts");
const ROLLUP = read("src", "lib", "provider-rollup.ts");
const ONBOARD = read("src", "lib", "onboarding.ts");
const WIZ = read("src", "app", "join", "provider", "page.tsx");

/* ═══ 0 · PROVE THE STRIP ═════════════════════════════════════════════════ */
{
  check("0 — a JSX comment is stripped", !/ghostTok/.test(strip("{/* ghostTok */} real")));
  check("0 — a block comment is stripped", !/ghostTok/.test(strip("/* ghostTok */ real")));
  check("0 — a line comment is stripped", !/ghostTok/.test(strip("// ghostTok\nreal")));
  check("0 — live code survives", /realTok/.test(strip("{/* ghostTok */} realTok")));
  check(
    "0 — a neutralised close sequence does not end a comment early",
    !/ghostTok/.test(strip("{/* was: <X a={1} * / /> ghostTok */} realTok")),
    "E408"
  );
  /* ⚠⚠ PROTECTS §1: `import.ts` quotes the superseded source-less write in prose. */
  check(
    "0 — ⚠⚠ the superseded source-less write is invisible",
    !/data: toAdd\.map\(\(m\) => \(\{\s*provider_profile_id: profileId,\s*skill_id: m\.id,\s*\}\)\),/.test(IMPORT),
    "import.ts quotes the old shape inside a comment"
  );
}

/* ═══ 1 · ⚠⚠ THE IMPORT'S SKILLS SURVIVE THE ROLLUP ══════════════════════
   Mutate: drop the `source` → red.                                         */
{
  check(
    "1 — ⚠⚠ imported skills are written SELF_ADDED",
    /source: "SELF_ADDED" as const,/.test(
      IMPORT.slice(IMPORT.indexOf("providerSkill.createMany"), IMPORT.indexOf("providerSkill.createMany") + 400)
    ),
    "DERIVED is deleted by the next line — it was never the honest value here"
  );
  check(
    "1 — ⚠ and carry SELF_ADDED_WEIGHT",
    /weight: SELF_ADDED_WEIGHT,/.test(
      IMPORT.slice(IMPORT.indexOf("providerSkill.createMany"), IMPORT.indexOf("providerSkill.createMany") + 400)
    ),
    "at the 0 default they are hidden by getOnboardingState's rollup filter"
  );
  check("1 — the constant is imported, not re-typed", /SELF_ADDED_WEIGHT.*from "@\/lib\/provider-rollup"/.test(IMPORT));
  /* ⚠ THE SAME PAIR THE SKILLS STEP ALREADY WRITES — one meaning, two writers. */
  check(
    "1 — ⚠ it matches what the skills STEP writes",
    /source: "SELF_ADDED" as const,\s*weight: SELF_ADDED_WEIGHT,/.test(ONBOARD),
    "the step and the import must mean the same thing by a typed skill"
  );
}

/* ═══ 2 · ⚠⚠ THE ROLLUP IS UNTOUCHED ════════════════════════════════════
   Scott: "its deletion is correct and the escape hatch depends on it."
   Mutate: weaken the delete → red.                                         */
{
  check(
    "2 — ⚠⚠ the rollup still clears DERIVED rows",
    /\{ source: "DERIVED" \}/.test(ROLLUP),
    "a rebuild that does not clear is not a rebuild"
  );
  check(
    "2 — ⚠⚠ and still supersedes a SELF_ADDED row a job now derives",
    /\{ source: "SELF_ADDED", skill_id: \{ in: derivedIds \} \}/.test(ROLLUP),
    "the job is the better evidence — an imported skill is upgraded, not duplicated"
  );
  check("2 — the delete is still scoped to one profile", /provider_profile_id: providerProfileId,/.test(ROLLUP));
}

/* ═══ 3 · ⚠⚠ AT LEAST ONE SKILL — ALL THREE LAYERS STAY ═════════════════
   Mutate any one → red. `E416` is NOT a removal.                           */
{
  check(
    "3 — ⚠⚠ SERVER: the step handler still throws on an empty payload",
    /if \(skillIds\.length === 0\) \{\s*throw new OnboardingError\("Pick at least one skill", "INVALID"\);/.test(ONBOARD)
  );
  check(
    "3 — ⚠⚠ STEP: Continue is gated on something being picked",
    /canSave: totalPicked > 0,/.test(WIZ)
  );
  check("3 — and the shell consumes it", /continueDisabled: !ed\.canSave,/.test(WIZ));
  check(
    "3 — ⚠⚠ REVIEW EDITOR: the same condition, neither stricter nor looser",
    /editSection === "skills"\s*\?\s*profile\.skillIds\.length \+ profile\.customSkills\.length > 0/.test(WIZ),
    "the step and the review must not disagree about who may continue"
  );
  /* ⚠ THE TWO CLIENT LAYERS COUNT THE SAME TWO THINGS. */
  check(
    "3 — ⚠ the step counts skillIds + customSkills",
    /const totalPicked = profile\.skillIds\.length \+ profile\.customSkills\.length;/.test(WIZ)
  );
}

/* ═══ 4 · ⚠ THE CHIPS COME FROM THE ROWS, UNFILTERED ════════════════════
   If this ever gained a filter, surviving rows would stop rendering and the
   defect would come back wearing a different hat.                          */
{
  check("4 — skillIds maps every row", /skillIds: pp\.skills\.map\(\(s\) => s\.skill_id\),/.test(ONBOARD));
  check(
    "4 — skillNames maps every row",
    /skillNames: pp\.skills\.map\(\(s\) => \(\{ id: s\.skill_id, name: s\.skill\.name \}\)\),/.test(ONBOARD)
  );
  /* ⚠ THE `weight > 0 || SELF_ADDED` FILTER IS ON `rollup.skills` ONLY — a
     different field, and it must stay off this path. */
  check(
    "4 — ⚠ ABSENCE: no weight/source filter on the chip path",
    !/skillIds: pp\.skills\s*\.filter/.test(ONBOARD) && !/skillNames: pp\.skills\s*\.filter/.test(ONBOARD)
  );
}

if (failures.length) {
  console.error(`\ncheck:skills-visible — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:skills-visible — ${pass}/${pass} passed`);
