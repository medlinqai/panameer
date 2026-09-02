/**
 * `check:transaction-gates` — the gate ladder (`P1-ALL-E034` WS-5).
 *
 *   1  EVERY SET IS DEFINED IN ONE FILE, and `SEARCHABLE` is the EXISTING
 *      `missingRequired()` rather than a copy. If publishing a profile and being
 *      searchable become two rules, they will disagree, and the whole argument
 *      for a set over a percentage is that there is exactly one rule to state.
 *   2  ⚠⚠ EVERY FIELD IN EVERY SET HAS A REASON. **A field with no reason fails
 *      the build.** This is the assertion that keeps Scott's rule alive after
 *      everyone has forgotten the brief: *"i did struggle with not being direct
 *      about the data i wanted and why the platform wanted that data."*
 *   3  ENROLL, SIT-A-TEST AND `setPackageStatus` ALL CHECK SERVER-SIDE.
 *   4  DRAFTS ARE NOT GATED — package drafts, and Learn browsing/reading.
 *
 * ⚠ AND NO PERCENTAGE IS EVER A GATE. `VISIBILITY_THRESHOLD` still exists and is
 * still read by `isMarketplaceVisible`'s fallback; what is asserted here is that
 * nothing in the LADDER reads it.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SOURCE SCAN, reusing `check-community.ts`'s
 * `strip()` — this file and the files it audits name the forbidden tokens in
 * their own prose.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  GATE_SETS,
  GATE_REASONS,
  REQUIRED_PHRASE_TO_FIELD,
  COMMUNITY_BAR,
  LEARN_BAR,
  WORK_REQUEST_BAR,
  missingForLearn,
  missingForSearchable,
  missingForSell,
  type GateField,
} from "@/lib/identity-bar";
import { missingRequired } from "@/lib/completeness";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
const read = (p: string) => (existsSync(p) ? strip(readFileSync(p, "utf8")) : "");

const BAR = join("src", "lib", "identity-bar.ts");
const READS = join("src", "lib", "gate-reads.ts");
const COMPLETENESS = join("src", "lib", "completeness.ts");
const ENROLL = join("src", "app", "api", "learn", "enroll", "route.ts");
const TEST = join("src", "app", "api", "learn", "test", "[pathId]", "route.ts");
const PACKAGES = join("src", "lib", "packages.ts");
const NOTICE = join("src", "components", "GateNotice.tsx");

for (const f of [BAR, READS, COMPLETENESS, ENROLL, TEST, PACKAGES, NOTICE]) {
  check(`the file this guard is about exists: ${f}`, existsSync(f));
}
const bar = read(BAR);
const reads = read(READS);
const enroll = read(ENROLL);
const test = read(TEST);
const packages = read(PACKAGES);

// ---------------------------------------------------------------------------
// GUARD 1 — one file, and SEARCHABLE is the existing rule
// ---------------------------------------------------------------------------

const SETS = ["IDENTITY", "LEARN", "SEARCHABLE", "SELL"] as const;
for (const s of SETS) {
  check(`1 — the set ${s} is defined`, Array.isArray(GATE_SETS[s]) && GATE_SETS[s].length > 0);
}
check(
  "1 — SEARCHABLE delegates to the existing missingRequired()",
  /missingRequired\s*\(/.test(bar),
  "reimplementing it lets publishable and searchable drift apart"
);
check(
  "1 — the ladder does not re-test a required field by hand",
  !/headline\?\.trim\(\)|role_type_id\s*\)\s*missing|skills\.length\s*<\s*1/.test(
    bar.slice(bar.indexOf("GATE_REASONS"))
  ),
  "the comparison belongs to lib/completeness.ts"
);
/*
  ⚠⚠ THE MAP FROM `missingRequired()`'s PROSE TO KEYS MUST BE TOTAL. Drive the
  real function with a wholly empty subject: it returns every phrase it knows,
  and every one must map. This is what stops a new required field from silently
  losing its reason.
*/
const EMPTY_REQUIRED = {
  headline: null, role_type_id: null, skills: [], photoUrl: null,
  hasCompany: false, hasAddress: false, hasPhone: false,
};
const allPhrases = missingRequired(EMPTY_REQUIRED);
check("1 — missingRequired() still reports something", allPhrases.length > 0);
for (const phrase of allPhrases) {
  check(
    `1 — missingRequired()'s "${phrase}" maps to a key with a reason`,
    Boolean(REQUIRED_PHRASE_TO_FIELD[phrase]),
    "add its key and its member-interest reason — a required field without a reason is not allowed"
  );
}
check(
  "1 — SEARCHABLE covers exactly what missingRequired() reports",
  missingForSearchable(EMPTY_REQUIRED).length === allPhrases.length
);
check(
  "1 — nothing in the ladder reads the percentage",
  !/VISIBILITY_THRESHOLD|completeness\s*>=|percentComplete/.test(bar) && !/VISIBILITY_THRESHOLD/.test(reads),
  "a percentage can only say 72%; a set can name the field"
);
check(
  "1 — but the threshold itself was NOT deleted",
  typeof VISIBILITY_THRESHOLD === "number" && VISIBILITY_THRESHOLD === 80,
  "the brief says leave it where it is"
);

