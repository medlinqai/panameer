/**
 * `check:sourcing` — the rules the sourcing documents cannot be allowed to lose
 * (`P1-J4-E395` WS-5). `npm run check:sourcing`.
 *
 * ── ⚠⚠ TWO KINDS OF ASSERTION, AND THE SECOND KIND IS THE POINT ─────────────
 *
 * BEHAVIOURAL — every rule that says "assert" in the brief is exercised against
 * `lib/sourcing.ts` and `lib/sourcing-stage.ts`, and every one is
 * MUTATION-TESTED: the harness proves the rule REFUSES the bad case, not merely
 * that it accepts the good one. A guard that only ever sees valid input passes
 * forever while doing nothing.
 *
 * ABSENCE — four things this brief FORBIDS, asserted as absent:
 *   · nothing aggregates decline counts onto a provider
 *   · `InterviewNote` never reaches a provider-facing read
 *   · no second implementation of the sourcing stage
 *   · no interview-rating average
 * ⚠⚠ ALL FOUR WILL LOOK LIKE AN IMPROVEMENT TO SOMEBODY LATER. A "responsiveness
 * score" is the obvious way to surface reliability; averaging two interview
 * ratings is the obvious way to sort a shortlist. They are wrong for reasons that
 * live in the brief and nowhere in the code, which is exactly why the ABSENCE has
 * to be a test — a comment cannot fail a build.
 *
 * ⚠ THE ABSENCE SCANS ARE THEMSELVES MUTATION-TESTED. Each one is written as a
 * detector over a string, so the harness can feed it the forbidden code and
 * assert it FIRES. A structural scan nobody has ever seen fire is a scan whose
 * regex might not match anything at all — this codebase has shipped exactly that
 * (`E041`).
 *
 * ⚠ NO DATABASE AND NO BROWSER. Schema facts are read from `schema.prisma` as
 * text, source facts from the tree as text, rules exercised as functions.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  SourcingError,
  PRICING_SHAPE_FIELDS,
  assertBidLine,
  assertBidLineBasis,
  assertInterviewSlot,
  assertIssuable,
  assertPricingShapesAgree,
  assertTestRequestLine,
  canSeeDecline,
  copyResultFromAttempt,
  pricingShapeDiff,
  providerFacingInterview,
  testRequestOutcome,
} from "@/lib/sourcing";
import { SOURCING_STAGES, sourcingStage, stageRank } from "@/lib/sourcing-stage";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/**
 * ⚠ THE MUTATION HALF. `refuses` asserts the rule THROWS, and optionally with
 * the expected code — a rule that throws for the wrong reason is not the rule.
 */
function refuses(name: string, fn: () => unknown, code?: string) {
  try {
    fn();
    check(name, false, "it was ACCEPTED — the rule is not enforcing");
  } catch (e) {
    if (code && (e as SourcingError).code !== code) {
      check(name, false, `threw ${(e as SourcingError).code}, expected ${code}`);
      return;
    }
    check(name, true);
  }
}
function accepts(name: string, fn: () => unknown) {
  try {
    fn();
    check(name, true);
  } catch (e) {
    check(name, false, `it was REFUSED: ${(e as Error).message}`);
  }
}

/* ═══ THE TREE, READ AS TEXT ═══════════════════════════════════════════════ */

const SCHEMA = readFileSync(join("prisma", "schema.prisma"), "utf8");
/** ⚠ Comments stripped: this file and the schema both QUOTE what they forbid. */
const stripComments = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const SCHEMA_CODE = stripComments(SCHEMA);

function modelBody(name: string, from = SCHEMA_CODE): string {
  const m = from.match(new RegExp(`^model ${name} \\{([\\s\\S]*?)^\\}`, "m"));
  return m ? m[1] : "";
}
/** Field NAMES declared in a model body — the first token of each field line. */
function fieldNames(body: string): string[] {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("@@") && !l.startsWith("//"))
    .map((l) => l.split(/\s+/)[0])
    .filter((n) => /^[a-z_][A-Za-z0-9_]*$/.test(n));
}

type SourceFile = { path: string; text: string; code: string };
function walk(dir: string, out: SourceFile[] = []): SourceFile[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) {
      const text = readFileSync(full, "utf8");
      out.push({ path: relative(".", full), text, code: stripComments(text) });
    }
  }
  return out;
}
const SRC = walk("src");

/* ═══ 1 · `basis` ON A BID LINE MATCHES ITS WORK-REQUEST LINE ═══════════════ */

accepts("1 — a RATE bid against a RATE request line is accepted", () =>
  assertBidLineBasis("RATE", "RATE")
);
accepts("1 — an AMOUNT bid against an AMOUNT request line is accepted", () =>
  assertBidLineBasis("AMOUNT", "AMOUNT")
);
/* ⚠ BOTH DIRECTIONS. A guard that only refuses AMOUNT-answers-RATE lets the
   mirror image through, and the mirror image is the same defect. */
refuses(
  "1 — an AMOUNT lump sum cannot answer an HOURLY (RATE) request line",
  () => assertBidLineBasis("AMOUNT", "RATE"),
  "BID_BASIS_COUNTER_OFFER"
);
refuses(
  "1 — a RATE bid cannot answer a fixed-price (AMOUNT) request line",
  () => assertBidLineBasis("RATE", "AMOUNT"),
  "BID_BASIS_COUNTER_OFFER"
);
accepts("1 — a well-formed RATE bid line passes both basis and shape", () =>
  assertBidLine({ basis: "RATE", uom: "HOUR", quantity: 160, unit_price_cents: 15000 }, "RATE")
);
/* ⚠ THE SHAPE RULE IS IMPORTED FROM THE SPINE, NOT REIMPLEMENTED — assert it is
   really running here, or `assertBidLine` is only half a check. */
