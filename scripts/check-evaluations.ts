import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const stripComments = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^([ \t]*)\/\/.*$/gm, (_m, i) => i);

const LIB = join("src", "lib", "provider-evaluations.ts");
const SCHEMA = join("prisma", "schema.prisma");

check("0 — the evaluation library exists where this guard expects it", existsSync(LIB), LIB);
check(
  "0 — and it is not empty (a vacuous pass is the defect `E586` names)",
  existsSync(LIB) && statSync(LIB).size > 0
);
check("0 — the schema exists where this guard expects it", existsSync(SCHEMA), SCHEMA);

const libRaw = existsSync(LIB) ? readFileSync(LIB, "utf8") : "";
const lib = stripComments(libRaw);
const schema = existsSync(SCHEMA) ? stripComments(readFileSync(SCHEMA, "utf8")) : "";

check(
  "0 — stripping comments did not empty the library (the stripper itself works)",
  lib.trim().length > 400,
  `${lib.trim().length} chars of live code`
);

/** One top-level `export function` / `export async function` body, or null. */
const fnBody = (code: string, name: string): string | null => {
  const m = new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`).exec(code);
  if (!m) return null;
  const rest = code.slice(m.index);
  const next = /\n(?=export\s+(?:async\s+)?function\s)/.exec(rest.slice(1));
  return next ? rest.slice(0, next.index + 1) : rest;
};

/* ═══ 1 · THE MODELS EXIST AND CARRY THE SHAPE THE RULES DEPEND ON ═════════ */

const model = (name: string): string => {
  const m = new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`).exec(schema);
  return m ? m[0] : "";
};
const ev = model("ProviderEvaluation");
const evLine = model("ProviderEvaluationLine");

check("1 — `ProviderEvaluation` is in the schema", ev.length > 0);
check("1 — `ProviderEvaluationLine` is in the schema", evLine.length > 0);
check(
  "1 — `ProviderEvaluationStatus` is DRAFT and SUBMITTED, and nothing else",
  /enum ProviderEvaluationStatus \{\s*DRAFT\s*SUBMITTED\s*\}/.test(schema),
  "a third state is a workflow, and a workflow needs a ruling"
);

/*
  ⚠⚠⚠ THE `@@unique` TRIPLE IS THE RULE, NOT AN INDEX. A second judgement by the
  same author on the same provider on the same request REPLACES the first —
  otherwise *"what did they think"* has no answer, only a list. ⚠ It is what
  `recordEvaluation`'s upsert keys on, so losing it silently turns replace into
  accumulate.
*/
check(
  "1 — ⚠⚠⚠ one judgement per (request, provider, author) — the @@unique triple",
  /@@unique\(\[work_request_id, provider_person_id, created_by_person_id\]\)/.test(ev)
);
check(
  "1 — the line is unique on (evaluation, line_number) — lines cannot collide",
  /@@unique\(\[provider_evaluation_id, line_number\]\)/.test(evLine)
);
check(
  "1 — ⚠ lines cascade when the evaluation goes — no orphan judgements",
  /provider_evaluation_id\][\s\S]{0,80}onDelete: Cascade/.test(evLine)
);

/*
  ⚠⚠ NOT SCOPED TO AN INTERVIEW, AND NEVER TO A SHORTLIST (ruling 93b). Both links
  are NULLABLE on purpose: the commonest path is a proposal with no interview at all.
*/
check(
  "1 — ⚠⚠ the interview link is NULLABLE — judgement is not scoped to an interview",
  /interview_request_id\s+String\?/.test(ev)
);
check(
  "1 — ⚠⚠ the test link is NULLABLE too, for the same reason",
  /test_request_id\s+String\?/.test(ev)
);
check(
  "1 — the rating is NULLABLE — a summary with no number is a real judgement",
  /overall_rating\s+Int\?/.test(ev)
);

/* ═══ 2 · OWNER-SCOPED FROM THE SESSION, NEVER FROM INPUT ══════════════════ */