// ---------------------------------------------------------------------------
// GUARD 2 — ⚠⚠ EVERY FIELD IN EVERY SET HAS A REASON
// ---------------------------------------------------------------------------

const VAGUE = /complete your profile|\d+%|percent complete|progress bar|fill in your profile/i;
for (const s of SETS) {
  for (const f of GATE_SETS[s]) {
    const r = GATE_REASONS[f as GateField];
    check(`2 — ${s}.${f} HAS A REASON`, Boolean(r?.reason?.trim()), "a field with no reason does not belong in a set");
    check(`2 — ${s}.${f} names the field`, Boolean(r?.field?.trim()));
    check(`2 — ${s}.${f} links somewhere`, Boolean(r?.href?.startsWith("/")));
    check(
      `2 — ${s}.${f} is not vague and is not a percentage`,
      !VAGUE.test(`${r?.field} ${r?.reason}`),
      "never 'complete your profile', never a number"
    );
    check(
      `2 — ${s}.${f}'s reason is in the MEMBER's interest, not the platform's`,
      !/we need|our records|for compliance|required by us|platform requires/i.test(r?.reason ?? ""),
      "say what breaks for them"
    );
  }
}
/*
  Every declared reason is reachable from some bar — an orphan is dead copy.

  ⚠ THE LADDER IS FOUR RUNGS BUT THE FIELD SPACE HAS FIVE CONSUMERS.
  `WORK_REQUEST_BAR` (`P1-J4-E025`) shares this file and this key space, and it
  is the only thing that asks for `companyName` and `companyCountry`. Checking
  against four of the five reported those two as dead copy when they are not —
  so the check runs against ALL the bars, which is what "reachable" always meant.
  ⚠ NOT LOOSENED: an unused reason still fails.
*/
const ALL_BARS: GateField[][] = [...SETS.map((s) => GATE_SETS[s]), WORK_REQUEST_BAR];
for (const key of Object.keys(GATE_REASONS) as GateField[]) {
  check(
    `2 — the reason for "${key}" belongs to at least one bar`,
    ALL_BARS.some((b) => b.includes(key)),
    "an unused reason is dead copy — delete it or put the field in a set"
  );
}