refuses(
  "1 — a RATE bid line carrying an amount is refused (the spine's shape rule runs)",
  () =>
    assertBidLine(
      { basis: "RATE", uom: "HOUR", quantity: 160, unit_price_cents: 15000, amount_cents: 2400000 },
      "RATE"
    ),
  "RATE_HAS_AMOUNT"
);
refuses(
  "1 — a RATE bid line with no unit price is refused",
  () => assertBidLine({ basis: "RATE", uom: "HOUR", quantity: 160 }, "RATE"),
  "RATE_NEEDS_UNIT_PRICE"
);

/* ═══ 2 · `ProviderBidLine` AND `WorkOrderLine` CARRY THE SAME PRICING SHAPE ═
   ⚠⚠ AWARDING IS A COPY, FIELD FOR FIELD. If they drift, the award becomes a
   TRANSLATION — and a translation is where a rate silently changes between what
   was bid and what was ordered. */

const BID_LINE_FIELDS = fieldNames(modelBody("ProviderBidLine"));
const ORDER_LINE_FIELDS = fieldNames(modelBody("WorkOrderLine"));

check("2 — ProviderBidLine was found in the schema", BID_LINE_FIELDS.length > 0);
check("2 — WorkOrderLine was found in the schema", ORDER_LINE_FIELDS.length > 0);
accepts("2 — the two models agree on the pricing shape as shipped", () =>
  assertPricingShapesAgree(BID_LINE_FIELDS, ORDER_LINE_FIELDS)
);
for (const f of PRICING_SHAPE_FIELDS) {
  check(`2 — ProviderBidLine declares ${f}`, BID_LINE_FIELDS.includes(f));
  check(`2 — WorkOrderLine declares ${f}`, ORDER_LINE_FIELDS.includes(f));
}
/* ⚠⚠ THE MUTATION, AND IT RUNS ONCE PER FIELD IN BOTH DIRECTIONS. Removing a
   pricing field from EITHER model must fail — the asymmetric version of this
   test (only checking the bid side) is how the order side drifts. */
for (const f of PRICING_SHAPE_FIELDS) {
  refuses(
    `2 — MUTATION: dropping ${f} from ProviderBidLine fails the shape check`,
    () => assertPricingShapesAgree(BID_LINE_FIELDS.filter((x) => x !== f), ORDER_LINE_FIELDS),
    "PRICING_SHAPE_DRIFT"
  );
  refuses(
    `2 — MUTATION: dropping ${f} from WorkOrderLine fails the shape check`,
    () => assertPricingShapesAgree(BID_LINE_FIELDS, ORDER_LINE_FIELDS.filter((x) => x !== f)),
    "PRICING_SHAPE_DRIFT"
  );
}
{
  const d = pricingShapeDiff(
    BID_LINE_FIELDS.filter((x) => x !== "unit_price_cents"),
    ORDER_LINE_FIELDS
  );
  check(
    "2 — the diff names WHICH side lost the field, not just that they differ",
    d.missingFromBid.includes("unit_price_cents") && d.missingFromOrder.length === 0
  );
}
/* ⚠ `unit_price_cents` IS THE ROW `E366` WAS BLOCKED ON — *"a proposed rate has
   nowhere to live."* Named on its own so the reason survives the list. */
check(
  "2 — ProviderBidLine.unit_price_cents exists (E366's missing row)",
  /unit_price_cents\s+Int\?/.test(modelBody("ProviderBidLine"))
);

/* ═══ 3 · ONE ITB PER PROVIDER PER WORK REQUEST ════════════════════════════ */

check(
  "3 — BidRequest is @@unique on (work_request_id, provider_person_id)",
  /@@unique\(\[work_request_id,\s*provider_person_id\]\)/.test(modelBody("BidRequest"))
);
check(
  "3 — ProviderBid.bid_request_id is @unique (one bid per ITB)",
  /bid_request_id\s+String\s+@unique/.test(modelBody("ProviderBid"))
);
/* ⚠ THE FAN-OUT IS THE ITB, NOT A LIST INSIDE ONE. A `provider_person_ids`
   array would be the shape that cannot be issued or declined per provider. */
check(
  "3 — BidRequest carries ONE provider, not a list",
  /provider_person_id\s+String\s+@db\.Uuid/.test(modelBody("BidRequest")) &&
    !/provider_person_ids/.test(modelBody("BidRequest"))
);
accepts("3 — an ITB with a closing date can be issued", () =>
  assertIssuable({ responds_by: new Date("2026-10-01") })
);
refuses(
  "3 — an ITB with no closing date cannot be issued",
  () => assertIssuable({ responds_by: null }),
  "ITB_NO_CLOSING_DATE"
);

/* ═══ 4 · A `TestRequestLine` POINTS AT A **PUBLISHED** `LearnAssessment` ═══ */

accepts("4 — a published assessment can be requested", () =>
  assertTestRequestLine({ assessment: { id: "a", status: "PUBLISHED" } })
);
refuses(
  "4 — a path with no assessment cannot be requested",
  () => assertTestRequestLine({ assessment: null }),
  "TEST_NO_ASSESSMENT"
);
/* ⚠⚠ THE HALF THAT WOULD HAVE BEEN MISSED. A DRAFT assessment LOOKS testable —
   the row exists — and `gradeAttempt` refuses to grade it, so the provider gets
   an ITB, opens the test and hits a wall they cannot clear. Measured on this
   trunk 2026-09-07: 23 paths, 8 assessment rows, only 2 PUBLISHED. */
