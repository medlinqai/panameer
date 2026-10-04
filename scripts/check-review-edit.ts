import { readFileSync } from "node:fs";
import { join } from "node:path";
import { publishedProfileCode, publishedProfileFile } from "./_profile-surface";

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

const WIZ = strip(readFileSync(join("src", "app", "join", "provider", "page.tsx"), "utf8"));
const SECTIONS = strip(readFileSync(join("src", "components", "profile", "sections.tsx"), "utf8"));
const VIEW = publishedProfileCode();

/* ═══ 0 · PROVE THE STRIP ═════════════════════════════════════════════════ */
{
  check("0 — a JSX comment is stripped", !/ghostTok/.test(strip("{/* ghostTok */} real")));
  check("0 — a block comment is stripped", !/ghostTok/.test(strip("/* ghostTok */ real")));
  check("0 — a line comment is stripped", !/ghostTok/.test(strip("// ghostTok\nreal")));
  check("0 — live code survives", /realTok/.test(strip("{/* ghostTok */} realTok")));
  check("0 — the superseded `overview={null}` quote is invisible", !/overview=\{null\}/.test(WIZ));
}

{
  check(
    "1 — ⚠⚠ SUPERSEDED (E412): `opensEditor` is gone from sectionAction",
    !/opensEditor/.test(WIZ),
    "E412 — there is no other screen to open edit mode ON"
  );
  for (const title of ["Work History", "Solo Projects"] as const) {
    check(
      `1 — ⚠ ${title}'s Edit still reaches EmployersStep (now in place)`,
      new RegExp(`sectionAction\\(\\s*"${title}",\\s*"work"`).test(WIZ),
      "E412 — same editor, no journey"
    );
  }
}

/* ═══ 2 · THE EDITOR CAN SHOW UNPLACED PROJECTS ══════════════════════════ */
{
  check(
    "2 — EmployersStep receives the FLAT projects list",
    /<EmployersStep[\s\S]{0,400}projects=\{profile\.projects\}/.test(WIZ),
    "listEmployers nests projects, so employer_id:null rows arrive only through this"
  );
  const step = strip(readFileSync(join("src", "components", "onboarding", "EmployersStep.tsx"), "utf8"));
  check(
    "2 — `unplaced` is still derived from the flat list, not the nested one",
    /const unplaced = \[\.\.\.knownProjects\.values\(\)\]\.filter\(\(p\) => !nested\.has\(p\.id\)\)/.test(
      step
    ),
    "E413 WS-1 — plus any row detached in this session"
  );
  check(
    "2 — ⚠ and the flat `projects` prop still feeds it",
    /for \(const p of projects\) knownProjects\.set\(p\.id, p\);/.test(step)
  );
  check("2 — and renders the placement section", /Projects not yet under a job/.test(step));
  check("2 — ⚠ the existing `+ Add Project` control survives", /\+ Add Project/.test(step));
  check("2 — and `+ Add Company` still sits at list level", /\+ Add Company/.test(step));
}

{
  check("3 — ProfileHero takes the omit flag", /overviewShownElsewhere\?: boolean/.test(SECTIONS));
  check(
    "3 — ⚠⚠ the flag draws NOTHING — not the text, not the empty line",
    /overviewShownElsewhere \? null : overview \?/.test(SECTIONS),
    "falling back to the empty line IS the bug"
  );
  check("3 — it defaults to false", /overviewShownElsewhere = false/.test(SECTIONS));
  check("3 — the empty state still exists for a genuinely empty overview", /No overview yet\./.test(SECTIONS));
  check("3 — the review page passes the flag", /overviewShownElsewhere/.test(WIZ));
  check("3 — ABSENCE: the review page no longer passes overview={null}", !/overview=\{null\}/.test(WIZ));
}

{
  check("4 — the published profile passes the real overview", /overview=\{p\.overview\}/.test(VIEW));
  check(
    "4 — ⚠⚠ ABSENCE: it does NOT pass the omit flag",
    !/overviewShownElsewhere/.test(VIEW),
    "the published profile is where the overview belongs"
  );
}

if (failures.length) {
  console.error(`\ncheck:review-edit — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:review-edit — published profile resolved to ${publishedProfileFile()}`);
console.log(`check:review-edit — ${pass}/${pass} passed`);
