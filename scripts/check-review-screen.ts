/**
 * `check:review-screen` — a person on the review screen never leaves it to edit
 * (`P1-A1.4-E412` WS-5). `npm run check:review-screen`.
 *
 * ── ⚠⚠ ASSERTION 1 IS THE BRIEF, EXPRESSED AS AN ABSENCE ────────────────────
 *
 * SCOTT: *"A PERSON ON THE REVIEW SCREEN NEVER LEAVES IT TO EDIT."* Seven of
 * the review's twelve cards called `goTo(step)`; the person left the page they
 * were reviewing, edited on a wizard step, and came back through
 * `returnToReview` — a return trip `E411` had to repair once already because
 * Back and Next disagreed about it.
 *
 * ⚠ AN ABSENCE-ASSERTION IS THE ONLY HONEST SHAPE FOR IT. "Edit opens a modal"
 * can be true of six cards while the seventh still navigates; "nothing in this
 * block navigates" cannot.
 *
 * ⚠ NO MODEL CALL, NO DATABASE, NO BROWSER. Text scans only — which is exactly
 * why `E412` also required the screens to be WALKED. This file cannot see that
 * a modal opened empty because a `screen`-gated fetch never ran; that defect
 * was found in a browser and is pinned here only after the fact (§8).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
/* ⚠ STATIC IMPORTS, NOT `require`. esbuild bundles what it can SEE — a runtime
   `require` of a `.ts` path reaches node with TypeScript still in it. §9 and
   §10 run these two functions for real rather than asserting regexes about
   them, which is the only way to mutation-test a rule. */
import { splitCertificationName } from "@/lib/resume/certification-names";
import { formatLocality } from "@/lib/locality";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/**
 * ⚠ COMMENTS OUT BEFORE ANYTHING IS MATCHED. This codebase supersedes by
 * QUOTING (`E164`), so every string these assertions look for also appears
 * inside a comment a few lines away — `goTo("picture")`, `overview={null}`,
 * `sectionAction(…, true)`. Matching raw text would read the history as the
 * present. §0 proves the strip, and `E408` is why: a lazy comment-close
 * matcher walked past a NEUTRALISED close sequence and reported live code missing.
 */
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const RAW_WIZ = readFileSync(join("src", "app", "join", "provider", "page.tsx"), "utf8");
const WIZ = strip(RAW_WIZ);
const STEP = strip(readFileSync(join("src", "components", "onboarding", "EmployersStep.tsx"), "utf8"));
const CERTS = strip(readFileSync(join("src", "components", "onboarding", "CertificationCards.tsx"), "utf8"));
const NAMES = strip(readFileSync(join("src", "lib", "resume", "certification-names.ts"), "utf8"));
const IMPORT = strip(readFileSync(join("src", "lib", "resume", "import.ts"), "utf8"));

/**
 * ⚠⚠ THE REVIEW SCREEN, ISOLATED — and this is load-bearing for §1.
 * `page.tsx` is one 4,700-line component holding every wizard step, so a
 * repo-wide "no `goTo`" scan would fire on the steps' own legitimate
 * navigation. The `finish` case is the review screen and nothing else.
 */
function finishCase(): string {
  const start = WIZ.indexOf('case "finish": {');
  /* ⚠ `lastIndexOf`, NOT `indexOf`. The case contains early `return null;`
     guards of its own, and taking the first one cut the block at 1,091 chars —
     at which point twenty assertions went red against correct code. The
     component's own closing `return null;` is the last one in the file. */
  const end = WIZ.lastIndexOf("return null;");
  if (start < 0 || end < 0 || end < start) return "";
  return WIZ.slice(start, end);
}
const REVIEW = finishCase();

/**
 * ⚠⚠ THE STEP SWITCH, ISOLATED — and §6 goes red without it.
 * `saveEditSection` is ALSO a `switch` over the same names (`case "title":`,
 * `case "skills":` …), and it sits ABOVE the step switch. A whole-file
 * `indexOf('case "title":')` found THAT one, whose body contains no
 * `WizardShell`, and reported the title step gutted when it was not.
 * ⚠ THE ANCHOR-MISS CLASS AGAIN: the string was real, the occurrence was wrong.
 */