refuses(
  "4 — a DRAFT assessment cannot be requested (8 rows exist, only 2 are published)",
  () => assertTestRequestLine({ assessment: { id: "a", status: "DRAFT" } }),
  "TEST_ASSESSMENT_NOT_PUBLISHED"
);
check(
  "4 — TestRequestLine.learn_assessment_id is NOT NULL",
  /learn_assessment_id\s+String\s+@db\.Uuid/.test(modelBody("TestRequestLine"))
);

/* ── WS-2 RULES 2 AND 3 · A BUYER'S REQUEST DOES NOT TOUCH THE ATTEMPT COUNT ─ */

check(
  "4 — three unused attempts: the provider can sit it",
  testRequestOutcome({ attemptsUsed: 0, attemptsAllowed: 3, passedAttemptId: null }).state ===
    "CAN_SIT"
);
/* ⚠⚠ `max_attempts` IS ALREADY ENFORCED (lib/learn-assessment.ts:869) AND A
   BUYER'S REQUEST DOES NOT RESET IT. Silently granting a fresh attempt devalues
   every score in the marketplace. */
check(
  "4 — spent attempts stay spent when a buyer asks (no reset)",
  testRequestOutcome({ attemptsUsed: 3, attemptsAllowed: 3, passedAttemptId: null }).state ===
    "ATTEMPTS_SPENT"
);
check(
  "4 — a second buyer asking again still sees ATTEMPTS_SPENT",
  testRequestOutcome({ attemptsUsed: 3, attemptsAllowed: 3, passedAttemptId: null }).attemptsUsed ===
    3
);
/* ⚠ IT IS A STATE, NOT AN ERROR — something to SHOW, not a rule to bypass. */
check(
  "4 — ATTEMPTS_SPENT is a returned state, not a thrown error",
  (() => {
    try {
      return (
        testRequestOutcome({ attemptsUsed: 9, attemptsAllowed: 3, passedAttemptId: null }).state ===
        "ATTEMPTS_SPENT"
      );
    } catch {
      return false;
    }
  })()
);
check(
  "4 — TestResponseStatus carries ATTEMPTS_SPENT so the state can be stored",
  /enum TestResponseStatus \{[\s\S]*?ATTEMPTS_SPENT[\s\S]*?\}/.test(SCHEMA_CODE)
);
/* ⚠⚠ A PASSED SCORE IS THE PROVIDER'S PROPERTY. A second buyer SEES THE EXISTING
   ATTEMPT and does not force a retake, or the test is a toll gate, not a
   credential. ⚠ AND THE PASS OUTRANKS THE LIMIT: someone who passed on their
   third try is DONE, not spent. */
check(
  "4 — a second buyer sees the existing pass, not a retake",
  testRequestOutcome({ attemptsUsed: 1, attemptsAllowed: 3, passedAttemptId: "att-1" }).state ===
    "EXISTING_PASS"
);
check(
  "4 — the existing pass is returned BY ID so the response references it",
  testRequestOutcome({ attemptsUsed: 1, attemptsAllowed: 3, passedAttemptId: "att-1" })
    .attemptId === "att-1"
);
check(
  "4 — a pass on the LAST attempt reads EXISTING_PASS, not ATTEMPTS_SPENT",
  testRequestOutcome({ attemptsUsed: 3, attemptsAllowed: 3, passedAttemptId: "att-3" }).state ===
    "EXISTING_PASS"
);

/* ── THE RESULT IS REFERENCED, NOT COPIED — AND NEVER TYPED ─────────────────
   `LearnTestAttempt` is the system of record; a hand-supplied score is a second
   score that can disagree, and the provider's own record must win. */

check(
  "4 — TestResponseLine references the attempt",
  /learn_test_attempt_id\s+String\?\s+@db\.Uuid/.test(modelBody("TestResponseLine"))
);
{
  const attempt = { id: "att-9", score: 88, passed: true, created_at: new Date("2026-09-01") };
  const copied = copyResultFromAttempt({}, attempt);
  check(
    "4 — the score is copied from the attempt, verbatim",
    copied.score === 88 && copied.passed === true && copied.learn_test_attempt_id === "att-9"
  );
  refuses(
    "4 — MUTATION: a hand-supplied score is refused",
    () => copyResultFromAttempt({ score: 100 }, attempt),
    "TEST_RESULT_SUPPLIED"
  );
  refuses(
    "4 — MUTATION: a hand-supplied pass flag is refused",
    () => copyResultFromAttempt({ passed: true }, attempt),
    "TEST_RESULT_SUPPLIED"
  );
}

/* ═══ 5 · NOTHING AGGREGATES DECLINE COUNTS ONTO A PROVIDER ════════════════
   ⚠⚠ *"A recorded refusal becomes a scarlet letter on a marketplace."* The
   single row is fine and the requester who issued the ITB reads it; THE
   AGGREGATE is the scarlet letter. */

