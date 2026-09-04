/**
 * `check:reclassify` — the field map, which is the part that silently rots
 * (`P1-J1.4-E296` / `P1-J1.4-E307`).
 *
 *   1  EVERY `Employer` SCALAR HAS A DESTINATION. ⚠ The list is ENUMERATED here
 *      AND read back out of `prisma/schema.prisma`, so adding a column to
 *      `Employer` later FAILS THIS HARNESS instead of quietly disappearing on
 *      the next conversion.
 *   2  ROUND TRIP: employer → project → employer returns every mapped field
 *      unchanged. ⚠ THIS IS THE TEST THAT PROTECTS UNDO — undo is the inverse
 *      conversion, not a snapshot, so if the map is not lossless then undo lies.
 *   3  `job_skills` / `artifacts` MOVE RATHER THAN CASCADE — asserted as a
 *      STATIC SCAN of the function body, proving the `updateMany` calls precede
 *      the `delete`. Said plainly because it is a scan and not a runtime test:
 *      the ordering is the correctness argument and a scan is what can see it
 *      without a database.
 *   4  `projectData()` IS NOT ON THE CONVERSION PATH. It requires client name,
 *      description, role type and dates; a parser-created employer has none of
 *      them guaranteed, so routing a conversion through it would reject exactly
 *      the rows this feature exists to rescue.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SCAN, reusing `check-community.ts`'s
 * `strip()` — this file and `employers.ts` both discuss the very calls the scan
 * looks for.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  employerToProjectData,
  projectToEmployerData,
  describeProjectLoss,
  type EmployerScalars,
} from "@/lib/employers";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const EMPLOYERS = join("src", "lib", "employers.ts");
const SCHEMA = join("prisma", "schema.prisma");
check(`the file this guard is about exists: ${EMPLOYERS}`, existsSync(EMPLOYERS));
const lib = strip(readFileSync(EMPLOYERS, "utf8"));
const schema = readFileSync(SCHEMA, "utf8");

/** The scalar columns of one model, straight out of the schema. */
function modelScalars(model: string): string[] {
  const m = new RegExp(`^model ${model} \\{([\\s\\S]*?)^\\}`, "m").exec(schema);
  if (!m) return [];
  return m[1]
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, "").trim())
    .filter((l) => l && !l.startsWith("@@") && !l.startsWith("///"))
    .map((l) => /^(\w+)\s+(\S+)/.exec(l))
    .filter((x): x is RegExpExecArray => Boolean(x))
    /* Relations and list types are not scalars. */
    .filter((x) => !/\[\]$/.test(x[2]) && !/^(Employer|Project|ProviderProfile|RoleType|Specialization|Artifact|JobSkill)\??$/.test(x[2]))
    .map((x) => x[1]);
}

// ---------------------------------------------------------------------------
// GUARD 1 — every Employer scalar has a destination
// ---------------------------------------------------------------------------

/*
  ⚠⚠ THE ENUMERATION. Each Employer column is either MAPPED to a Project column,
  FOLDED into one, or deliberately NOT CARRIED with a stated reason. A column
  that is in the schema and not in this table fails the build.
*/
const EMPLOYER_DISPOSITION: Record<string, string> = {
  id: "not carried — the new row gets its own",
  provider_profile_id: "carried by the writer, not the map (owner-scoped)",
  name: "-> Project.name",
  role_title: "-> Project.role_title (added by E296)",
  location: "-> Project.location (added by E296)",
  city: "folded into Project.location when location is empty",
  state: "folded into Project.location when location is empty",
  country: "folded into Project.location when location is empty",
  start_date: "-> Project.start_date",
  end_date: "-> Project.end_date",
  is_current: "-> Project.is_current",
  description: "-> Project.description",
  logo_url: "-> Project.logo_url",
  contact_email: "-> Project.contact_email",
  software_suite: "-> Project.software_suite",
  job_role_type_id: "-> Project.role_type_id (both FK to RoleType)",
  sort_order: "not carried — recomputed in the destination",
  created_at: "not carried — database default",
  updated_at: "not carried — database default",
};

