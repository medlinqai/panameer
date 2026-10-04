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
const WIZ = [
  read("src", "app", "join", "provider", "page.tsx"),
  read("src", "components", "onboarding", "editors", "SkillsEditor.tsx"),
].join("\n");

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
  check(
    "0 — ⚠⚠ the superseded source-less write is invisible",
    !/data: toAdd\.map\(\(m\) => \(\{\s*provider_profile_id: profileId,\s*skill_id: m\.id,\s*\}\)\),/.test(IMPORT),
    "import.ts quotes the old shape inside a comment"
  );
}

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
  check(
    "1 — ⚠ it matches what the skills STEP writes",
    /source: "SELF_ADDED" as const,\s*weight: SELF_ADDED_WEIGHT,/.test(ONBOARD),
    "the step and the import must mean the same thing by a typed skill"
  );
}

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

{
  check(
    "3 — ⚠⚠ SERVER: the step handler still throws on an empty payload",
    /if \(skillIds\.length === 0\) \{\s*throw new OnboardingError\("Pick at least one skill", "INVALID"\);/.test(ONBOARD)
  );
  check(
    "3 — ⚠⚠ STEP: Continue is gated on something being picked",
    /canSave: profile\.skillIds\.length \+ profile\.customSkills\.length > 0,/.test(WIZ)
  );
  check("3 — and the shell consumes it", /continueDisabled: !ed\.canSave,/.test(WIZ));
  check(
    "3 — ⚠⚠ REVIEW EDITOR: the same condition, neither stricter nor looser",
    /editSection === "skills"\s*\?\s*profile\.skillIds\.length \+ profile\.customSkills\.length > 0/.test(WIZ),
    "the step and the review must not disagree about who may continue"
  );
  check(
    "3 — ⚠ the step and the review count the same two things",
    (WIZ.match(/profile\.skillIds\.length \+ profile\.customSkills\.length > 0/g) ?? []).length >= 2,
    "the step's canSave and the review's sectionEditorCanSave must be the same expression"
  );
}

{
  check("4 — skillIds maps every row", /skillIds: pp\.skills\.map\(\(s\) => s\.skill_id\),/.test(ONBOARD));
  check(
    "4 — skillNames maps every row",
    /skillNames: pp\.skills\.map\(\(s\) => \(\{[^}]*\bid: s\.skill_id\b[^}]*\bname: s\.skill\.name\b/.test(
      ONBOARD
    )
  );
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