check("5 — a decline is recordable on the ITB", /declined_at/.test(modelBody("BidRequest")));
check("5 — a decline is recordable on the bid", /declined_at/.test(modelBody("ProviderBid")));
check(
  "5 — the requester who issued the ITB can see the decline",
  canSeeDecline({ viewerPersonId: "buyer-1", invitedByPersonId: "buyer-1", providerPersonId: "p-1" })
);
check(
  "5 — the provider can see their own decline",
  canSeeDecline({ viewerPersonId: "p-1", invitedByPersonId: "buyer-1", providerPersonId: "p-1" })
);
check(
  "5 — ANOTHER buyer cannot see it",
  !canSeeDecline({
    viewerPersonId: "buyer-2",
    invitedByPersonId: "buyer-1",
    providerPersonId: "p-1",
  })
);
check(
  "5 — another PROVIDER cannot see it",
  !canSeeDecline({ viewerPersonId: "p-2", invitedByPersonId: "buyer-1", providerPersonId: "p-1" })
);

/**
 * ⚠ THE DETECTOR, WRITTEN OVER A STRING SO IT CAN BE MUTATION-TESTED. Three
 * shapes, because the aggregate can arrive under three different names:
 *   · a NAMED counter — `declineCount`, `declineRate`, a responsiveness score;
 *   · a `groupBy` over the decline documents, which is a counter with no name;
 *   · a `count()` on those documents filtered to DECLINED.
 *
 * ── ⚠⚠ TWO NARROWINGS, BOTH FOUND BY THIS SCAN FIRING ON REAL CODE ──────────
 *
 * ⚠ IDENTIFIERS, NOT PROSE. The separator is `_?`, never a SPACE. The first draft
 * used `[_ ]?` and matched the Terms of Service at `content/legal/terms.ts:269` —
 * *"offer or accept fake services to improve your feedback or rating score"* —
 * which is the ToS FORBIDDING the very thing, in English. A gate that fails on
 * its own policy document teaches people to loosen the gate.
 *
 * ⚠⚠ AND `DECLINED` IS NOT A SOURCING WORD. It is also a first-class
 * `Connection` state, and `lib/connections.ts:364` legitimately counts declined
 * COLLEAGUE requests for the community screen. That is a different domain and
 * `E366`'s rule says nothing about it. So a bare named counter fires only where
 * the file is actually handling a sourcing document — UNLESS the name itself says
 * `provider`, which is the scarlet letter by definition wherever it lives.
 */
const DECLINE_COUNTER_NAMES =
  /\b(decline_?(count|counts|rate|ratio|score)|declines?Count|declined_?count|responsiveness_?(score|rate)|acceptance_?rate|reliability_?score)\b/i;
/** Does this file handle a sourcing document at all? */
const SOURCING_CONTEXT = /\b(bidRequest|providerBid|BidRequest|ProviderBid|bid_request|provider_bid|ITB)\b/;
function aggregatesDeclines(code: string): string | null {
  const named = code.match(DECLINE_COUNTER_NAMES);
  if (named && (SOURCING_CONTEXT.test(code) || /provider/i.test(named[0])))
    return `named counter: ${named[0]}`;
  if (/\bprovider_?(decline|refus)/i.test(code)) return "a per-provider decline counter";
  if (/prisma\.(bidRequest|providerBid)\.groupBy/.test(code)) return "groupBy over a bid document";
  const counts = code.match(/prisma\.(bidRequest|providerBid)\.count\(([\s\S]{0,400}?)\)/g) ?? [];
  for (const c of counts) if (/DECLINED/.test(c)) return "count() filtered to DECLINED";
  return null;
}
/* ⚠⚠ MUTATION-TEST THE SCAN ITSELF. A structural scan nobody has seen fire is a
   scan whose regex might match nothing at all — this codebase has shipped exactly
   that (`E041`), where a "fired" assertion was guarding a stub that no longer
   existed. */
check(
  "5 — MUTATION: the scan catches a named decline counter in a bid file",
  aggregatesDeclines("const declineCount = await prisma.bidRequest.findMany();") !== null
);
check(
  "5 — MUTATION: the scan catches a responsiveness score on a bid document",
  aggregatesDeclines("function responsivenessScore(b: ProviderBid) {}") !== null
);
/* ⚠ A COUNTER THAT NAMES THE PROVIDER IS THE SCARLET LETTER WHEREVER IT LIVES —
   it does not get to hide in a file that never mentions a bid. */
check(
  "5 — MUTATION: a provider-named decline counter fires with no sourcing context",
  aggregatesDeclines("const providerDeclineRate = 0.2;") !== null
);
check(
  "5 — MUTATION: providerDeclines fires on its own",
  aggregatesDeclines("export function providerDeclines(id: string) {}") !== null
);
/* ⚠⚠ THE TWO NARROWINGS, ASSERTED. Both came from this scan firing on real code
   (see the detector's docblock): the ToS prose, and community connection
   declines. If either narrowing is ever reverted these two go red. */
check(
  "5 — the scan does NOT fire on ToS prose about a rating score",
  aggregatesDeclines(
    "offer or accept fake services to improve your feedback or rating score"
  ) === null
);
check(
  "5 — the scan does NOT fire on community CONNECTION declines",
  aggregatesDeclines(
    "declinedCount: rows.filter((r) => r.kind === 'COLLEAGUE' && r.status === 'DECLINED').length,"
  ) === null
);
check(
  "5 — MUTATION: the scan catches a groupBy over bid requests",
  aggregatesDeclines("await prisma.bidRequest.groupBy({ by: ['provider_person_id'] })") !== null
);
check(
  "5 — MUTATION: the scan catches a count filtered to DECLINED",
  aggregatesDeclines(
    "await prisma.providerBid.count({ where: { provider_person_id: id, status: 'DECLINED' } })"
  ) !== null
);
check(
  "5 — the scan does NOT fire on an ordinary bid count",
  aggregatesDeclines("await prisma.providerBid.count({ where: { bid_request_id: id } })") === null
);
{
  const hits = SRC.map((f) => ({ f, why: aggregatesDeclines(f.code) })).filter((h) => h.why);
  check(
    "5 — ABSENCE: nothing in src aggregates declines onto a provider",
    hits.length === 0,
    hits.map((h) => `${h.f.path} (${h.why})`).join("; ")
  );
}