const SWITCH = WIZ.slice(WIZ.indexOf("switch (screen) {"));

/* ═══ 0 · PROVE THE STRIP ═════════════════════════════════════════════════ */
{
  check("0 — a JSX comment is stripped", !/ghostTok/.test(strip("{/* ghostTok */} real")));
  check("0 — a block comment is stripped", !/ghostTok/.test(strip("/* ghostTok */ real")));
  check("0 — a line comment is stripped", !/ghostTok/.test(strip("// ghostTok\nreal")));
  check("0 — live code survives", /realTok/.test(strip("{/* ghostTok */} realTok")));
  /* ⚠ `E408`'s CASE: a neutralised `* /` inside a quoted block must not end it. */
  check(
    "0 — a neutralised `* /` does not close a JSX comment early",
    !/ghostTok/.test(strip("{/* was: <X a={1} * / /> ghostTok */} realTok")),
    "E408 — a lazy matcher walked past this and reported live code missing"
  );
  /*
    ⚠⚠ THE ONE THAT PROTECTS §1 SPECIFICALLY. The wizard QUOTES the superseded
    `goTo("picture")` and `goTo("title")` handlers in prose. If the strip
    failed, §1 would read the history and go red on correct code.
  */
  check(
    "0 — ⚠⚠ the superseded `goTo` quotes are invisible to §1",
    !/onClick=\{\(\) => goTo\("title"\)\}/.test(WIZ),
    "the wizard quotes this exact string inside a comment"
  );
  check("0 — the review block was located", REVIEW.length > 5000, `${REVIEW.length} chars`);
}