const employerCols = modelScalars("Employer");
check("1 — the Employer model was parsed out of the schema", employerCols.length > 5, `got ${employerCols.length}`);
for (const col of employerCols) {
  check(
    `1 — Employer.${col} has a stated destination`,
    Boolean(EMPLOYER_DISPOSITION[col]),
    "add it to EMPLOYER_DISPOSITION and to the map, or say why it is not carried"
  );
}
/* And the reverse: nothing in the table that is no longer a column. */
for (const col of Object.keys(EMPLOYER_DISPOSITION)) {
  check(`1 — the disposition for "${col}" still matches a real column`, employerCols.includes(col));
}
/* ⚠ THE TWO NEW PROJECT COLUMNS MUST EXIST, or the map is lossy again. */
const projectCols = modelScalars("Project");
check("1 — Project.role_title exists", projectCols.includes("role_title"));
check("1 — Project.location exists", projectCols.includes("location"));
check(
  "1 — Project.employer_id is still SetNull, NOT Cascade",
  /employer\s+Employer\?\s+@relation\([^)]*onDelete:\s*SetNull/.test(schema),
  "deleting a job must not destroy the project history under it"
);

// ---------------------------------------------------------------------------
// GUARD 2 — the round trip, which is what protects Undo
// ---------------------------------------------------------------------------

const FULL: EmployerScalars = {
  name: "Acme Energy",
  role_title: "Lead Oracle Cloud Procurement Consultant",
  location: "Houston, TX",
  city: null,
  state: null,
  country: null,
  start_date: new Date("2021-03-01T00:00:00.000Z"),
  end_date: new Date("2023-08-31T00:00:00.000Z"),
  is_current: false,
  description: "Ran the procurement workstream.",
  logo_url: "/logo.png",
  contact_email: "ap@acme.test",
  software_suite: "ORACLE" as EmployerScalars["software_suite"],
  job_role_type_id: "role-1",
};

const there = employerToProjectData(FULL, "Northwind");
/* ⚠ `FULL.name` IS NOW NULLABLE (`P1-J1.4-E373`); the fixture always sets it, so
   the assertion is unchanged in meaning — the `??` only satisfies the type. */
const back = projectToEmployerData(there, FULL.name ?? "");

for (const key of Object.keys(FULL) as (keyof EmployerScalars)[]) {
  if (["city", "state", "country"].includes(key)) continue; // folded — asserted below
  const a = FULL[key];
  const b = back[key];
  const same = a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b;
  check(`2 — round trip preserves ${key}`, same, `${String(a)} -> ${String(b)}`);
}
check("2 — the role TITLE survives the round trip", back.role_title === FULL.role_title, "this is the field that had no home before E296");
check("2 — the location survives the round trip", back.location === "Houston, TX");
check("2 — the role TYPE is carried under its other name", there.role_type_id === FULL.job_role_type_id);
check("2 — client_name is taken from the caller, never derived", there.client_name === "Northwind");

/* ⚠ THE FOLD. Four Employer place fields, one Project place field. */
const parts = employerToProjectData(
  { ...FULL, location: null, city: "Houston", state: "TX", country: "United States" },
  "X"
);
check("2 — city/state/country fold into location when location is empty", parts.location === "Houston, TX, United States");
check("2 — an explicit location always wins over the parts", employerToProjectData({ ...FULL, city: "Nowhere" }, "X").location === "Houston, TX");
check("2 — a wholly placeless employer yields a null location, not an empty string", employerToProjectData({ ...FULL, location: null }, "X").location === null);
/*
  ⚠ THE ONE ASYMMETRY, ASSERTED SO IT IS A DECISION AND NOT A BUG: coming back,
  `location` carries the whole string and city/state/country stay null. Splitting
  "Houston, TX" into parts again would be guessing, and the round trip above only
  holds because this direction invents no structure.
*/
check("2 — coming back, the parts are NOT re-invented", back.city === null && back.state === null && back.country === null);

