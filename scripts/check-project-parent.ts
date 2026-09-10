/**
 * `check:project-parent` — a project's parent is editable from both ends, and
 * the converted row is named after the work (`P1-A1.4-E413` WS-5).
 * `npm run check:project-parent`.
 *
 * ── ⚠⚠ ASSERTION 1 IS THE ONE WHOSE ABSENCE MADE A MISPLACEMENT PERMANENT ───
 *
 * `moveProject` was reachable from the "Projects not yet under a job" panel and
 * NOWHERE ELSE — and the instant it succeeded the row entered `nested`, left
 * `unplaced`, and the only control that could call it unmounted itself. A
 * one-way door that closed behind the row. ⚠ The endpoint has handled
 * re-attach and detach since `E296`; it simply never had a button.
 *
 * ⚠ NO MODEL CALL, NO DATABASE, NO BROWSER — which is exactly why `E413` also
 * required the path to be WALKED. This file cannot see a picker that renders
 * and does nothing.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
/* ⚠ STATIC IMPORTS so esbuild bundles them: §6 and §7 run the real functions
   rather than pattern-matching the JSX and the map that produce them. */
import { cardTitle, cardCompany } from "@/components/onboarding/EmployersStep";
import { employerToProjectData, projectToEmployerData, type EmployerScalars } from "@/lib/reclassify";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/**
 * ⚠ COMMENTS OUT BEFORE ANYTHING IS MATCHED. This codebase supersedes by
 * QUOTING (`E164`), so every string these assertions look for also appears
 * inside a comment a few lines away — `{e.roleTitle || e.name}`, `value=""`,
 * `e.name ?? e.role_title`, and the whole superseded `<select>`. Matching raw
 * text would read the history as the present. §0 proves the strip.
 */
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const read = (...p: string[]) => strip(readFileSync(join(...p), "utf8"));
const STEP = read("src", "components", "onboarding", "EmployersStep.tsx");
const LIB = read("src", "lib", "employers.ts");
const ROUTE = read("src", "app", "api", "provider", "employers", "route.ts");
const RECLASS = read("src", "lib", "reclassify.ts");
const SHELL = read("src", "components", "onboarding", "WizardShell.tsx");
const WIZ = read("src", "app", "join", "provider", "page.tsx");
const REQ = read("src", "app", "join", "requester", "steps", "page.tsx");
const IMPORT = read("src", "lib", "resume", "import.ts");
const RETENTION = read("src", "lib", "retention.ts");
const STORAGE = read("src", "lib", "storage.ts");

/* ═══ 0 · PROVE THE STRIP ═════════════════════════════════════════════════ */
{
  check("0 — a JSX comment is stripped", !/ghostTok/.test(strip("{/* ghostTok */} real")));
  check("0 — a block comment is stripped", !/ghostTok/.test(strip("/* ghostTok */ real")));
  check("0 — a line comment is stripped", !/ghostTok/.test(strip("// ghostTok\nreal")));
  check("0 — live code survives", /realTok/.test(strip("{/* ghostTok */} realTok")));
  check(
    "0 — a neutralised close sequence does not end a JSX comment early",
    !/ghostTok/.test(strip("{/* was: <X a={1} * / /> ghostTok */} realTok")),
    "E408 — a lazy matcher walked past this and reported live code missing"
  );
  /* ⚠ THE ONES THAT PROTECT §6 AND §1: both superseded lines are quoted verbatim
     in the files they were removed from. */
  check(
    "0 — ⚠⚠ the superseded `{e.roleTitle || e.name}` quote is invisible",
    !/\{e\.roleTitle \|\| e\.name\}/.test(STEP),
    "EmployersStep quotes this exact string inside a comment"
  );
  check(
    "0 — ⚠ the superseded `e.name ?? e.role_title` quote is invisible",
    !/name: e\.name \?\? e\.role_title/.test(RECLASS)
  );
}