/* ═══ 6 · `InterviewNote` NEVER REACHES A PROVIDER-FACING READ ═════════════
   ⚠⚠ **A candidate reading *"weak on OTBI"* is the failure mode**, and it is
   never a styling accident — it is ONE careless `include`. */

/* (a) STRUCTURAL, IN THE SCHEMA. The notes hang off the BUYER's document, and
   the provider's document has no edge to traverse. */
check(
  "6 — InterviewNote hangs off InterviewRequest (the buyer's document)",
  /notes\s+InterviewNote\[\]/.test(modelBody("InterviewRequest"))
);
check(
  "6 — ABSENCE: InterviewResponse has NO path to InterviewNote",
  !/InterviewNote/.test(modelBody("InterviewResponse")) &&
    !/InterviewNote/.test(modelBody("InterviewResponseLine"))
);
check(
  "6 — InterviewNote relates back only to the request",
  (modelBody("InterviewNote").match(/@relation/g) ?? []).length === 1 &&
    /interviewRequest\s+InterviewRequest\s+@relation/.test(modelBody("InterviewNote"))
);

/* (b) BEHAVIOURAL. The provider-facing projection is a CLOSED object literal, so
   a note cannot arrive by spread from a wider row that happened to be loaded. */
const LEAKY_ROW = {
  id: "ir-1",
  status: "COMPLETED",
  mode: "VIDEO",
  duration_minutes: 45,
  confirmed_line_id: "irl-2",
  completed_at: new Date("2026-09-05"),
  notes: [{ id: "n1", body: "weak on OTBI", rating: "POOR", author_person_id: "buyer-1" }],
  response: {
    lines: [
      { id: "irl-2", line_number: 1, starts_at: new Date("2026-09-10T14:00:00Z"), time_zone: "America/New_York" },
    ],
  },
};
function leaksNotes(projected: unknown): boolean {
  const s = JSON.stringify(projected);
  return /weak on OTBI|"notes"|"rating"|"body"|POOR/.test(s);
}
check(
  "6 — MUTATION: the leak detector fires on a projection that spreads the row",
  leaksNotes({ ...LEAKY_ROW })
);
check(
  "6 — MUTATION: the leak detector fires on a projection that keeps only the rating",
  leaksNotes({ id: "ir-1", rating: "POOR" })
);
check(
  "6 — providerFacingInterview leaks nothing from the notes",
  !leaksNotes(providerFacingInterview(LEAKY_ROW))
);
check(
  "6 — providerFacingInterview still returns the slots the provider offered",
  providerFacingInterview(LEAKY_ROW).slots.length === 1 &&
    providerFacingInterview(LEAKY_ROW).slots[0].time_zone === "America/New_York"
);
check(
  "6 — providerFacingInterview returns a CLOSED key set",
  JSON.stringify(Object.keys(providerFacingInterview(LEAKY_ROW)).sort()) ===
    JSON.stringify(
      [
        "completed_at",
        "confirmed_line_id",
        "duration_minutes",
        "id",
        "mode",
        "slots",
        "status",
      ].sort()
    )
);

/**
 * (c) STRUCTURAL, ACROSS THE TREE.
 *
 * ⚠⚠ AN ALLOWLIST, NOT A DIRECTORY BLOCKLIST. Trying to enumerate every
 * provider-facing path means the gate is only as good as that list, and a new
 * provider route added next month is not on it. So `InterviewNote` may be
 * referenced from NOWHERE except the files named here — any new reference fails
 * the build until somebody adds the file deliberately, which is the point: the
 * reviewer's eyes land on exactly the `include` that would leak it.
 */
const INTERVIEW_NOTE_ALLOWLIST = [
  join("src", "lib", "sourcing.ts"),
  join("src", "lib", "sourcing-stage.ts"),
];
{
  const hits = SRC.filter(
    (f) => /InterviewNote|interviewNote/.test(f.code) && !INTERVIEW_NOTE_ALLOWLIST.includes(f.path)
  );
  check(
    "6 — ABSENCE: no file outside the allowlist reads InterviewNote",
    hits.length === 0,
    hits.map((h) => h.path).join(", ")
  );
}
check(
  "6 — the allowlist is real (its paths resolve to files in the tree)",
  INTERVIEW_NOTE_ALLOWLIST.every((p) => SRC.some((f) => f.path === p))
);

/* ═══ 7 · A SLOT CARRIES UTC **AND** THE PROPOSER'S ZONE ═══════════════════
   ⚠⚠ Two parties, two timezones — the commonest defect in every scheduling
   feature ever shipped. */

