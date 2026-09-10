/**
 * `check:review-edit` — the review's Edit links reach an editor, and the hero
 * can tell "empty" from "not shown here" (`P1-A1.4-E411` WS-3).
 * `npm run check:review-edit`.
 *
 * ── ⚠⚠ THE ASSERTION THAT HAD TO EXIST AND DID NOT ────────────────────────
 *
 * `tell_us` renders `editingWork ? <EmployersStep …> : <WorkHistoryBody …>`.
 * The review's Edit links navigated there and never set `editingWork`, so they
 * landed on the READ-ONLY body — which draws no solo-projects surface at all.
 * ⚠ `EmployersStep` is the only place `unplaced` and `moveProject` live, so an
 * unplaced project could not be attached from anywhere in the wizard. That
 * blocked `E410`'s design, which routes engagements to Project rows on the
 * stated grounds that the placement UI already exists.
 *
 * ⚠ NO MODEL CALL, NO DATABASE. Text scans only.
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

const WIZ = strip(readFileSync(join("src", "app", "join", "provider", "page.tsx"), "utf8"));
const SECTIONS = strip(readFileSync(join("src", "components", "profile", "sections.tsx"), "utf8"));
const VIEW = strip(readFileSync(join("src", "components", "profile", "ProviderProfileView.tsx"), "utf8"));

/* ═══ 0 · PROVE THE STRIP ═════════════════════════════════════════════════ */
{
  check("0 — a JSX comment is stripped", !/ghostTok/.test(strip("{/* ghostTok */} real")));
  check("0 — a block comment is stripped", !/ghostTok/.test(strip("/* ghostTok */ real")));
  check("0 — a line comment is stripped", !/ghostTok/.test(strip("// ghostTok\nreal")));
  check("0 — live code survives", /realTok/.test(strip("{/* ghostTok */} realTok")));
  /* ⚠ THIS FILE AND THE WIZARD BOTH QUOTE `overview={null}` in prose. If the
     strip failed, §3 would read a superseded quote as live code. */
  check("0 — the superseded `overview={null}` quote is invisible", !/overview=\{null\}/.test(WIZ));
}