/* ═══ 1 · ⚠⚠ A PLACED PROJECT CAN BE MOVED TO A DIFFERENT JOB ════════════
   Mutate: gate the control on `employer_id == null` → red.                  */
{
  check("1 — the shared picker exists", /function ParentPicker\(/.test(STEP));
  /* ⚠⚠ IT IS RENDERED ON A PLACED ROW, with THIS card's employer as the current
     value. `currentEmployerId={e.id}` is the whole assertion: a picker rendered
     only in the unplaced panel is the defect, and one rendered with no current
     value reads as "not set" and invites a blind change. */
  check(
    "1 — ⚠⚠ it renders on a PLACED project row, showing its current parent",
    /<ParentPicker[\s\S]{0,200}currentEmployerId=\{e\.id\}/.test(STEP),
    "this is the control whose absence made a misplacement permanent"
  );
  check(
    "1 — ⚠ the picker is BOUND to the current parent, not to \"\"",
    /value=\{currentEmployerId\}/.test(STEP),
    "a control displaying nothing reads as 'not set'"
  );
  /*
    ⚠⚠ IT IS INSIDE THE PLACED-ROW BLOCK, AND UNCONDITIONAL THERE. The mutation
    the brief names is "gate the control on `employer_id == null`", and the
    honest form of that mutation is simply DELETING the picker from the row —
    which is the state this brief found the product in. ⚠ SO THE ASSERTION IS
    POSITIONAL: the picker must appear between the project row's ✕ button and
    the `+ Add Project` that closes the list, with no conditional in front of it.
  */
  const rowStart = STEP.indexOf("action: \"deleteProject\"");
  const rowEnd = STEP.indexOf("+ Add Project");
  const placedRow = rowStart > 0 && rowEnd > rowStart ? STEP.slice(rowStart, rowEnd) : "";
  check(
    "1 — ⚠⚠ the picker lives in the PLACED project row itself",
    /<ParentPicker/.test(placedRow),
    "its absence here is the whole defect — a placed row had Artifacts · Edit · ⇄ · ✕ and no way to move"
  );
  check(
    "1 — ⚠⚠ ABSENCE: nothing gates it on the row having no employer",
    placedRow.length > 0 &&
      !/(employerId|employer_id)\s*===?\s*null[^<]{0,40}<ParentPicker/.test(placedRow) &&
      !/!\s*pr\.employer[A-Za-z_]*\s*&&[^<]{0,40}<ParentPicker/.test(placedRow)
  );
}

/* ═══ 2 · A PLACED PROJECT CAN BE DETACHED ═══════════════════════════════
   Mutate: remove the detach option → red.                                   */
{
  check("2 — the no-parent option exists", /NO_PARENT_LABEL/.test(STEP));
  check(
    "2 — ⚠ it is worded as a STATE, not an error",
    /export const NO_PARENT_LABEL = "Not under a job yet";/.test(STEP),
    "`unplaced` is a first-class state (E296), not something missing"
  );
  /* ⚠⚠ THE EMPTY OPTION MUST ACTUALLY FIRE. The superseded panel had
     `if (!employerId) return;`, which made the empty option inert — that guard
     is what made detach unreachable even where the picker already lived. */
  check(
    "2 — ⚠⚠ choosing it posts null rather than returning early",
    /onMove\(project, ev\.target\.value \|\| null\)/.test(STEP),
    "the old panel had `if (!employerId) return;` — an inert empty option"
  );
  check(
    "2 — ⚠ ABSENCE: the early-return guard is gone",
    !/if \(!employerId\) return;/.test(STEP)
  );
  /* ⚠ AND A ROW DETACHED THIS SESSION MUST NOT VANISH. The endpoint returns
     only nested projects, so without this a project created and then detached
     in one sitting disappears from the screen. */
  check("2 — a detached row is remembered client-side", /const \[detached, setDetached\]/.test(STEP));
  check(
    "2 — ⚠ and forgotten once it finds a home",
    /d\.filter\(\(x\) => x\.id !== pr\.id\)/.test(STEP),
    "otherwise the registry could resurrect a row the server no longer has"
  );
}

/* ═══ 3 · ⚠⚠ `moveProject` IS STILL THE ONLY WRITER ══════════════════════
   Mutate: add a second writer → red.                                        */
{
  check(
    "3 — the lib still claims it",
    /the only code path that can set/.test(readFileSync(join("src", "lib", "employers.ts"), "utf8")),
    "read UNSTRIPPED — the claim lives in the doc comment"
  );
  /*
    ⚠⚠ THE CLAIM, CHECKED RATHER THAN TRUSTED — AND IT IS NARROWER THAN THE DOC
    COMMENT SAYS. A first draft of this assertion counted every `employer_id:`
    in the lib and found TWELVE, because `where:` clauses read the column too.
    Counting only the WRITES leaves three, and they are not interchangeable:

      · `createProject`            — sets it at BIRTH, on `project.create`
      · `convertEmployerToProject` — sets it at BIRTH on the new row, and
                                     RE-PARENTS the converted employer's own
                                     children so they are not orphaned (`E296`)
      · `moveProject`              — the only one that RE-PARENTS AN EXISTING,
                                     UNRELATED PROJECT

    ⚠ SO THE ASSERTION IS "no FOURTH writer, and `moveProject` is still the only
    one reachable as a plain re-parent". ⚠ That is what makes the double
    ownership re-check unskippable for the operation `E413` adds buttons for.
    ⚠ MUTATE: add an `employer_id` to `updateProject`'s data → red.
  */
  const updateWrites = [
    ...LIB.matchAll(
      /(tx|prisma)\.project\.update(Many)?\(\{[\s\S]{0,260}?data: \{[^}]*employer_id/g
    ),
  ];
  check(
    "3 — ⚠⚠ exactly TWO paths re-parent an existing project row",
    updateWrites.length === 2,
    `found ${updateWrites.length} — moveProject and convertEmployerToProject's re-parent`
  );
  const moveIdx = LIB.indexOf("export async function moveProject");
  const nextFn = LIB.indexOf("export async function", moveIdx + 10);
  const moveBody = LIB.slice(moveIdx, nextFn);
  check(
    "3 — ⚠⚠ `moveProject` is one of them",
    /data: \{ employer_id: target, sort_order: count \* 10 \}/.test(moveBody)
  );
  check(
    "3 — ⚠ and the other is the conversion's orphan rescue, not a general mover",
    /where: \{ employer_id: employer\.id \},\s*data: \{ employer_id: target\.id \},/.test(LIB),
    "E296 — a converted employer's children would otherwise be alive but invisible"
  );
  check(
    "3 — ⚠ it re-checks ownership on BOTH ids",
    /where: \{ id: projectId, provider_profile_id: profileId \}/.test(moveBody) &&
      /where: \{ id: employerId, provider_profile_id: profileId \}/.test(moveBody),
    "a foreign id must resolve to NOTHING, not to somebody else's row"
  );
  /* ⚠ `updateProject` MUST NOT HAVE LEARNED IT — the brief's STOP condition. */
  const upIdx = LIB.indexOf("export async function updateProject");
  const upBody = LIB.slice(upIdx, LIB.indexOf("export async function", upIdx + 10));
  check(
    "3 — ⚠ ABSENCE: `updateProject` still knows nothing about employer_id",
    !/employer_id/.test(upBody),
    "teaching it would duplicate moveProject's double ownership check"
  );
  /* ⚠ AND THE CLIENT POSTS IT FROM EXACTLY ONE PLACE. */
  const posts = STEP.match(/action: "moveProject"/g) ?? [];
  check(
    "3 — ⚠ the component posts moveProject from ONE place (`moveTo`)",
    posts.length === 1,
    `found ${posts.length}`
  );
  check("3 — and every surface goes through it", (STEP.match(/moveTo\(/g) ?? []).length >= 3);
  check(
    "3 — the route still reads a meaningful null",
    /body\.employerId \? String\(body\.employerId\) : null/.test(ROUTE)
  );
}

/* ═══ 4 · ATTACH AN EXISTING PROJECT FROM INSIDE A JOB ═══════════════════
   Mutate: remove → red.                                                     */
{
  check(
    "4 — ⚠ the attach control exists inside the employer card",
    /Attach an existing project \(\{unplaced\.length\}\)/.test(STEP)
  );
  check(
    "4 — ⚠ one click moves it, with no modal and no retyping",
    /const pick = unplaced\.find\(\(u\) => u\.id === ev\.target\.value\);[\s\S]{0,80}moveTo\(pick, e\.id\)/.test(STEP)
  );
  /* ⚠⚠ AND NOTHING WHEN THERE IS NOTHING TO ATTACH. `E125` — colour and
     presence carry state; an empty picker beside `+ Add Project` is worse than
     no picker, because an empty dropdown reads as a broken control. */
  /*
    ⚠⚠ SCOPED TO THE ATTACH CONTROL, NOT THE FILE — the mutation test is what
    found this. `{unplaced.length > 0 && (` appears TWICE: once here and once on
    the "Projects not yet under a job" panel. A whole-file match stayed GREEN
    with this control's guard removed, because the panel's identical guard
    satisfied it. ⚠ THE ANCHOR-MISS CLASS: the string was real, the occurrence
    was the wrong one. The window below starts at the control's own unique text
    and looks BACKWARDS for the guard that must immediately precede it.
  */
  const attachAt = STEP.indexOf("Attach an existing project to {");
  const beforeAttach = STEP.slice(Math.max(0, attachAt - 260), attachAt);
  check(
    "4 — ⚠⚠ it is absent when `unplaced` is empty",
    attachAt > 0 && /\{unplaced\.length > 0 && \(/.test(beforeAttach),
    "an empty picker reads as broken; its absence reads as 'nothing waiting'"
  );
}

/* ═══ 5 · BOTH EXISTING PROJECT ROUTES SURVIVE ══════════════════════════
   Mutate: remove either → red. ⚠ `E124` made the second one-click.          */
{
  check("5 — ⚠ the in-card `+ Add Project` survives", /\+ Add Project/.test(STEP));
  check(
    "5 — ⚠ `Add projects within this job` survives (E124, one click)",
    /Add projects within this job/.test(STEP)
  );
  check(
    "5 — ⚠ and it still expands AND opens the modal",
    /setOpenId\(e\.id\);\s*openProject\(e\.id\);/.test(STEP),
    "E124 — a link that only changed its own label"
  );
  check("5 — `+ Add Company` still sits at list level", /\+ Add Company/.test(STEP));
  /* ⚠⚠ AND NO THIRD CREATION ROUTE. `E412` WS-1b asked whether a list-level
     `+ Add Project` should create unplaced or ask in the modal; Scott's walk
     answered "neither" — the verb people want at list level is ATTACH. */
  check(
    "5 — ⚠⚠ ABSENCE: no third creation route was added",
    (STEP.match(/\+ Add Project/g) ?? []).length <= 2,
    "the answer to E412 WS-1b was 'neither'"
  );
}

/* ═══ 6 · A ROW WITH NO ROLE TITLE RENDERS ITS NAME EXACTLY ONCE ═════════
   Mutate: restore `{e.roleTitle || e.name}` above the company line → red.
   ⚠ RUN AGAINST THE REAL FUNCTIONS, with Scott's own row.                   */
{
  /* ⚠ MEASURED FROM THE DATABASE BEFORE ANY EDIT — `test15@panameer.com`
     employer [20]. Note `role_title` is the EMPTY STRING, not null. */
  const SCOTT = {
    name: "Oracle Cloud Content & AI-Native Application Developer",
    roleTitle: "",
  };
  check("6 — ⚠⚠ the heading is the name when there is no role title", cardTitle(SCOTT) === SCOTT.name);
  check(
    "6 — ⚠⚠ and the company line is then EMPTY — the name is printed ONCE",
    cardCompany(SCOTT) === "",
    `got ${JSON.stringify(cardCompany(SCOTT))}`
  );
  /* ⚠ `""` AND `null` MUST BEHAVE THE SAME — the empty string is what the
     parser actually writes, and `||` and `??` disagree about it. */
  check("6 — a null role title behaves identically", cardCompany({ ...SCOTT, roleTitle: null }) === "");
  check("6 — a whitespace role title behaves identically", cardCompany({ ...SCOTT, roleTitle: "   " }) === "");
  /* ⚠ WITH a role title, BOTH lines carry something and they differ. */
  const FULL = { name: "Panameer", roleTitle: "Founder" };
  check("6 — with a role title the heading is the WORK", cardTitle(FULL) === "Founder");
  check("6 — and the line under it is the COMPANY", cardCompany(FULL) === "Panameer");
  check("6 — ⚠ the two lines are never the same string", cardTitle(FULL) !== cardCompany(FULL));
  /* ⚠ A NAMELESS ROW still says something, via the one shared label. */
  const BARE = { name: "", roleTitle: "" };
  check("6 — a row with neither falls back to the shared label", cardTitle(BARE) === "Independent");
  check("6 — and prints it once", cardCompany(BARE) === "");
  /* ⚠ THE JSX HONOURS IT — the company line is conditional, and the separator
     moves with it so a promoted description cannot start with " — ". */
  check("6 — the company line is conditional in the JSX", /\{cardCompany\(e\) && \(/.test(STEP));
  check(
    "6 — ⚠ and the em-dash separator moves with it",
    /cardCompany\(e\)\s*\?\s*` — \$\{e\.description\}`\s*:\s*e\.description/.test(STEP),
    "a description promoted to the start of its line must not begin with ' — '"
  );
}

/* ═══ 7 · `employerToProjectData` TREATS "" AND null ALIKE ═══════════════
   Mutate: pass `""` as the name → red.                                      */
{
  const base: EmployerScalars = {
    name: "Panameer", role_title: "Founder", location: null, city: null, state: null,
    country: null, start_date: null, end_date: null, is_current: false,
    description: null, logo_url: null, contact_email: null,
    software_suite: null, job_role_type_id: null,
  };
  /* ⚠⚠ THE DEFECT SCOTT SAW: the row was named after the COMPANY, and its
     `client_name` was the same company — it stated the company twice and the
     work not once. */
  check(
    "7 — ⚠⚠ the converted project is named for the WORK",
    employerToProjectData(base, "Panameer").name === "Founder",
    `got ${JSON.stringify(employerToProjectData(base, "Panameer").name)}`
  );
  check(
    "7 — ⚠ so name and client_name no longer say the same thing",
    employerToProjectData(base, "Panameer").name !== employerToProjectData(base, "Panameer").client_name
  );
  /* ⚠⚠ THE OPERATOR. `??` falls through on null/undefined only; the parser
     writes `""`. `employerDisplayName` treats "" as NO name — these two must
     agree, and before this they did not. */
  check(
    "7 — ⚠⚠ an EMPTY role title falls through to the company",
    employerToProjectData({ ...base, role_title: "" }, "X").name === "Panameer",
    "`??` would have returned the empty string"
  );
  check(
    "7 — ⚠⚠ an EMPTY company falls through to the shared label",
    employerToProjectData({ ...base, role_title: "", name: "" }, "X").name === "Independent"
  );
  check(
    "7 — ⚠ and `null` behaves identically to `\"\"` in both positions",
    employerToProjectData({ ...base, role_title: null, name: null }, "X").name ===
      employerToProjectData({ ...base, role_title: "", name: "" }, "X").name
  );
  check(
    "7 — whitespace counts as empty too",
    employerToProjectData({ ...base, role_title: "   " }, "X").name === "Panameer"
  );
  check("7 — the map goes through `clean`", /clean\(e\.role_title, 200\) \?\? clean\(e\.name, 200\)/.test(RECLASS));
}

/* ═══ 8 · ⚠ THE ROUND TRIP STILL HOLDS AFTER WS-4 ═══════════════════════
   Undo depends on it: it calls the opposite action with the remembered name. */
{
  const FULL: EmployerScalars = {
    name: "Acme Energy", role_title: "Lead Consultant", location: "Houston, TX",
    city: null, state: null, country: null,
    start_date: new Date("2021-03-01T00:00:00.000Z"), end_date: null,
    is_current: true, description: "Ran it.", logo_url: null,
    contact_email: null, software_suite: null, job_role_type_id: "role-1",
  };
  const back = projectToEmployerData(employerToProjectData(FULL, "Northwind"), "Acme Energy");
  check("8 — the employer name comes back", back.name === "Acme Energy");
  check("8 — ⚠ the role title survives, which is what Undo restores", back.role_title === "Lead Consultant");
  check("8 — the description survives", back.description === "Ran it.");
  check("8 — the dates survive", back.start_date?.getTime() === FULL.start_date?.getTime());
  check("8 — the role type survives under its other name", back.job_role_type_id === "role-1");
  /* ⚠ THE NAME IS STILL TAKEN FROM THE CALLER, NEVER DERIVED — that is why
     WS-4's change to the forward direction cannot break Undo. */
  check("8 — ⚠ `projectToEmployerData` takes the name as an argument", /function projectToEmployerData\(p: ProjectScalars, name: string\)/.test(RECLASS));
  check("8 — client_name is still taken from the caller", employerToProjectData(FULL, "Northwind").client_name === "Northwind");
}

/* ═══ 9 · BOTH VERBS, NOT ONE SLOT WON BY THE NEWER ONE ═════════════════
   Mutate: drop either → red.                                                */
{
  check("9 — the shell takes a leave verb", /leaveLabel\?: string;/.test(SHELL));
  check("9 — ⚠ and renders it", /\{leaveLabel && onLeave && \(/.test(SHELL));
  check("9 — ⚠⚠ the secondary is UNCHANGED and still rendered", /\{secondaryLabel && onSecondary && \(/.test(SHELL));
  check(
    "9 — ⚠⚠ both live in the SAME centre slot",
    /flex flex-1 items-center justify-center gap-4/.test(SHELL),
    "a fourth column moves the centre on every wizard in the product"
  );
  check(
    "9 — ⚠ the divider appears only when BOTH do",
    /\{secondaryLabel && onSecondary && leaveLabel && onLeave && \(/.test(SHELL),
    "one verb must not gain a stray separator"
  );
  /* ⚠ EVERY COUNTED PROVIDER STEP GETS IT, because it is in `shell()` and not
     on each step — the failure mode `E406` fixed for the step counter. */
  check(
    "9 — ⚠⚠ `Finish later` is in the provider's shared `shell()`",
    /leaveLabel: "Finish later",\s*onLeave: \(\) => router\.push\("\/dashboard"\),/.test(WIZ)
  );
  /* ⚠ AND `Skip for Now` STILL EXISTS ON THE STEPS THAT HAD IT. Three call
     sites; the brief's point is that neither verb replaced the other. */
  const skips = WIZ.match(/secondaryLabel: [^,\n]*"Skip for Now"/g) ?? [];
  check(
    "9 — ⚠⚠ `Skip for Now` survives on every step that had it",
    skips.length === 3,
    `found ${skips.length} — E406 WS-2 stopped precisely because adding one would take the other away`
  );
}

/* ═══ 10 · ⚠ THE REQUESTER WIZARD IS UNCHANGED ══════════════════════════
   An absence-assertion that WS-6 did not leak across the shared shell.      */
{
  check(
    "10 — ⚠⚠ ABSENCE: the requester passes no leave verb",
    !/leaveLabel/.test(REQ),
    "it renders exactly what it rendered before"
  );
  check("10 — and still passes its own secondary", /secondaryLabel: "Finish later",/.test(REQ));
  /* ⚠ THE SHELL CHANGE IS INERT WITHOUT THE PROP, and that is structural rather
     than a promise: the divider is conditional on BOTH, and `gap` has no effect
     on a single child. */
  check(
    "10 — ⚠ the leave button is conditional on the prop",
    /\{leaveLabel && onLeave && \(/.test(SHELL)
  );
  check(
    "10 — ⚠ ABSENCE: no unconditional render was added to the slot",
    !/<button[\s\S]{0,120}\{leaveLabel\}[\s\S]{0,40}<\/button>\s*<\/div>\s*<div className="flex flex-1 justify-end">/.test(
      SHELL.replace(/\{leaveLabel && onLeave && \([\s\S]*?\)\}/g, " ")
    )
  );
}

/* ═══ 11 · ⚠⚠ A SECOND UPLOAD PURGES BOTH COPIES ═══════════════════════
   Mutate: purge only `raw_text` → red. A half-delete is the failure this
   assertion exists to catch.                                                */
{
  check("11 — the purge exists", /export async function purgeSupersededResumes\(/.test(IMPORT));
  check(
    "11 — ⚠ it nulls the extracted text",
    /data: \{ raw_text: null, storage_path: null \}/.test(IMPORT)
  );
  check(
    "11 — ⚠⚠ AND deletes the object from the private bucket",
    /if \(await deleteResumeFile\(row\.storage_path\)\) objects \+= 1;/.test(IMPORT),
    "nulling the column and leaving the file is the APPEARANCE of deletion"
  );
  check("11 — the bucket delete helper exists", /export async function deleteResumeFile\(/.test(STORAGE));
  check("11 — ⚠ and it removes from the résumé bucket", /\.from\(RESUME_BUCKET\)\s*\.remove\(\[objectPath\]\)/.test(STORAGE));
  /* ⚠ A MISSING OBJECT MUST NOT FAIL THE NEW UPLOAD. */
  check("11 — ⚠ a missing object is a success", /if \(!objectPath\.trim\(\)\) return true;/.test(STORAGE));
  check("11 — ⚠ and the helper never throws", /return false;\s*\}\s*\}/.test(STORAGE));
  /* ⚠ SCOPED, AND EXCLUDING THE ROW JUST WRITTEN. */
  check("11 — scoped to this profile", /provider_profile_id: profileId,/.test(IMPORT));
  check(
    "11 — ⚠⚠ and it never eats the import that triggered it",
    /id: \{ not: keepId \},/.test(IMPORT)
  );
  /* ⚠ WHAT SURVIVES IS NAMED IN ONE PLACE, so the decision is reversible. */
  check("11 — the kept payload is named", /export const SUPERSEDED_RESUME_PAYLOAD/.test(RETENTION));
  check("11 — ⚠ `parsed` is deliberately kept", /kept: \["parsed", "gaps"/.test(RETENTION));
  check(
    "11 — ⚠ ABSENCE: `parsed` is not nulled",
    !/parsed: null/.test(IMPORT),
    "the review screen reads it — purging would blank a live screen"
  );
}

/* ═══ 12 · ⚠⚠ A FAILED PARSE PURGES NOTHING ════════════════════════════
   Mutate: purge before the new import succeeds → red. This is the assertion
   that stops a bad parse costing somebody their résumé.                     */
{
  /*
    ⚠⚠ EXACTLY ONE CALL SITE, AND IT IS THE ONE AFTER THE ROW. The mutation test
    found this: INSERTING a second `purgeSupersededResumes(profileId, "")` above
    the row create left this section GREEN, because `indexOf` still found the
    correct call further down and only asked whether IT was late enough.
    ⚠ An ordering assertion that only checks the position of the RIGHT call says
    nothing about a WRONG one added beside it.
  */
  const callSites = [...IMPORT.matchAll(/await purgeSupersededResumes\(/g)];
  check(
    "12 — ⚠⚠ the purge is called exactly ONCE",
    callSites.length === 1,
    `found ${callSites.length}`
  );
  const purgeAt = IMPORT.indexOf("await purgeSupersededResumes(profileId, row.id);");
  const rowAt = IMPORT.indexOf('status: "PARSED"');
  const failAt = IMPORT.indexOf('status: "FAILED"');
  check("12 — the call site was located", purgeAt > 0 && rowAt > 0 && failAt > 0);
  check(
    "12 — ⚠⚠ the purge runs AFTER the successful row is written",
    purgeAt > rowAt,
    `purge@${purgeAt} parsedRow@${rowAt}`
  );
  check(
    "12 — ⚠⚠ and the FAILED branch returns before ever reaching it",
    failAt < purgeAt && /error: message,\s*\};\s*\}/.test(IMPORT),
    "an unreadable file must purge nothing at all"
  );
  check(
    "12 — ⚠ the rule is written down, not just implied by line order",
    /export const PURGE_ONLY_AFTER_SUCCESS = true;/.test(RETENTION)
  );
  /* ⚠ AND NO NUMBER WAS INVENTED. Scott's rule is supersession; the day-count
     mechanism cannot express it and was left alone rather than bent. */
  check(
    "12 — ⚠⚠ `RESUME_RETENTION_DAYS` is STILL null",
    /export const RESUME_RETENTION_DAYS: number \| null = null;/.test(RETENTION),
    "E404's protection is untouched — a time-based purge is still undecided"
  );
  check(
    "12 — ⚠ and the purge does not consult the clock",
    !/retentionCutoff/.test(IMPORT),
    "supersession has no cutoff"
  );
}

if (failures.length) {
  console.error(`\ncheck:project-parent — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:project-parent — ${pass}/${pass} passed`);