/* The rungs are ordered, and the differences are deliberate. */
check("2 — IDENTITY is name, photo, job title", JSON.stringify(COMMUNITY_BAR) === JSON.stringify(["name", "photo", "jobTitle"]));
/*
  ── ⚠⚠ RE-HOMED, NOT WEAKENED (`P1-ALL-E034` correction, 2026-09-02) ─────────

  ⚠ SUPERSEDED, quoted: `check("2 — LEARN is IDENTITY plus exactly one field",
  LEARN_BAR.length === COMMUNITY_BAR.length + 1 && LEARN_BAR.includes("skill"))`.

  It asserted the OLD bar, which shipped and closed the product — 0 of 129
  accounts could enrol. ⚠ THE REPLACEMENT IS STRICTER, NOT LOOSER: the old one
  allowed any four-field bar containing `skill`; these pin the set EXACTLY and
  name each forbidden field, so putting one back fails a test and gets READ
  rather than slipping in as a quiet edit.
*/
check("2 — ⚠ LEARN is EXACTLY one field: a name", JSON.stringify(LEARN_BAR) === JSON.stringify(["name"]));
for (const f of ["photo", "jobTitle", "skill"] as const) {
  check(
    `2 — ⚠ LEARN does NOT require "${f}"`,
    !LEARN_BAR.includes(f),
    f === "skill"
      ? "the broadcast that justified it cannot run — no mail key, no digest sender, no trigger"
      : "it has no learner-facing reason; putting it back needs a brief"
  );
}
/*
  ⚠⚠ THE TWO SETS DIVERGED ON PURPOSE AND MUST NOT BE SILENTLY RE-MERGED.
  Community is people talking to each other and non-anonymity is the whole point
  there (`P1-ALL-E033`); learning is a person watching a video.
*/
for (const f of ["name", "photo", "jobTitle"] as const) {
  check(`2 — COMMUNITY still requires "${f}"`, COMMUNITY_BAR.includes(f));
}
check(
  "2 — ⚠ LEARN and COMMUNITY are NOT the same list any more",
  JSON.stringify(LEARN_BAR) !== JSON.stringify(COMMUNITY_BAR),
  "if these converge again, one of the two surfaces has the wrong bar"
);
check("2 — ⚠ LEARN asks for NO company", !LEARN_BAR.some((f) => f === "approvedCompany" || f.startsWith("company")));
check("2 — ⚠ LEARN asks for NO address and NO phone", !LEARN_BAR.includes("address") && !LEARN_BAR.includes("phone"));
check("2 — SELL contains everything SEARCHABLE does", GATE_SETS.SEARCHABLE.every((f) => GATE_SETS.SELL.includes(f)));
check("2 — SELL adds the payout method", GATE_SETS.SELL.includes("payoutMethod"));
/*
  ⚠⚠ ENTITY VALIDATION IS NOT IN ANY SET. `E282` is not built, and a gate on a
  check that does not exist is a gate nobody can ever pass. The work-request
  pattern applies: disclose, do not block.
*/
for (const s of SETS) {
  check(
    `2 — ⚠ ${s} does not require entity validation`,
    !GATE_SETS[s].some((f) => /entity|goodStanding|secretaryOfState|verified/i.test(f)),
    "E282 is unbuilt — disclose the state, do not block on it"
  );
}
check(
  "2 — no set asks for a TIN or a tax form directly",
  !SETS.some((s) => GATE_SETS[s].some((f) => /tin|taxForm|w9|w8/i.test(f))),
  "the money gate is its own brief"
);

/* Behaviour of each rung, driven through the real predicates. */
const PERSON_OK = {
  firstName: "Ada", lastName: "Lovelace", photoUrl: "/p.jpg", jobTitle: "Analyst",
  hasApprovedCompanyMembership: false, companyName: null, companyCountry: null,
};
/*
  ⚠ SUPERSEDED, quoted: `check("2 — LEARN blocks someone with no skill", ...)`.
  It is no longer true and it should not be — see the header of `LEARN_BAR`.
  ⚠ THE REPLACEMENT ASSERTS THE OPPOSITE **AND THE REASON**, so the day the
  broadcast can actually run, this is the test that has to be changed
  deliberately.
*/
check(
  "2 — ⚠ LEARN does NOT block someone with no skill",
  !missingForLearn({ ...PERSON_OK, skillCount: 0 }).some((g) => g.key === "skill"),
  "a field required for a feature that cannot run is what E034's own rule forbids"
);
check(
  "2 — ⚠ a learner with ONLY a name can enrol",
  missingForLearn({
    firstName: "Ada", lastName: "Lovelace", photoUrl: null, jobTitle: null,
    hasApprovedCompanyMembership: false, companyName: null, companyCountry: null,
    skillCount: 0,
  }).length === 0,
  "no photo, no job title, no skill — this is the case that was broken"
);
check(
  "2 — ⚠ LEARN still blocks a nameless learner",
  missingForLearn({
    firstName: null, lastName: null, photoUrl: "/p.jpg", jobTitle: "Analyst",
    hasApprovedCompanyMembership: false, companyName: null, companyCountry: null,
    skillCount: 5,
  }).some((g) => g.key === "name"),
  "a certificate is issued to a person — this is the one field that passes the rule"
);
check(
  "2 — and the LEARN refusal talks about the certificate, not about being hired",
  /certificate/i.test(
    missingForLearn({
      firstName: null, lastName: null, photoUrl: null, jobTitle: null,
      hasApprovedCompanyMembership: false, companyName: null, companyCountry: null,
      skillCount: 0,
    })[0]?.reason ?? ""
  ),
  "one sentence could not serve all three surfaces, so LEARN overrides the copy"
);
check("2 — LEARN passes someone with one skill and no employer", missingForLearn({ ...PERSON_OK, skillCount: 1 }).length === 0);
check("2 — SELL blocks with no payout method", missingForSell({ ...EMPTY_REQUIRED, payoutMethodCount: 0 }).some((g) => g.key === "payoutMethod"));
check(
  "2 — every gap carries its own reason, not a generic one",
  missingForLearn({ firstName: null, lastName: null, photoUrl: null, jobTitle: null, hasApprovedCompanyMembership: false, companyName: null, companyCountry: null, skillCount: 0 })
    .every((g) => g.reason.trim().length > 0) &&
    new Set(
      missingForLearn({ firstName: null, lastName: null, photoUrl: null, jobTitle: null, hasApprovedCompanyMembership: false, companyName: null, companyCountry: null, skillCount: 0 }).map((g) => g.reason)
    ).size === LEARN_BAR.length,
  "four fields sharing one sentence is a percentage with extra steps"
);