{
  const body = modelBody("InterviewResponseLine");
  check("7 — InterviewResponseLine.starts_at is NOT NULL", /starts_at\s+DateTime\s*$/m.test(body));
  check("7 — InterviewResponseLine.time_zone is NOT NULL", /time_zone\s+String\s*$/m.test(body));
  check(
    "7 — ABSENCE: the zone is not optional",
    !/time_zone\s+String\?/.test(body) && !/starts_at\s+DateTime\?/.test(body)
  );
}
accepts("7 — a slot with an instant and an IANA zone is accepted", () =>
  assertInterviewSlot({ starts_at: new Date("2026-09-10T14:00:00Z"), time_zone: "America/New_York" })
);
accepts("7 — UTC is a legal zone name", () =>
  assertInterviewSlot({ starts_at: new Date(), time_zone: "UTC" })
);
accepts("7 — a three-part zone name is accepted", () =>
  assertInterviewSlot({ starts_at: new Date(), time_zone: "America/Argentina/Buenos_Aires" })
);
refuses(
  "7 — a slot with no zone is refused",
  () => assertInterviewSlot({ starts_at: new Date(), time_zone: null }),
  "SLOT_NO_TIME_ZONE"
);
refuses(
  "7 — a blank zone is refused",
  () => assertInterviewSlot({ starts_at: new Date(), time_zone: "   " }),
  "SLOT_NO_TIME_ZONE"
);
refuses(
  "7 — a slot with no instant is refused",
  () => assertInterviewSlot({ starts_at: null, time_zone: "America/New_York" }),
  "SLOT_NO_START"
);
/* ⚠ AN OFFSET IS A FACT ABOUT ONE INSTANT, NOT ABOUT A PLACE — it does not
   survive the DST boundary between the offer and the interview. */
refuses(
  "7 — a raw offset is refused, not silently stored",
  () => assertInterviewSlot({ starts_at: new Date(), time_zone: "-05:00" }),
  "SLOT_TIME_ZONE_IS_OFFSET"
);
refuses(
  "7 — UTC-05:00 is refused too",
  () => assertInterviewSlot({ starts_at: new Date(), time_zone: "UTC-05:00" }),
  "SLOT_TIME_ZONE_IS_OFFSET"
);
refuses(
  "7 — an abbreviation like EST is refused",
  () => assertInterviewSlot({ starts_at: new Date(), time_zone: "EST" }),
  "SLOT_TIME_ZONE_NOT_IANA"
);

/* ═══ 8 · THE STAGE IS DERIVED IN ONE PLACE ════════════════════════════════ */

const NONE = {
  invited: false,
  bid: false,
  tested: false,
  interviewed: false,
  shortlisted: false,
  assigned: false,
  declined: false,
};
check("8 — no documents at all is null, NOT 'INVITED'", sourcingStage(NONE) === null);
check("8 — an ITB alone is INVITED", sourcingStage({ ...NONE, invited: true }) === "INVITED");
check(
  "8 — a submitted bid is BID",
  sourcingStage({ ...NONE, invited: true, bid: true }) === "BID"
);
check(
  "8 — a completed test is TESTED",
  sourcingStage({ ...NONE, invited: true, bid: true, tested: true }) === "TESTED"
);
check(
  "8 — a completed interview is INTERVIEWED",
  sourcingStage({ ...NONE, invited: true, bid: true, tested: true, interviewed: true }) ===
    "INTERVIEWED"
);
check(
  "8 — a shortlist line is SHORTLISTED",
  sourcingStage({ ...NONE, invited: true, bid: true, shortlisted: true }) === "SHORTLISTED"
);
check(
  "8 — a work order is ASSIGNED",
  sourcingStage({ ...NONE, invited: true, bid: true, shortlisted: true, assigned: true }) ===
    "ASSIGNED"
);
check(
  "8 — a decline outranks progress",
  sourcingStage({ ...NONE, invited: true, bid: true, declined: true }) === "DECLINED"
);
/* ⚠ ASSIGNED OUTRANKS DECLINED. A provider who declined an ITB and was hired
   anyway — off a second conversation, which is a marketplace, not a bug — is
   ASSIGNED. The other reading shows "declined" next to somebody doing the work. */
check(
  "8 — ASSIGNED outranks DECLINED",
  sourcingStage({ ...NONE, invited: true, declined: true, assigned: true }) === "ASSIGNED"
);
check(
  "8 — an interview without a test still reads INTERVIEWED (stages are not a ladder)",
  sourcingStage({ ...NONE, invited: true, interviewed: true }) === "INTERVIEWED"
);
check("8 — stageRank puts ASSIGNED first", stageRank("ASSIGNED") === 0);
check(
  "8 — stageRank puts INVITED last",
  stageRank("INVITED") === SOURCING_STAGES.length - 1
);
check(
  "8 — every stage the brief names is in the enum",
  ["INVITED", "BID", "TESTED", "INTERVIEWED", "SHORTLISTED", "ASSIGNED", "DECLINED"].every((s) =>
    (SOURCING_STAGES as readonly string[]).includes(s)
  )
);

/**
 * ⚠⚠ ABSENCE: NO SECOND IMPLEMENTATION.
 *
 * **Two screens computing a stage independently WILL disagree, and the shortlist
 * is where a buyer decides who to hire.** The detector looks for the giveaway: a
 * file that mentions three or more of the stage names AND branches on them,
 * without importing the one function.
 */
