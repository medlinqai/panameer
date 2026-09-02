/**
 * `check:community-identity` — you post as a person, not an inbox
 * (`P1-ALL-E033` WS-5).
 *
 * ⚠ A SIBLING OF `check:community`, NOT AN EXTENSION OF IT. That harness guards
 * three unrelated things (the "messages" ban, the single `marked_helpful_at`
 * write path, the absent-not-zeroed profile block) and every one of its 60-odd
 * assertions is about the SIGNAL. Folding a profile-completeness gate into it
 * would have meant editing a green file to make room, and the standing rule is
 * that an existing assertion is never touched to accommodate new work. Two
 * files, two names, two exit codes.
 *
 *   1  `createThread` AND `createPost` BOTH CALL THE PREDICATE, and neither
 *      writes before it. A static scan, because the failure is a future edit
 *      that adds a third write path and forgets.
 *   2  ⚠⚠ NO READ PATH IS GATED. This is the assertion that protects the open
 *      board. A community nobody can read is a community nobody joins, and the
 *      easiest way to break that is to "tidy" the check up into a shared helper
 *      that the list and thread reads also call.
 *   3  `markHelpful` / `unmarkHelpful` ARE NOT GATED. Marking an answer helpful
 *      is a READER's act and it is the one signal the whole board runs on.
 *   4  THE PREDICATE LIVES IN EXACTLY ONE FILE, and the work-request post path
 *      uses that same one. ⚠ THIS IS WS-0's WHOLE POINT: two copies drift, and
 *      the day they disagree nobody can say which is the rule.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SOURCE SCAN, reusing `check-community.ts`'s
 * `strip()`. This file and the files it audits name the forbidden tokens in
 * their own prose; a scanner that read prose would fail on its own
 * documentation, and the fix for that is always to weaken the scanner.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  COMMUNITY_BAR,
  WORK_REQUEST_BAR,
  missingIdentity,
  subjectFromPerson,
  type IdentityField,
} from "@/lib/identity-bar";
import { COMMUNITY_REQUIREMENTS } from "@/lib/community-identity";
import { missingIdentityForPost, POST_REQUIREMENTS } from "@/lib/work-request-identity";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/* ⚠ VERBATIM FROM `scripts/check-community.ts`. */
const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const read = (p: string) => (existsSync(p) ? strip(readFileSync(p, "utf8")) : "");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const BAR = join("src", "lib", "identity-bar.ts");
const COMM = join("src", "lib", "community-identity.ts");
const FORUMS = join("src", "lib", "forums.ts");
const ROUTE = join("src", "app", "api", "community", "forums", "route.ts");
const COMPOSER = join("src", "components", "community", "ForumComposer.tsx");
const WRI = join("src", "lib", "work-request-identity.ts");

for (const f of [BAR, COMM, FORUMS, ROUTE, COMPOSER, WRI]) {
  check(`the file this guard is about exists: ${f}`, existsSync(f));
}
const forums = read(FORUMS);
const composer = read(COMPOSER);

/** The body of a top-level exported function, up to the next `export `. */
function bodyOf(src: string, signature: string): string {
  const i = src.indexOf(signature);
  if (i < 0) return "";
  const next = src.indexOf("\nexport ", i + signature.length);
  return src.slice(i, next < 0 ? src.length : next);
}

// ---------------------------------------------------------------------------
// GUARD 1 — both write paths call the predicate, and neither writes first
// ---------------------------------------------------------------------------