// ---------------------------------------------------------------------------
// GUARD 3 — all three writes check server-side
// ---------------------------------------------------------------------------

check("3 — enroll checks LEARN server-side", /learnGaps\s*\(/.test(enroll));
check("3 — the enroll refusal names its fields", /fields:\s*gaps/.test(enroll));
/* ⚠ BOTH HANDLERS. Serving the questions IS sitting the test. */
for (const handler of ["export async function GET", "export async function POST"]) {
  const i = test.indexOf(handler);
  const next = test.indexOf("\nexport ", i + handler.length);
  const body = i < 0 ? "" : test.slice(i, next < 0 ? test.length : next);
  check(`3 — the test route's ${handler.includes("GET") ? "GET" : "POST"} checks LEARN`, /learnGaps\s*\(/.test(body));
}
check("3 — setPackageStatus checks SELL server-side", /sellGaps\s*\(/.test(packages));
check("3 — the publish refusal has its own code", /GATE_UNMET/.test(packages));

/*
  ⚠⚠ NO COMPLETION GATE ON TESTS. Scott: *"I want to allow every panameerian to
  take the certification without having taken the courses."* `LEARN` is the only
  bar, and nothing in this route may start reading progress.
*/
check(
  "3 — ⚠ the test route does not read lesson progress",
  !/lessonProgress|completedLessons|allDone|progressCount/.test(test),
  "there is no completion gate and Scott wants none"
);

// ---------------------------------------------------------------------------
// GUARD 4 — drafts are not gated
// ---------------------------------------------------------------------------

/*
  ⚠ THE GATE MUST SIT INSIDE THE `status === "PUBLISHED"` BRANCH. Outside it,
  DRAFT ⇄ DRAFT and PUBLISHED → DRAFT would both be refused — a seller could
  neither build a product nor withdraw one.
*/
const spStart = packages.indexOf("export async function setPackageStatus");
const spBody = packages.slice(spStart);
const branchAt = spBody.indexOf('status === "PUBLISHED"');
const gateAt = spBody.indexOf("sellGaps(");
check(
  "4 — the publish gate sits INSIDE the PUBLISHED branch, so drafts pass",
  branchAt >= 0 && gateAt > branchAt,
  "a gate outside the branch would also block saving a draft and unpublishing"
);
check(
  "4 — nothing re-checks an already-published row",
  (spBody.match(/sellGaps\s*\(/g) ?? []).length === 1,
  "a second call is how a retro-unpublish gets written by accident"
);
/* Learn reads: browsing, the catalog and the lesson player are untouched. */
const LEARN_READS = [
  join("src", "lib", "learn-dashboard.ts"),
  join("src", "lib", "learn-path-app.ts"),
  join("src", "app", "api", "learn", "progress", "route.ts"),
];
for (const f of LEARN_READS) {
  check(
    `4 — ⚠ the Learn read path ${f} is NOT gated`,
    existsSync(f) && !/learnGaps\s*\(|missingForLearn\s*\(/.test(read(f)),
    "browsing, reading and watching stay open — Learn is the top of the funnel"
  );
}
check(
  "4 — un-enrolling is not blocked by the gate that blocks enrolling",
  /!enrolled\s*&&/.test(read(join("src", "components", "learn", "EnrollButton.tsx"))),
  "somebody who joined before the bar existed must still be able to leave"
);
check(
  "4 — the notice is disabled-with-reason, never pointer-events:none",
  !/pointer-events-none|pointerEvents/.test(read(NOTICE))
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:transaction-gates — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:transaction-gates — ${pass}/${pass} passed`);