/* ═══ 1 · ⚠⚠ NO CARD'S EDIT NAVIGATES AWAY ═══════════════════════════════
   THE RULE. Mutate: point one card's Edit at `goTo(step)` → red.            */
{
  /*
    ⚠⚠ `goTo\(` — ANY ARGUMENT, NOT JUST A STRING LITERAL. ⚠ SUPERSEDED, quoted
    not deleted, because the mutation test is what found it:

        const navs = REVIEW.match(/goTo\(\s*"[a-z_]+"\s*\)/g) ?? [];

    ⚠ THAT PASSED WITH THE DEFECT RESTORED. Putting `goTo(fix.step as Step)`
    back into the click-to-fix handler — the exact line `E412` removes — left
    this gate GREEN, because the argument is a variable and the pattern only
    matched quoted step names. ⚠⚠ AN ABSENCE-ASSERTION THAT NAMES THE SHAPE OF
    THE ARGUMENT IS NOT AN ABSENCE-ASSERTION ABOUT THE CALL.
  */
  const navs = REVIEW.match(/goTo\([^)]*\)/g) ?? [];
  check(
    "1 — ⚠⚠ ABSENCE: the review screen contains no `goTo(…)` at all",
    navs.length === 0,
    navs.length ? `found ${navs.join(", ")}` : ""
  );
  check(
    "1 — ⚠ and no `setScreen` either",
    !/setScreen\(/.test(REVIEW),
    "the other way off this page"
  );
  /* ⚠ AND THE POSITIVE HALF, so §1 cannot pass on a review screen with no
     Edits at all — the way an absence-assertion goes vacuously green. */
  check(
    "1 — the Edits open the in-place editor instead",
    (REVIEW.match(/setEditSection\(/g) ?? []).length >= 6,
    "one per section, plus the modal's own close"
  );
  check(
    "1 — `sectionAction` takes a SECTION, not a step",
    /const sectionAction = \(\s*title: string,\s*section: Exclude<EditSection, null>/.test(WIZ),
    "keeping `step` would leave a parameter naming a place nobody goes"
  );
  /* ⚠ `E411`'s MECHANISM IS GONE, NOT JUST UNUSED. */
  check(
    "1 — ⚠ ABSENCE: `sectionAction` no longer sets `returnToReview`",
    !/setReturnToReview\(true\);\s*goTo\(step\)/.test(WIZ),
    "there is no return trip to manage"
  );
  /* ⚠⚠ THE CHECKLIST AT THE TOP IS AN EDIT AFFORDANCE TOO, and it is the one
     somebody with an error clicks first. */
  check(
    "1 — ⚠⚠ click-to-fix opens a section rather than travelling",
    /const FIX_STEP_TO_SECTION: Record<string, Exclude<EditSection, null>>/.test(REVIEW) &&
      /const section = FIX_STEP_TO_SECTION\[fix\.step\];/.test(REVIEW),
    "ReviewChecklist sits above every card"
  );
  /* ⚠ THE MAP IS COMPLETE — checked against the validator that emits the steps,
     so a new fix target cannot quietly fall through to the navigating default. */
  const VALID = strip(readFileSync(join("src", "lib", "review-validation.ts"), "utf8"));
  const emitted = [...VALID.matchAll(/step:\s*"([a-z_]+)"/g)].map((m) => m[1]);
  const missing = [...new Set(emitted)].filter(
    (st) => !new RegExp(`^\\s*${st}: "`, "m").test(REVIEW)
  );
  check(
    "1 — every step the validator emits has an in-place section",
    missing.length === 0,
    missing.length ? `unmapped: ${missing.join(", ")}` : `${new Set(emitted).size} mapped`
  );
}

/* ═══ 2 · EVERY SECTION CARD HAS AN EDIT — INCLUDING LOCATION ════════════
   Mutate: remove one → red.                                                */
{
  for (const [title, section] of [
    ["Work History", "work"],
    ["Solo Projects", "work"],
    ["Skills", "skills"],
    ["Specializations", "specializations"],
    ["Education", "education"],
    /* ⚠⚠ LOCATION HAD NO EDIT AT ALL before `E412` — it was the only
       read-only section card on the page. */
    ["Location", "location"],
  ] as const) {
    check(
      `2 — ${title} has an Edit${title === "Location" ? " ⚠⚠ (it had NONE)" : ""}`,
      new RegExp(`sectionAction\\(\\s*"${title}",\\s*"${section}"`).test(REVIEW)
    );
  }
  /* ⚠ The hero's three, which are affordances of the same kind. */
  for (const s of ["title", "rate"] as const) {
    check(`2 — the hero's Edit ${s} opens in place`, new RegExp(`setEditSection\\("${s}"\\)`).test(REVIEW));
  }
  check("2 — the photo still opens its modal", /setPhotoModal\(true\)/.test(REVIEW));
  /* ⚠ AND EACH SECTION IS ACTUALLY REACHABLE FROM THE MODAL — a value in the
     union that the dialog never renders is an Edit that opens an empty box. */
  for (const s of ["title", "rate", "location", "education", "skills", "specializations", "work"] as const) {
    check(
      `2 — the modal renders an editor for "${s}"`,
      new RegExp(`editSection === "${s}" &&`).test(REVIEW)
    );
  }
}

/* ═══ 3 · SOLO PROJECTS IS FULL WIDTH ════════════════════════════════════ */
{
  const grid = REVIEW.indexOf('grid gap-5 lg:grid-cols-2');
  const solo = REVIEW.indexOf('title="Solo Projects"');
  check("3 — the two-column grid still exists", grid > 0);
  check("3 — Solo Projects is present", solo > 0);
  check(
    "3 — ⚠⚠ Solo Projects renders BEFORE the two-column grid, not inside it",
    solo > 0 && grid > 0 && solo < grid,
    `solo@${solo} grid@${grid}`
  );
  /* ⚠ AND IT SITS WITH WORK HISTORY, which is the stated reason it moved:
     after `E410` it carries the same weight. */
  const work = REVIEW.indexOf('title="Work History"');
  check("3 — it follows Work History", work > 0 && work < solo);
  /* ⚠ SKILLS KEEPS A PARTNER — it did not go full width with it. */
  check(
    "3 — Skills stays in the grid",
    REVIEW.indexOf('title="Skills"') > grid,
    "a chip cloud run to 1100px is a band of loose text"
  );
}

/* ═══ 4 · THE CERTIFICATION CARD SHOWS ITS DATES ═════════════════════════ */
{
  check("4 — it renders the issue date", /c\.issuedOn \? monthYear\(c\.issuedOn\)/.test(CERTS));
  check("4 — as a month and a year, not a bare four digits", /function monthYear/.test(CERTS));
  check(
    "4 — ⚠ UTC, so a date-only string cannot slip a month backwards",
    /timeZone: "UTC"/.test(CERTS)
  );
  check("4 — the legacy `year` column is still the fallback", /: c\.year/.test(CERTS));
  /* ⚠⚠ AN EXPIRED CREDENTIAL READS DIFFERENTLY — in TWO ways, because colour
     alone reaches neither a screen reader nor anyone who cannot separate the
     hues. Mutate: drop the chip → red. */
  check("4 — expiry is a three-state, not a boolean", /"none" \| "current" \| "expired"/.test(CERTS));
  check("4 — ⚠⚠ an expired credential carries a word", /Expired\s*$|>\s*Expired/m.test(CERTS));
  check("4 — ⚠ and a different verb on the date", /Valid to \{monthYear/.test(CERTS));
  check(
    "4 — ⚠ an unparseable date is NOT called expired",
    /if \(Number\.isNaN\(d\.getTime\(\)\)\) return "none";/.test(CERTS),
    "telling somebody their credential lapsed because a string failed to parse is the worse error"
  );
}

/* ═══ 5 · EXACTLY ONE EDIT AFFORDANCE PER CERTIFICATION ══════════════════
   The header link ALWAYS ADDS — it bumps `certSignal`, which the component
   reads as `setEditing(-1)`. Labelling it "Edit" made two links that did
   different things sit a few pixels apart.                                 */
{
  const card = REVIEW.slice(REVIEW.indexOf('title="Certifications"'), REVIEW.indexOf('title="Location"'));
  check("5 — the Certifications card was located", card.length > 100);
  check("5 — ⚠⚠ its header affordance says Add, not Edit", /label="Add Certification"/.test(card));
  check(
    "5 — ⚠ ABSENCE: the header no longer calls itself Edit",
    !/: "Edit"/.test(card),
    "it opens setEditing(-1) — the ADD modal — every time"
  );
  check("5 — and it still opens the modal", /setCertSignal\(\(n\) => n \+ 1\)/.test(card));
  /* ⚠ THE ROW'S EDIT IS THE ONLY EDIT, and it is per-certification. */
  check("5 — each row keeps its own Edit", /aria-label=\{`Edit \$\{c\.name\}`\}/.test(CERTS));
  check("5 — which opens THAT row", /onClick=\{\(\) => openEdit\(i\)\}/.test(CERTS));
  /* ⚠ `E144`'s BODY BUTTON MUST STAY GONE — restoring it re-creates the pair
     Scott's directive removed. */
  check(
    "5 — ⚠ ABSENCE: no second Add inside the card body",
    !/openAdd/.test(CERTS),
    "E144 removed it on Scott's directive"
  );
}

/* ═══ 6 · ⚠⚠ THE WIZARD STEPS STILL RENDER THEIR OWN EDITORS ═════════════
   AN ABSENCE-ASSERTION THAT THIS BRIEF DID NOT GUT THE FIRST-RUN FLOW.
   The editors were HOISTED so both mounts share one implementation; if the
   hoist had emptied the steps instead, every assertion above would still
   pass and a new provider would meet blank screens.                        */
{
  for (const [step, helper] of [
    ["title", "titleEditing"],
    ["rate", "rateEditing"],
    ["skills", "skillsEditing"],
    ["specializations", "specializationsEditing"],
  ] as const) {
    const at =
      SWITCH.indexOf(`case "${step}": {`) >= 0
        ? SWITCH.indexOf(`case "${step}": {`)
        : SWITCH.indexOf(`case "${step}":`);
    const body = SWITCH.slice(at, at + 2200);
    check(`6 — ⚠ the ${step} STEP still renders its editor`, at > 0 && body.includes(helper), `via ${helper}()`);
    check(`6 — the ${step} step still wraps it in WizardShell`, body.includes("<WizardShell"));
  }
  check("6 — the education step still renders EducationCards", /case "education":[\s\S]{0,900}<EducationCards/.test(SWITCH));
  check("6 — the tell_us step still renders EmployersStep", /editingWork \?[\s\S]{0,200}<EmployersStep/.test(WIZ));
  check("6 — the picture step still renders the contact block", /case "picture":[\s\S]{0,4000}contactEditing\(\)\.body/.test(SWITCH));
  /* ⚠ ONE IMPLEMENTATION, TWO MOUNTS — the point of the hoist. A second copy
     of the picker is how two surfaces meant to be identical start to differ. */
  for (const helper of ["skillsEditing", "specializationsEditing", "titleEditing", "rateEditing", "contactEditing"]) {
    check(
      `6 — ${helper} is defined exactly once`,
      (WIZ.match(new RegExp(`const ${helper} = `, "g")) ?? []).length === 1
    );
  }
}

/* ═══ 7 · ⚠ BOTH EXISTING PROJECT ROUTES SURVIVE ═════════════════════════
   `E412` WS-1b: do NOT add a third route. `E124` made the second one-click
   deliberately. Mutate: remove either → red.                               */
{
  check(
    "7 — ⚠ the in-card `+ Add Project` survives",
    /\+ Add Project/.test(STEP),
    "EmployersStep — inside an expanded employer card"
  );
  check(
    "7 — ⚠ `Add projects within this job` survives (E124, one click)",
    /Add projects within this job/.test(STEP),
    "collapsed card — expands AND opens the modal"
  );
  check("7 — `+ Add Company` still sits at list level", /\+ Add Company/.test(STEP));
  check("7 — the placement surface still exists", /Projects not yet under a job/.test(STEP));
  check("7 — and `unplaced` still feeds it", /const unplaced = projects\.filter/.test(STEP));
  /* ⚠⚠ ABSENCE: NO THIRD ROUTE. `E412` says a list-level `+ Add Project` has
     to answer "which employer?" and that the choice must be REPORTED, not made
     silently — so this brief adds none. */
  check(
    "7 — ⚠⚠ ABSENCE: no list-level `+ Add Project` was added",
    (STEP.match(/\+ Add Project/g) ?? []).length <= 2,
    "a third route makes it less findable, not more"
  );
}

/* ═══ 8 · ⚠⚠ THE MODAL'S DATA ACTUALLY LOADS ═════════════════════════════
   FOUND BY WALKING IT, PINNED HERE AFTERWARDS. Every catalog fetch was gated
   on `screen`, and the review mounts these pickers while `screen === "finish"`
   — so the Skills modal opened with an empty catalog and NO error. That is
   the `E406` failure class: green suite, blank browser.                     */
{
  check(
    "8 — ⚠⚠ the field-roles fetch knows about the modal",
    /screen === "catalog" \|\|\s*editSection === "skills"/.test(WIZ)
  );
  check("8 — the skill-options fetch too", /\(screen !== "skills" && editSection !== "skills"\)/.test(WIZ));
  check(
    "8 — and the specializations fetch",
    /\(screen === "specializations" \|\| editSection === "specializations"\)/.test(WIZ)
  );
  check("8 — `editSection` is in the effects' dependency lists", /\[screen, editSection,/.test(WIZ));
  /* ⚠ THE SAVE RE-HYDRATES, which is what updates the card behind the modal
     with what was STORED rather than a local patch. */
  check("8 — the save goes through postStep", /const saveEditSection = async \(\)/.test(WIZ));
  check(
    "8 — ⚠ and the modal stays OPEN on a rejected write",
    /if \(await postStep\("title", \{ headline: profile\.headline \}\)\) setEditSection\(null\);/.test(WIZ),
    "closing first and reporting later loses the edit — E090"
  );
  /* ⚠ EmployersStep commits as it goes, so it gets Done rather than Save. */
  check("8 — the work editor offers Done, not Save", /editSection === "work" \? "Done" : "Cancel"/.test(WIZ));
  check("8 — and no Save button for it", /\{editSection !== "work" && \(/.test(WIZ));
}

/* ═══ 9 · WS-3a — ONE ROW PER CREDENTIAL ═════════════════════════════════ */
{
  check("9 — the splitter exists", /export function splitCertificationName/.test(NAMES));
  check("9 — the import path uses it", /for \(const name of splitCertificationName\(c\.name \?\? ""\)\)/.test(IMPORT));
  /* ⚠⚠ THE RULE IS THE SERIAL CONJUNCTION, NOT THE COMMA. A comma inside one
     real name must never divide it. */
  check("9 — ⚠⚠ a split requires a trailing and/or/&", /\^\(\?:and\|or\|&\)\\s\+/.test(NAMES));
  check("9 — and at least three parts", /if \(segments\.length < 3\) return \[stripped\];/.test(NAMES));
  check(
    "9 — ⚠ the de-dupe runs per PART, not on the joined string",
    /for \(const name of splitCertificationName[\s\S]{0,200}haveCert\.has\(name\.toLowerCase\(\)\)/.test(IMPORT),
    "a re-import after a split run must add nothing"
  );

  /* ── ⚠⚠ MUTATION-TESTED AGAINST A COMMA-BEARING SINGLE NAME ─────────────
     `E412`: *"'Oracle Cloud Procurement, 2024 Implementation Professional' is
     one certification, not two."* Run the real function, not a regex about it. */
  const cases: [string, number, string][] = [
    ["Procurement, Contract Management, Payables, Oracle Business Network (OBN), and Inventory Management.", 5, "the row Scott actually has"],
    ["ORACLE CLOUD CERTIFICATIONS: Procurement, Contract Management, Payables, Oracle Business Network (OBN), and Inventory Management", 5, "with the heading glued on"],
    ["Oracle Cloud Procurement, 2024 Implementation Professional", 1, "⚠⚠ THE BRIEF'S COUNTER-EXAMPLE — a comma inside ONE name"],
    ["Oracle Cloud Procurement, Contract and Sourcing Implementation Professional", 1, "⚠ a comma AND an `and`, still one name"],
    ["Health and Safety, Level 2", 1, "an `and` in the FIRST segment"],
    ["Certified ScrumMaster", 1, "no punctuation at all"],
    ["PMP, CSM", 1, "two items, no conjunction — declined on purpose"],
    ["Procurement, Payables and Inventory", 1, "⚠ the non-Oxford form is DECLINED, by decision"],
    /*
      ⚠⚠ THE CASE THE TABLE WAS MISSING, and the mutation test is what exposed
      it: dropping the conjunction requirement entirely (`if (!tail) return
      segments`) left this gate GREEN, because every counter-example above has
      only TWO comma segments and is caught by the `< 3` guard first. This one
      has THREE and no conjunction, so it reaches the rule that actually matters.
    */
    ["Oracle Cloud Procurement, Contract Management, 2024 Implementation Professional", 1, "⚠⚠ three segments, NO conjunction — must not split"],
    ["Advanced Diploma, Level 5, Distinction", 1, "⚠ three segments, still one credential"],
    ["Six Sigma, Green Belt, and Black Belt", 3, "a genuine three-item list"],
  ];
  for (const [input, want, why] of cases) {
    const got = splitCertificationName(input) as string[];
    check(
      `9 — split(${JSON.stringify(input.slice(0, 44))}…) → ${want}`,
      got.length === want,
      `got ${got.length}: ${JSON.stringify(got)} · ${why}`
    );
  }
  /*
    ⚠⚠ COUNTING PARTS IS NOT ENOUGH, and the mutation test proved it: removing
    the heading strip altogether left this section GREEN, because
    "ORACLE CLOUD CERTIFICATIONS: Procurement, …" still divides into FIVE — the
    first one just carries the heading glued to it. ⚠ SO THE CONTENT IS
    ASSERTED, not the length.
  */
  {
    const heading = splitCertificationName(
      "ORACLE CLOUD CERTIFICATIONS: Procurement, Contract Management, Payables, Oracle Business Network (OBN), and Inventory Management"
    ) as string[];
    check(
      "9 — ⚠⚠ the ALL-CAPS heading is stripped off the first part",
      heading[0] === "Procurement",
      `got ${JSON.stringify(heading[0])}`
    );
    check(
      "9 — and the last part loses its conjunction",
      heading[heading.length - 1] === "Inventory Management",
      `got ${JSON.stringify(heading[heading.length - 1])}`
    );
    /* ⚠ THE STRIP IS NARROW ON PURPOSE — a normal name with a colon keeps it. */
    check(
      "9 — ⚠ a non-heading colon is NOT stripped",
      (splitCertificationName("Oracle: Procurement Professional") as string[])[0] ===
        "Oracle: Procurement Professional"
    );
  }

  /* ⚠ IT CAN NEVER LOSE A CREDENTIAL — a declined split returns the whole name. */
  check(
    "9 — ⚠ a declined split returns the name intact",
    (splitCertificationName("Oracle Cloud Procurement, 2024 Implementation Professional") as string[])[0] ===
      "Oracle Cloud Procurement, 2024 Implementation Professional"
  );
}

/* ═══ 10 · WS-4 — THE LOCALITY LINE ══════════════════════════════════════ */
{
  const LOC = strip(readFileSync(join("src", "lib", "locality.ts"), "utf8"));
  const VIEWLIB = strip(readFileSync(join("src", "lib", "provider-profile-view.ts"), "utf8"));
  check("10 — the shared formatter exists", /export function formatLocality/.test(LOC));
  /* ⚠⚠ HOW A MISSING COMPONENT IS HANDLED: parts are dropped BEFORE the join,
     so no combination can produce a dangling comma. */
  const locCases: [Record<string, string | null>, string | null][] = [
    [{ city: "Saint Augustine", state: "FL", postalCode: "32095" }, "Saint Augustine, FL 32095"],
    [{ city: "Ponte Vedra Beach", state: "England" }, "Ponte Vedra Beach, England"],
    [{ city: "London" }, "London"],
    [{ state: "England" }, "England"],
    [{ city: "", state: "  ", postalCode: null }, null],
    [{ city: "Austin", state: null, postalCode: "78701" }, "Austin, 78701"],
    [{}, null],
  ];
  for (const [parts, want] of locCases) {
    const got = formatLocality(parts);
    check(`10 — locality ${JSON.stringify(parts)} → ${JSON.stringify(want)}`, got === want, `got ${JSON.stringify(got)}`);
  }
  check(
    "10 — ⚠ no output can end or begin with a comma",
    locCases.every(([p]) => {
      const v = formatLocality(p);
      return v === null || (!/^,|,\s*$/.test(v) && !/,\s*,/.test(v));
    })
  );
  /* ⚠⚠ THE COUNTRY IS NOT IN THE LINE — that is what silenced LocationBody's
     second line on every profile in the product. */
  check(
    "10 — ⚠⚠ ABSENCE: the country is not joined into the locality",
    !/country/.test(LOC.slice(LOC.indexOf("export function formatLocality"))),
    "LocationBody suppresses its country line when the first line contains it"
  );
  check("10 — the published profile uses the shared formatter", /formatLocality\(\{ city: addr\?\.city, state: addr\?\.state \}\)/.test(VIEWLIB));
  check(
    "10 — ⚠ ABSENCE: the old flat join is gone from the profile lib",
    !/\[addr\?\.city, addr\?\.state, addr\?\.country\]/.test(VIEWLIB)
  );
  /* ⚠⚠ AND THE REVIEW SHOWS THE BUYER'S VERSION, NOT THE OWNER'S. The wizard
     HAS a postcode; the published profile does not even select the column, and
     this page's own promise is "exactly what buyers will see". FOUND BY
     WALKING IT — the card read "…England 32081" against the profile's
     "…England", and nothing in the type system objected. */
  check(
    "10 — ⚠⚠ the review passes city and state only — no postcode",
    /const reviewLocality = formatLocality\(\{ city: addr\.city, state: addr\.state \}\);/.test(REVIEW),
    "putting a postcode on a public profile is a privacy decision nobody has made"
  );
  check("10 — and the Location card renders that", /location=\{reviewLocality\}/.test(REVIEW));
}

if (failures.length) {
  console.error(`\ncheck:review-screen — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:review-screen — ${pass}/${pass} passed`);