const WRITES = /prisma\s*\.\s*(forumThread|forumPost)\s*\.\s*(create|createMany|upsert)\s*\(|prisma\s*\.\s*\$transaction\s*\(/;

for (const fn of ["export async function createThread", "export async function createPost"]) {
  const body = bodyOf(forums, fn);
  check(`1 — ${fn.replace("export async function ", "")} exists`, body.length > 0);
  const gateAt = body.indexOf("requireIdentity(");
  check(
    `1 — ${fn.replace("export async function ", "")} calls the identity gate`,
    gateAt >= 0,
    "a throwaway address could post with no name, no face and no job title"
  );
  const writeAt = body.search(WRITES);
  check(
    `1 — ${fn.replace("export async function ", "")} gates BEFORE it writes`,
    gateAt >= 0 && writeAt >= 0 && gateAt < writeAt,
    "the row would already exist by the time the refusal threw"
  );
}
check(
  "1 — requireIdentity is defined once in the forums lib",
  (forums.match(/async function requireIdentity\s*\(/g) ?? []).length === 1
);
/* ⚠ THE ROUTE FORWARDS `e.code` RATHER THAN NAMING THE CONSTANT, which is the
   better shape — one line that cannot fall behind a new code. So the assertion
   is that the code EXISTS in the lib and that the route CARRIES it, not that the
   literal appears twice. That is what the rule always meant; the first draft of
   this check tested for the literal in both files and was red against correct
   code. Fixed by asserting the right thing, not by dropping the assertion. */
check(
  "1 — the refusal is its own code, distinguishable from a bad form",
  /IDENTITY_REQUIRED/.test(forums),
  "a client cannot tell 'fix your profile' from 'fix your form'"
);
check(
  "1 — the route forwards that code to the client",
  /code:\s*e\.code/.test(read(ROUTE))
);
check(
  "1 — the refusal carries its fields to the client",
  /fields/.test(read(ROUTE)),
  "without them the composer can only say 'complete your profile'"
);

// ---------------------------------------------------------------------------
// GUARD 2 — ⚠⚠ NO READ PATH IS GATED
// ---------------------------------------------------------------------------

const READ_FNS = [
  "export async function listBoards",
  "export async function getBoard",
  "export async function getThread",
  "export async function viewerPersonId",
];
for (const fn of READ_FNS) {
  const body = bodyOf(forums, fn);
  const name = fn.replace("export async function ", "");
  check(`2 — the read path ${name} exists`, body.length > 0);
  check(
    `2 — ⚠ the read path ${name} is NOT gated`,
    !/requireIdentity\s*\(|communityIdentityGaps/.test(body),
    "reading must stay open — a community nobody can read is a community nobody joins"
  );
}
/*
  ⚠ AND THE GATE MUST NOT SPREAD. Exactly two call sites in the whole codebase,
  both of them writes. This is what catches a future "tidy-up" that routes a read
  through the same helper.
*/
const allFiles = [...walk("src")].filter((f) => f !== FORUMS);
for (const f of allFiles) {
  check(
    `2 — ${f} does not call the forum write gate`,
    !/\brequireIdentity\s*\(/.test(strip(readFileSync(f, "utf8"))),
    "requireIdentity belongs to lib/forums.ts and to its two write paths only"
  );
}
const gateCalls = (forums.match(/(?<!function\s)\brequireIdentity\s*\(/g) ?? []).length;
check(
  "2 — the gate has exactly two call sites, and they are the two writes",
  gateCalls === 2,
  `found ${gateCalls}`
);

// ---------------------------------------------------------------------------
// GUARD 3 — marking helpful is a reader's act
// ---------------------------------------------------------------------------

for (const fn of ["export async function markHelpful", "export async function unmarkHelpful"]) {
  const body = bodyOf(forums, fn);
  const name = fn.replace("export async function ", "");
  check(`3 — ${name} exists`, body.length > 0);
  check(
    `3 — ⚠ ${name} is NOT gated`,
    !/requireIdentity\s*\(|communityIdentityGaps/.test(body),
    "gating it would suppress the one signal the board runs on"
  );
}

// ---------------------------------------------------------------------------
// GUARD 4 — one predicate, one home, shared with the work-request path
// ---------------------------------------------------------------------------

/*
  ⚠ THE RULE IS DEFINED IN `identity-bar.ts` AND NOWHERE ELSE. Any other file
  re-implementing the field tests is the drift WS-0 exists to prevent, so the
  scan looks for a second hand-rolled test of the same three columns.
*/
for (const f of [COMM, WRI, FORUMS]) {
  const body = read(f);
  check(
    `4 — ${f} does not re-implement the field tests`,
    !/photo_url\s*&&|!\s*\w*[Pp]hotoUrl\s*(\)|&&)/.test(body) ||
      f === BAR,
    "the comparison belongs to lib/identity-bar.ts"
  );
}
check(
  "4 — the community half delegates to the shared predicate",
  /missingIdentity\s*\(/.test(read(COMM)) && /COMMUNITY_BAR/.test(read(COMM))
);
check(
  "4 — the work-request half delegates to the SAME shared predicate",
  /missingIdentity\s*\(/.test(read(WRI)) && /WORK_REQUEST_BAR/.test(read(WRI)),
  "P1-J4-E025 has landed, so it must consume this — not keep its own copy"
);

/* The bars themselves — the difference is the point, not an oversight. */
check("4 — the community bar is exactly name, photo, job title", JSON.stringify(COMMUNITY_BAR) === JSON.stringify(["name", "photo", "jobTitle"]));
check("4 — ⚠ community requires NO company", !COMMUNITY_BAR.some((f) => f.startsWith("company") || f === "approvedCompany"));
check("4 — the work-request bar contains every community field", COMMUNITY_BAR.every((f) => WORK_REQUEST_BAR.includes(f)));
check("4 — the work-request bar adds the company on top", ["approvedCompany", "companyName", "companyCountry"].every((f) => WORK_REQUEST_BAR.includes(f as IdentityField)));

/* Behaviour, driven through the shared predicate itself. */
const EMPTY = {
  firstName: "", lastName: "", photoUrl: null, jobTitle: null,
  hasApprovedCompanyMembership: false, companyName: null, companyCountry: null,
};
const PERSON_OK = { ...EMPTY, firstName: "Ada", lastName: "Lovelace", photoUrl: "/p.jpg", jobTitle: "Analyst" };
check("4 — an empty person misses all three community fields", missingIdentity(EMPTY, COMMUNITY_BAR).length === 3);
check("4 — a complete person misses none", missingIdentity(PERSON_OK, COMMUNITY_BAR).length === 0);
check(
  "4 — ⚠ someone with no employer may still post to the community",
  missingIdentity(PERSON_OK, COMMUNITY_BAR).length === 0,
  "a student or someone between roles belongs here"
);
check(
  "4 — the same person still cannot POST A WORK REQUEST without a company",
  missingIdentityForPost(PERSON_OK).length === 3
);
check("4 — whitespace is not a name", missingIdentity({ ...PERSON_OK, firstName: "  " }, COMMUNITY_BAR).includes("name"));
check("4 — whitespace is not a job title", missingIdentity({ ...PERSON_OK, jobTitle: " " }, COMMUNITY_BAR).includes("jobTitle"));
check("4 — the order follows the bar, so the checklist is stable", JSON.stringify(missingIdentity(EMPTY, COMMUNITY_BAR)) === JSON.stringify(COMMUNITY_BAR));
check(
  "4 — subjectFromPerson maps the database shape",
  missingIdentity(subjectFromPerson({ first_name: "A", last_name: "B", photo_url: "/x", title: "T" }), COMMUNITY_BAR).length === 0
);

/* The copy differs per surface — that is deliberate — but neither may be vague. */
for (const key of COMMUNITY_BAR) {
  const r = COMMUNITY_REQUIREMENTS.find((x) => x.key === key);
  check(`4 — the community names a reason and a link for "${key}"`, Boolean(r?.field && r?.reason && r?.href));
}
for (const r of [...COMMUNITY_REQUIREMENTS, ...POST_REQUIREMENTS]) {
  check(
    `4 — "${r.key}" names the field rather than saying "complete your profile"`,
    !/complete your profile/i.test(`${r.field} ${r.reason}`)
  );
}
check(
  "4 — the two surfaces speak differently about the SAME field",
  COMMUNITY_REQUIREMENTS.find((r) => r.key === "photo")!.reason !==
    POST_REQUIREMENTS.find((r) => r.key === "photo")!.reason,
  "one predicate, two voices — if these converge, one of them is wrong for its surface"
);

/* The composer: disabled with the reason visible, never pointer-events:none. */
check(
  "4 — the composer disables its fields rather than trapping the pointer",
  /disabled=\{blocked\}/.test(composer) && !/pointer-events-none|pointerEvents/.test(composer),
  "the E306 rule — a keyboard user must be able to reach the explanation"
);
check(
  "4 — the composer renders the reason rather than hiding itself",
  /identityGaps\.map\s*\(/.test(composer)
);
check(
  "4 — no badge, score or reputation was added to the community in this brief",
  !/mentorState|reputation|badge|karma/i.test(composer)
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:community-identity — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:community-identity — ${pass}/${pass} passed`);