/* A parser-created employer — nothing guaranteed. This is the rescue case. */
const BARE: EmployerScalars = {
  name: "Some Client",
  role_title: null, location: null, city: null, state: null, country: null,
  start_date: null, end_date: null, is_current: false,
  description: null, logo_url: null, contact_email: null,
  software_suite: null, job_role_type_id: null,
};
const bareOut = employerToProjectData(BARE, "Some Client");
check("2 — ⚠ a bare parser-created employer converts at all", bareOut.name === "Some Client");
check("2 — with no dates", bareOut.start_date === null && bareOut.end_date === null);
check("2 — with no role type", bareOut.role_type_id === null);
check("2 — with no description", bareOut.description === null);
check("2 — and it round-trips too", projectToEmployerData(bareOut, BARE.name ?? "").name === "Some Client");

/* The loss sentence is enumerated, never generic. */
check(
  "2 — the loss sentence names counts",
  describeProjectLoss({ outcomes: 3, tools: 5, highlights: 4, fields: [] }) ===
    "3 outcomes, 5 tools and 4 highlights will be removed — a job has nowhere to keep them."
);
check("2 — it singularises", describeProjectLoss({ outcomes: 1, tools: 0, highlights: 0, fields: [] }).startsWith("1 outcome will be removed"));
check("2 — it names fields as well as counts", describeProjectLoss({ outcomes: 0, tools: 0, highlights: 0, fields: ["the video"] }).startsWith("the video will be removed"));
check("2 — nothing to lose means no sentence at all", describeProjectLoss({ outcomes: 0, tools: 0, highlights: 0, fields: [] }) === "");
check(
  "2 — ⚠ the warning is never generic",
  !/some data|may be lost|cannot be undone/i.test(describeProjectLoss({ outcomes: 2, tools: 0, highlights: 0, fields: [] }))
);

// ---------------------------------------------------------------------------
// GUARD 3 — skills and artifacts MOVE before the delete (STATIC SCAN)
// ---------------------------------------------------------------------------

function bodyOf(fn: string): string {
  const i = lib.indexOf(fn);
  if (i < 0) return "";
  const next = lib.indexOf("\nexport ", i + fn.length);
  return lib.slice(i, next < 0 ? lib.length : next);
}

for (const [fn, from, del] of [
  ["export async function convertEmployerToProject", "employer_id", "tx.employer.delete"],
  ["export async function convertProjectToEmployer", "project_id", "tx.project.delete"],
] as const) {
  const body = bodyOf(fn);
  const short = fn.replace("export async function ", "");
  check(`3 — ${short} exists`, body.length > 0);
  const skills = body.indexOf("jobSkill.updateMany");
  const arts = body.indexOf("artifact.updateMany");
  const deleteAt = body.indexOf(del);
  check(`3 — ${short} MOVES job_skills`, skills >= 0, "they are onDelete: Cascade — not moving them destroys them");
  check(`3 — ${short} MOVES artifacts`, arts >= 0);
  check(`3 — ⚠ ${short} moves skills BEFORE the delete`, skills >= 0 && deleteAt > skills, "Cascade would eat them");
  check(`3 — ⚠ ${short} moves artifacts BEFORE the delete`, arts >= 0 && deleteAt > arts, "Cascade would eat them");
  check(`3 — ${short} moves rather than copies (${from} is cleared)`, new RegExp(`${from}:\\s*null`).test(body));
  check(`3 — ${short} runs in one transaction`, /prisma\.\$transaction/.test(body));
  check(`3 — ${short} recomputes the rollup`, /afterJobChange/.test(body));
}

/* ⚠ AND THE EMPLOYER'S OWN PROJECTS ARE RE-PARENTED, not orphaned by SetNull. */
const e2p = bodyOf("export async function convertEmployerToProject");
const reparentAt = e2p.indexOf("tx.project.updateMany");
check(
  "3 — ⚠ the employer's own projects are RE-PARENTED to the target",
  reparentAt >= 0,
  "SetNull would leave them alive but invisible — listEmployers only reaches projects through employers"
);
check("3 — and re-parented before the delete", reparentAt >= 0 && e2p.indexOf("tx.employer.delete") > reparentAt);
check("3 — the re-parent count is reported back", /reparentedProjects/.test(e2p));
check("3 — a row cannot become its own parent", /targetEmployerId === employerId/.test(e2p));
check(
  "3 — ⚠ a validated project refuses to become a job",
  /validation_status === "VALIDATED"/.test(bodyOf("export async function convertProjectToEmployer")),
  "a client confirmed that work happened"
);