/* ═══ 1 · ⚠⚠ SUPERSEDED IN FULL BY `P1-A1.4-E412` WS-1 ═══════════════════
   ⚠ SCOTT, VIA `E412`: *"A PERSON ON THE REVIEW SCREEN NEVER LEAVES IT TO
   EDIT."* ⚠⚠ THIS SECTION ASSERTED THE OPPOSITE MECHANISM — that the trip to
   `tell_us` LANDS somewhere useful — and `E412` removes the trip. The brief
   says so in terms: *"E411's WS-1 line is superseded on arrival; delete it with
   a quote naming this brief."*

   ⚠ THE FINDING BEHIND IT SURVIVES AND IS WHY `E412` EXISTS: an Edit that
   navigates to a screen rendering `editingWork ? <EmployersStep …> :
   <WorkHistoryBody …>` shows the READ-ONLY body, with no solo-projects surface
   at all. `E411` fixed the landing; `E412` removed the journey.

   ⚠ SUPERSEDED, QUOTED NOT DELETED — every assertion that stood here:

       check("1 — sectionAction can be told to open the editor",
         /opensEditor/.test(WIZ) && /if \(opensEditor\) setEditingWork\(true\)/.test(WIZ),
         "the helper is shared; the flag must be per-call");
       const wh = /sectionAction\([\s\S]*?"Work History",[\s\S]*?"tell_us",[\s\S]*?,\s*true\s*\)/.test(WIZ);
       const sp = /sectionAction\([\s\S]*?"Solo Projects",[\s\S]*?"tell_us",[\s\S]*?,\s*true\s*\)/.test(WIZ);
       check("1 — ⚠⚠ Work History's Edit opens the editor", wh);
       check("1 — ⚠⚠ Solo Projects' Edit opens the editor", sp,
         "the only route to the placement UI");
       for (const [title, step] of [["Skills", "catalog"], ["Education", "education"]] as const) {
         check(`1 — ${title} (${step}) is NOT handed the flag`,
           !new RegExp(`sectionAction\\(\\s*"${title}",\\s*"${step}",[^)]*?,\\s*true`).test(WIZ));
       }

   ⚠⚠ NOT DELETED TO GO GREEN — REPLACED BY THE STRONGER FORM. `E408`'s rule is
   that an assertion is never removed to make a gate pass, so what this section
   was protecting is now asserted in `check:review-screen` §1 and §2 as an
   ABSENCE over the whole review block: no `goTo(…)` at all, and every card —
   Work History and Solo Projects included — opening its editor in place. The
   two replacements below keep the half of this section that is still true. */
{
  /* ⚠ THE FLAG AND ITS STEP TRAVEL ARE BOTH GONE. This is the same claim the
     quoted block made, inverted — the mechanism must NOT come back. */
  check(
    "1 — ⚠⚠ SUPERSEDED (E412): `opensEditor` is gone from sectionAction",
    !/opensEditor/.test(WIZ),
    "E412 — there is no other screen to open edit mode ON"
  );
  /* ⚠ AND THE THING IT EXISTED FOR STILL HAPPENS, by a different route: both
     cards still reach `EmployersStep`, which is still the only placement UI. */
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
  /*
    ⚠ SUPERSEDED, quoted not deleted (`P1-A1.4-E413` WS-1):

        /const unplaced = projects\.filter/

    ⚠⚠ THE LINE MOVED, THE PROPERTY DID NOT. `E413` gave a placed project a way
    back OUT, and a row detached in the same session is in neither the wizard's
    `projects` prop nor the employers endpoint's nested list — so it would have
    vanished. `unplaced` is now derived from `knownProjects`, which merges the
    prop with the rows this session detached. ⚠ WHAT THIS ASSERTION PROTECTS —
    that the placement surface is still fed from the FLAT list rather than from
    the nested one — is unchanged and asserted below in its new shape.
  */
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
  /* ⚠ `+ Add Project` ALREADY EXISTS — `E411`'s survey found it inside an
     expanded employer card. It is a findability problem, not a missing control,
     and this pins that it is still there. */
  check("2 — ⚠ the existing `+ Add Project` control survives", /\+ Add Project/.test(step));
  check("2 — and `+ Add Company` still sits at list level", /\+ Add Company/.test(step));
}

/* ═══ 3 · ⚠⚠ THE HERO TELLS EMPTY FROM NOT-SHOWN-HERE ════════════════════ */
{
  check("3 — ProfileHero takes the omit flag", /overviewShownElsewhere\?: boolean/.test(SECTIONS));
  check(
    "3 — ⚠⚠ the flag draws NOTHING — not the text, not the empty line",
    /overviewShownElsewhere \? null : overview \?/.test(SECTIONS),
    "falling back to the empty line IS the bug"
  );
  /* ⚠ IT FAILS SAFE. A caller that forgets shows the overview; the worst case is
     E205's duplication, not a provider's paragraph vanishing. */
  check("3 — it defaults to false", /overviewShownElsewhere = false/.test(SECTIONS));
  check("3 — the empty state still exists for a genuinely empty overview", /No overview yet\./.test(SECTIONS));
  /* ⚠ THE REVIEW PAGE USES IT, AND NO LONGER PASSES A BARE null. */
  check("3 — the review page passes the flag", /overviewShownElsewhere/.test(WIZ));
  check("3 — ABSENCE: the review page no longer passes overview={null}", !/overview=\{null\}/.test(WIZ));
}

/* ═══ 4 · ⚠ THE PUBLISHED PROFILE STILL SHOWS THE REAL OVERVIEW ══════════
   This is what stops WS-2's fix leaking onto the surface that must show it. */
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
console.log(`check:review-edit — ${pass}/${pass} passed`);
