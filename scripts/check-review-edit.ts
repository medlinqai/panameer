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

/* ═══ 1 · ⚠⚠ EDIT OPENS EDIT MODE ════════════════════════════════════════ */
{
  check(
    "1 — sectionAction can be told to open the editor",
    /opensEditor/.test(WIZ) && /if \(opensEditor\) setEditingWork\(true\)/.test(WIZ),
    "the helper is shared; the flag must be per-call"
  );
  /* ⚠ BOTH `tell_us` CALLERS PASS IT. Work History and Solo Projects are the
     only two of five that target a step with an edit mode. */
  const wh = /sectionAction\([\s\S]*?"Work History",[\s\S]*?"tell_us",[\s\S]*?,\s*true\s*\)/.test(WIZ);
  const sp = /sectionAction\([\s\S]*?"Solo Projects",[\s\S]*?"tell_us",[\s\S]*?,\s*true\s*\)/.test(WIZ);
  check("1 — ⚠⚠ Work History's Edit opens the editor", wh);
  check("1 — ⚠⚠ Solo Projects' Edit opens the editor", sp, "the only route to the placement UI");
  /* ⚠ AND THE OTHER THREE DO NOT — their steps have no edit mode, and a flag
     that means nothing there is how a prop starts lying. */
  for (const [title, step] of [["Skills", "catalog"], ["Education", "education"]] as const) {
    check(
      `1 — ${title} (${step}) is NOT handed the flag`,
      !new RegExp(`sectionAction\\(\\s*"${title}",\\s*"${step}",[^)]*?,\\s*true`).test(WIZ)
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
  check("2 — the step computes `unplaced` from that list", /const unplaced = projects\.filter/.test(step));
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