function derivesStageLocally(path: string, code: string): boolean {
  if (path === join("src", "lib", "sourcing-stage.ts")) return false;
  const named = ["INVITED", "BID", "TESTED", "INTERVIEWED", "SHORTLISTED", "ASSIGNED"].filter((s) =>
    new RegExp(`["'\`]${s}["'\`]`).test(code)
  );
  if (named.length < 3) return false;
  return !/from\s+["']@\/lib\/sourcing-stage["']/.test(code);
}
check(
  "8 — MUTATION: the scan catches a second derivation",
  derivesStageLocally(
    join("src", "app", "fake", "page.tsx"),
    `const s = bid ? "BID" : tested ? "TESTED" : "INVITED";`
  )
);
check(
  "8 — MUTATION: the scan does NOT fire on a file that imports the one function",
  !derivesStageLocally(
    join("src", "app", "fake", "page.tsx"),
    `import { sourcingStage } from "@/lib/sourcing-stage";\nconst x = ["BID","TESTED","INVITED"];`
  )
);
{
  const hits = SRC.filter((f) => derivesStageLocally(f.path, f.code));
  check(
    "8 — ABSENCE: the sourcing stage is derived in exactly one file",
    hits.length === 0,
    hits.map((h) => h.path).join(", ")
  );
}
/**
 * ⚠ THE COST IS A TEST, NOT A COMMENT. The brief asked how many queries deriving
 * the stage costs PER PROVIDER, and the answer — ZERO marginal, six fixed for the
 * whole work request — is only true while every query is scoped to the work
 * request and fanned out in memory. The moment one takes a provider id, the six
 * becomes six per provider and nobody notices until a busy request is slow.
 *
 * MEASURED 2026-09-07 against the live database with Prisma's query log: **6
 * queries for one work request, 12 for two.**
 */
{
  const stageFile = SRC.find((f) => f.path === join("src", "lib", "sourcing-stage.ts"));
  const code = stageFile?.code ?? "";
  const calls = code.match(/prisma\.\w+\.\w+\(/g) ?? [];
  check("8 — the loader issues exactly 6 queries", calls.length === 6, `found ${calls.length}`);
  check(
    "8 — all 6 are issued together, not in sequence",
    /Promise\.all\(\[/.test(code)
  );
  /* ⚠ NO QUERY TAKES A PROVIDER ID — that is what makes the cost fixed. */
  const providerRefs = [...code.matchAll(/provider_person_id:\s*(\w+)/g)].map((m) => m[1]);
  check(
    "8 — ABSENCE: no query is scoped to a provider (the cost is per REQUEST)",
    providerRefs.length > 0 && providerRefs.every((v) => v === "true"),
    `provider_person_id used as: ${[...new Set(providerRefs)].join(", ") || "nowhere"}`
  );
  /* ⚠ AND NOTHING QUERIES INSIDE A LOOP — the shape that turns a fixed six into
     six per provider. `[^}]*` stops the scan at the enclosing block's brace, so
     a query merely LATER in the file is not a false hit. */
  const queryInLoop = (c: string) =>
    /for\s*\([^)]*\)\s*\{[^}]*prisma\./.test(c) ||
    /\.map\(\s*(async\s*)?\([^)]*\)\s*=>[^}]*prisma\./.test(c);
  check(
    "8 — MUTATION: the loop scan catches a query inside a for",
    queryInLoop("for (const p of providers) {\n  await prisma.bidRequest.count();\n}")
  );
  check(
    "8 — MUTATION: the loop scan catches a query inside a map",
    queryInLoop("providers.map(async (p) => prisma.providerBid.findFirst())")
  );
  check(
    "8 — the loop scan does NOT fire on a loop that only reads memory",
    !queryInLoop("for (const r of itbs) {\n  e.invited = true;\n}")
  );
  check("8 — ABSENCE: no query inside a for/map over providers", !queryInLoop(code));
  /* ⚠ THE SINGLE-PROVIDER PATH REUSES THE SAME SIX rather than writing seven
     narrow counts, which would be a SECOND derivation. */
  check(
    "8 — sourcingStageForProvider reuses the one loader",
    /sourcingStageForProvider[\s\S]{0,400}sourcingStagesForWorkRequest\(/.test(code)
  );
}
check(
  "8 — ABSENCE: no stage is STORED on a sourcing document",
  !/\bSourcingStage\b/.test(SCHEMA_CODE) && !/\bstage\s+\w+/.test(modelBody("ProviderBid"))
);

/* ═══ 9 · NO INTERVIEW-SCORE AVERAGE IS COMPUTED ═══════════════════════════
   ⚠ sPro averages completed interview ratings into a score. **A score built from
   two interviews is not a score** — it is two opinions with a decimal point on
   them, and it will be sorted on, filtered by and eventually shown to somebody.
   ⚠⚠ THE WHOLE FEATURE IS ONE CONSTANT, and it would arrive looking like a
   display helper. */

/* ⚠ IDENTIFIERS, NOT PROSE — `_?`, never a space. See `aggregatesDeclines`'
   docblock: the space-separated form matched the Terms of Service. */
const RATING_SCORE_NAMES =
  /\b(interview_?(score|rating_?average|avg)|average_?rating|avg_?rating|rating_?score|rating_?average|ratingToNumber|ratingValue)\b/i;
function averagesRatings(code: string): string | null {
  const named = code.match(RATING_SCORE_NAMES);
  if (named) return `named average: ${named[0]}`;
  /* A numeric mapping of the enum — `{ EXCELLENT: 4, GOOD: 3, ... }`. */
  if (/EXCELLENT\s*:\s*\d/.test(code) || /POOR\s*:\s*\d/.test(code)) return "numeric rating map";
  if (/prisma\.interviewNote\.aggregate/.test(code)) return "aggregate over interview notes";
  if (/_avg\s*:\s*\{[^}]*rating/.test(code)) return "_avg over rating";
  return null;
}
check(
  "9 — MUTATION: the scan catches a numeric rating map",
  averagesRatings("const R = { EXCELLENT: 4, GOOD: 3, FAIR: 2, POOR: 1 };") !== null
);
check(
  "9 — MUTATION: the scan catches an averageRating helper",
  averagesRatings("export function averageRating(n: number[]) {}") !== null
);
check(
  "9 — MUTATION: the scan catches a prisma _avg over rating",
  averagesRatings("await prisma.interviewNote.aggregate({ _avg: { rating: true } })") !== null
);
check(
  "9 — the scan does NOT fire on storing a rating",
  averagesRatings("await prisma.interviewNote.create({ data: { rating: 'GOOD' } })") === null
);
/* ⚠ THE NARROWING, ASSERTED. The loose form matched `content/legal/terms.ts:269`,
   which is the ToS forbidding feedback building — a gate failing on its own
   policy document teaches people to loosen the gate. */
check(
  "9 — the scan does NOT fire on ToS prose about a rating score",
  averagesRatings(
    "offer or accept fake services to improve your feedback or rating score, which is called feedback building"
  ) === null
);
check(
  "9 — but ratingScore as an identifier still fires",
  averagesRatings("const ratingScore = 4;") !== null
);
{
  const hits = SRC.map((f) => ({ f, why: averagesRatings(f.code) })).filter((h) => h.why);
  check(
    "9 — ABSENCE: nothing averages interview ratings",
    hits.length === 0,
    hits.map((h) => `${h.f.path} (${h.why})`).join("; ")
  );
}
check(
  "9 — the ratings are STORED, which is the half that was built",
  /rating\s+InterviewRating\?/.test(modelBody("InterviewNote"))
);
check(
  "9 — InterviewRating carries the five named values and no numbers",
  /enum InterviewRating \{\s*EXCELLENT\s+GOOD\s+FAIR\s+POOR\s+NONE\s*\}/.test(
    SCHEMA_CODE.replace(/[ \t]+/g, " ").replace(/\n/g, " ").replace(/enum InterviewRating \{/, "enum InterviewRating {")
  ) ||
    ["EXCELLENT", "GOOD", "FAIR", "POOR", "NONE"].every((v) =>
      new RegExp(`enum InterviewRating \\{[\\s\\S]*?${v}[\\s\\S]*?\\}`).test(SCHEMA_CODE)
    )
);

/* ═══ THE PATTERN ITSELF — REQUEST + RESPONSE, EACH HEADER + LINES ═════════
   ⚠⚠ "Do not break the pattern for one document because it looks simpler." The
   two that would have been broken are `InterviewResponse` (a JSON array of
   times) and `Shortlist` (a boolean on a bid). Asserted so neither collapses
   back later. */

for (const [header, line] of [
  ["BidRequest", "BidRequestLine"],
  ["ProviderBid", "ProviderBidLine"],
  ["TestRequest", "TestRequestLine"],
  ["TestResponse", "TestResponseLine"],
  ["InterviewResponse", "InterviewResponseLine"],
  ["Shortlist", "ShortlistLine"],
] as const) {
  check(`pattern — ${header} exists`, modelBody(header).length > 0);
  check(`pattern — ${line} exists`, modelBody(line).length > 0);
  check(
    `pattern — ${header} has a lines relation to ${line}`,
    new RegExp(`lines\\s+${line}\\[\\]`).test(modelBody(header))
  );
  check(
    `pattern — ${line} carries a line_number`,
    /line_number\s+Int/.test(modelBody(line))
  );
  check(
    `pattern — ${line} is @@unique on (header, line_number)`,
    /@@unique\(\[\w+_id,\s*line_number\]\)/.test(modelBody(line))
  );
}
/* ⚠ THE RANK IS THE LINE NUMBER, and two providers cannot share rank 1 — that is
   how an ordering silently stops being one. */
check(
  "pattern — ShortlistLine ranks by line_number and cannot tie",
  /@@unique\(\[shortlist_id,\s*line_number\]\)/.test(modelBody("ShortlistLine"))
);
check(
  "pattern — a provider appears at most once on a shortlist",
  /@@unique\(\[shortlist_id,\s*provider_person_id\]\)/.test(modelBody("ShortlistLine"))
);
/* ⚠ ABSENCE: the shortcuts that were NOT taken. */
check(
  "pattern — ABSENCE: no `shortlisted` boolean on a bid",
  !/shortlisted\s+Boolean/.test(modelBody("ProviderBid"))
);
check(
  "pattern — ABSENCE: interview slots are rows, not a Json column",
  !/Json/.test(modelBody("InterviewResponse")) && !/Json/.test(modelBody("InterviewResponseLine"))
);
/* ⚠ EVERY HEADER IS QUOTABLE. A document a person cannot name in an email is a
   document support cannot find. */
for (const [model, col] of [
  ["BidRequest", "request_number"],
  ["ProviderBid", "bid_number"],
  ["TestRequest", "request_number"],
  ["TestResponse", "response_number"],
  ["InterviewRequest", "request_number"],
  ["Shortlist", "shortlist_number"],
] as const) {
  check(
    `pattern — ${model}.${col} is @unique`,
    new RegExp(`${col}\\s+String\\s+@unique`).test(modelBody(model))
  );
}

/* ═══ REPORT ══════════════════════════════════════════════════════════════ */

if (failures.length) {
  console.error(`\ncheck:sourcing — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:sourcing — ${pass}/${pass} passed`);