const own = fnBody(lib, "recordEvaluation");
const read = fnBody(lib, "evaluationsOn");
check("2 — `recordEvaluation` exists to be asserted on", own != null);
check("2 — `evaluationsOn` exists — a writer with no reader is half a feature", read != null);

/*
  ⚠⚠⚠ THE PERSON COMES FROM `viewer.userId`, NEVER FROM THE BODY. This is
  load-bearing rule 5 (API writes are owner-scoped; the target is resolved from the
  session). ⚠ Without it, any signed-in member could write a judgement onto somebody
  else's sourcing event — the one thing an evaluation must never allow.
*/
check(
  "2 — ⚠⚠⚠ the author is resolved from the SESSION (`user_id: viewer.userId`)",
  /user_id:\s*viewer\.userId/.test(lib),
  "a `created_by_person_id` taken from input is an impersonation hole"
);
check(
  "2 — ⚠⚠ and it is NEVER taken from input — no `input.createdBy*` anywhere",
  !/input\.(createdBy|created_by|authorPersonId|author_person_id)/.test(lib)
);
check(
  "2 — ⚠⚠⚠ the work request must be the caller's own (`buyer_person_id` compared)",
  /buyer_person_id\s*!==\s*person(Id|\.id)/.test(lib),
  "an evaluation on a stranger's request is the hole this closes"
);
check(
  "2 — both entry points assert ownership before they touch a row",
  own != null &&
    read != null &&
    /assertOwnsRequest\(/.test(own) &&
    /assertOwnsRequest\(/.test(read)
);
check(
  "2 — ⚠ the reader is scoped to the author too, not just the request",
  read != null && /created_by_person_id:\s*me\.id/.test(read),
  "otherwise one buyer reads another buyer's judgement of the same provider"
);

/* ═══ 3 · REPLACE, NOT ACCUMULATE ══════════════════════════════════════════ */

check(
  "3 — the write keys on the @@unique triple, so a second judgement REPLACES",
  own != null &&
    /work_request_id_provider_person_id_created_by_person_id/.test(own)
);
/*
  ⚠⚠ THE LINES ARE REPLACED WHOLE, AND THE DELETE IS SCOPED TO THIS EVALUATION.
  ⚠⚠⚠ AN UNSCOPED `deleteMany` HERE WOULD ERASE EVERY REQUESTER'S LINES — the
  `E552`/`E553` sentence again: **a save deletes data it did not create.**
*/
check(
  "3 — ⚠⚠⚠ the line delete is SCOPED to this evaluation, never bare",
  own != null &&
    /providerEvaluationLine\.deleteMany\(\{\s*where:\s*\{\s*provider_evaluation_id:/.test(own),
  "a save must never delete data it did not create (E552/E553)"
);
check(
  "3 — and the whole write is ONE transaction — lines cannot outlive a failed header",
  own != null && /\$transaction\(/.test(own)
);

/* ═══ 4 · SHORTLIST STAYS OPTIONAL — RULING 93b ════════════════════════════ */

/*
  ⚠⚠⚠ THIS IS AN ABSENCE ASSERTION AND IT IS THE MOST IMPORTANT ONE IN THE FILE.
  Scott, 2026-09-28: *"if the requester gets a proposal and does not interview, they
  will not shortlist…they will add them to the WR."*
  ⚠⚠ **SHORTLIST IS OPTIONAL AND IS NOT A STAGE.** A gate — or a function — that
  required a shortlist row would make the commonest path impossible, so what is
  asserted here is that NOTHING in this module reads, requires or joins one.
  ⚠ Written as an absence deliberately: the defect would arrive as an addition.
*/
const SHORTLIST_SHAPES = /(?:prisma|tx)\.shortlist\w*\.|shortlist_id|shortlistLine|ShortlistLine|requireShortlist/;
check(
  "4 — ⚠⚠⚠ ABSENCE: the evaluation module never reads or requires a Shortlist (93b)",
  own != null && read != null && !SHORTLIST_SHAPES.test(lib),
  "a gate that demands a shortlist row breaks the commonest path"
);
check(
  "4 — MUTATION: this scan WOULD catch a shortlist read",
  SHORTLIST_SHAPES.test("const s = await tx.shortlist.findFirst();"),
  "an absence assertion that cannot detect the thing is not an assertion (E586)"
);
check(
  "4 — MUTATION: and would catch a shortlist REQUIREMENT by id",
  SHORTLIST_SHAPES.test("if (!input.shortlist_id) throw new Error();")
);

/* ═══ 5 · THE SCALE IS ENFORCED, AND A VERDICT MUST SAY SOMETHING ══════════ */

/*
  ⚠⚠⚠ THE `\b` IS LOAD-BEARING AND IT WAS MISSING, AND MY OWN MUTATION PROOF IS WHAT
  FOUND IT (`E699` Lane 0.1). Without the word boundary, `n > 5` matches the `5` in
  `n > 500` — so widening the scale to 1–500 left this assertion GREEN.
  ⚠⚠ **THAT IS `E607` INSIDE THE GATE THAT EXISTS TO PREVENT IT: an assertion its own
  mutation cannot fail is not an assertion.** ⚠ It passed for the wrong reason, which
  is the one failure mode a passing test cannot report.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   /n\s*<\s*1\s*\|\|\s*n\s*>\s*5/.test(own)
*/
check(
  "5 — ⚠ the 1–5 scale is ENFORCED, not documented",
  own != null && /n\s*<\s*1\s*\|\|\s*n\s*>\s*5\b/.test(own),
  "a rating outside the scale is a number nobody can read against the others"
);
/*
  ⚠ AND THE BOUNDARY ITSELF IS ASSERTED, so the fix cannot silently rot back. A gate
  that depends on one regex character states what that character is for.
*/
check(
  "5 — MUTATION: the scale check would catch a widened ceiling (1–500)",
  !/n\s*<\s*1\s*\|\|\s*n\s*>\s*5\b/.test("if (!Number.isInteger(n) || n < 1 || n > 500) {") &&
    /n\s*<\s*1\s*\|\|\s*n\s*>\s*5\b/.test("if (!Number.isInteger(n) || n < 1 || n > 5) {"),
  "without \\b, `n > 5` matches the 5 in 500 and the assertion passes on a widened scale"
);
check(
  "5 — integers only — 4.5 is not a rating on a 1–5 scale",
  own != null && /Number\.isInteger\(n\)/.test(own)
);
check(
  "5 — ⚠⚠ a SUBMITTED evaluation must carry a rating or a line",
  own != null && /EMPTY_EVALUATION/.test(own),
  "an empty document wearing a verdict"
);
check(
  "5 — and the line ratings go through the same check, not a second copy (E585)",
  own != null && /for \(const l of input\.lines \?\? \[\]\) assertRating\(/.test(own)
);

/* ═══ 6 · NO MONEY MOVES HERE ══════════════════════════════════════════════ */

/*
  ⚠⚠ AN EVALUATION IS A DOCUMENT THE REQUESTER WRITES. It does not select, assign,
  order or pay. ⚠ Asserted rather than trusted because this module sits in the middle
  of the sourcing chain, where the money models are one import away.
*/
const MONEY_SHAPES =
  /(?:prisma|tx)\.(?:payment|paymentLine|settlementRequest|settlementLine|workOrder)\w*\.(?:create|update|updateMany|upsert|delete|deleteMany)|fee_bps|PAID/;
check(
  "6 — ⚠⚠ ABSENCE: the evaluation module moves no money and creates no order",
  !MONEY_SHAPES.test(lib),
  "an evaluation is a document; it does not select, assign, order or pay"
);
check(
  "6 — MUTATION: this scan WOULD catch a payment write",
  MONEY_SHAPES.test("await tx.payment.create({ data: {} });")
);
check(
  "6 — MUTATION: and would catch a stamped fee",
  MONEY_SHAPES.test("fee_bps: 999")
);

/* ═══ REPORT ══════════════════════════════════════════════════════════════ */

if (failures.length) {
  console.error(`\ncheck:evaluations — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:evaluations — ${pass}/${pass} passed, 0 failed, 0 not run`);