// ---------------------------------------------------------------------------
// GUARD 4 — projectData() is not on the conversion path
// ---------------------------------------------------------------------------

for (const fn of [
  "export async function convertEmployerToProject",
  "export async function convertProjectToEmployer",
  "export async function moveProject",
]) {
  check(
    `4 — ⚠ ${fn.replace("export async function ", "")} does NOT call projectData()`,
    !/projectData\s*\(/.test(bodyOf(fn)),
    "it requires client name, description, role type and dates — a parser-created employer has none of them"
  );
}
check(
  "4 — projectData still guards the MODAL path",
  /projectData\s*\(/.test(bodyOf("export async function createProject")) &&
    /projectData\s*\(/.test(bodyOf("export async function updateProject")),
  "the required set was not weakened for everyone else"
);

/* moveProject — ownership on BOTH ids, and null means detach. */
const mv = bodyOf("export async function moveProject");
check("4 — moveProject re-checks the PROJECT against the profile", /prisma\.project\.findFirst[\s\S]{0,160}provider_profile_id: profileId/.test(mv));
check("4 — moveProject re-checks the EMPLOYER against the profile", /prisma\.employer\.findFirst[\s\S]{0,160}provider_profile_id: profileId/.test(mv));
check("4 — moveProject treats null as DETACH rather than an error", /employerId\)\s*\{/.test(mv) && /let target: string \| null = null/.test(mv));
check("4 — moveProject re-sorts in the destination", /sort_order: count \* 10/.test(mv));

/* WS-7 — the false comment is gone and the schema was not touched. */
check(
  "7 — the false 'projects cascade' claim is no longer stated as fact",
  !/Projects cascade with the employer \(schema onDelete: Cascade\), so deleting\n\s*\/\/ a job takes/.test(readFileSync(EMPLOYERS, "utf8")),
  "it is quoted as superseded now, not asserted"
);

// ---------------------------------------------------------------------------
// GUARD 5 — the pure module stays pure, or the client bundle breaks
// ---------------------------------------------------------------------------

/*
  ⚠⚠ `EmployersStep.tsx` IS A CLIENT COMPONENT AND RENDERS THE LOSS SENTENCE.
  Importing it from `lib/employers.ts` pulled `prisma` -> `pg` -> Node's `dns`
  into the BROWSER bundle and failed the build with *"Module not found: Can't
  resolve 'dns'"*. ⚠ `tsc` IS PERFECTLY HAPPY WITH THAT — only `npm run build`
  catches it, which is why it gets an assertion of its own.
*/
const RECLASSIFY = join("src", "lib", "reclassify.ts");
const STEP = join("src", "components", "onboarding", "EmployersStep.tsx");
check(`5 — the pure module exists: ${RECLASSIFY}`, existsSync(RECLASSIFY));
const pureSrc = existsSync(RECLASSIFY) ? readFileSync(RECLASSIFY, "utf8") : "";
check(
  "5 — ⚠ lib/reclassify.ts imports NO prisma",
  !/from ["']@\/lib\/prisma["']|from ["']\.\/prisma["']/.test(pureSrc),
  "a client component imports this module — prisma here breaks the browser bundle"
);
check(
  "5 — and imports nothing from lib/employers either",
  !/from ["']@\/lib\/employers["']/.test(pureSrc),
  "that would re-introduce prisma transitively"
);
const stepSrc = existsSync(STEP) ? strip(readFileSync(STEP, "utf8")) : "";
check(
  "5 — ⚠ the client component does NOT import lib/employers",
  !/from ["']@\/lib\/employers["']/.test(stepSrc),
  "import from @/lib/reclassify instead — going through employers.ts drags pg into the browser"
);
check(
  "5 — it imports the loss sentence from the pure module",
  /from ["']@\/lib\/reclassify["']/.test(stepSrc)
);
check(
  "5 — and the sentence is not re-typed in the component",
  !/will be removed —/.test(stepSrc),
  "one implementation, imported"
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:reclassify — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:reclassify — ${pass}/${pass} passed`);
