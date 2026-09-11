/**
 * `check:import-deadline` — no model call may outlive the route that contains
 * it, and a failure must say something (`P1-A1.4-E415` WS-5).
 * `npm run check:import-deadline`.
 *
 * ── ⚠⚠ THE ASSERTION THAT HAD TO EXIST AND DID NOT ─────────────────────────
 *
 * `route.ts` said `maxDuration = 60`. `ai-provider.ts` said
 * `MODEL_TIMEOUT_MS = 55_000`. Neither knew about the other, and the résumé
 * read makes **at least two calls in series** — so a single call was allowed
 * 55 of the route's 60 seconds and the floor was always `inventory + slowest`.
 * ⚠ MEASURED: Scott's CV ran the route to **71.7s**; `marelise.docx`, which is
 * SMALLER, ran the read alone to **75.0s**; a real August import recorded
 * **88.5s** in `profile_imports`.
 *
 * ⚠ NO MODEL CALL, NO DATABASE, NO BROWSER — arithmetic and text scans only.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ROUTE_MAX_DURATION_S, ROUTE_BUDGET_MS, ROUTE_TAIL_RESERVE_MS,
  RESPONSE_RESERVE_MS, READ_BUDGET_MS, MODEL_TIMEOUT_MS, MIN_CALL_MS,
  callTimeoutMs, readTimeRemaining,
} from "@/lib/resume/budget";

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
const read = (...p: string[]) => strip(readFileSync(join(...p), "utf8"));

const BUDGET = read("src", "lib", "resume", "budget.ts");
const PROVIDER = read("src", "lib", "resume", "ai-provider.ts");
const PASSES = read("src", "lib", "resume", "ai-passes.ts");
const IMPORT = read("src", "lib", "resume", "import.ts");
const ROUTE = read("src", "app", "api", "onboarding", "provider", "import", "route.ts");
const PARSE = read("src", "lib", "resume", "parse.ts");

/* ═══ 0 · PROVE THE STRIP ═════════════════════════════════════════════════ */
{
  check("0 — a JSX comment is stripped", !/ghostTok/.test(strip("{/* ghostTok */} real")));
  check("0 — a block comment is stripped", !/ghostTok/.test(strip("/* ghostTok */ real")));
  check("0 — a line comment is stripped", !/ghostTok/.test(strip("// ghostTok\nreal")));
  check("0 — live code survives", /realTok/.test(strip("{/* ghostTok */} realTok")));
  check(
    "0 — a neutralised close sequence does not end a comment early",
    !/ghostTok/.test(strip("{/* was: <X a={1} * / /> ghostTok */} realTok")),
    "E408"
  );
  /* ⚠⚠ PROTECTS §1 AND §5: both files quote the superseded literals in prose. */
  check(
    "0 — ⚠⚠ the superseded `MODEL_TIMEOUT_MS = 55_000` quote is invisible",
    !/const MODEL_TIMEOUT_MS = 55_000;/.test(PROVIDER)
  );
  check(
    "0 — ⚠⚠ the superseded sentinel WRITE is invisible",
    !/pending\.employer = "\(Company not detected\)"/.test(PARSE)
  );
}

/* ═══ 1 · ⚠⚠ NO CALL MAY OUTLIVE ITS ROUTE ═══════════════════════════════
   Mutate: set MODEL_TIMEOUT_MS above maxDuration → red.                    */
{
  check(
    "1 — ⚠⚠ the per-call ceiling is BELOW the route's whole budget",
    MODEL_TIMEOUT_MS < ROUTE_BUDGET_MS,
    `${MODEL_TIMEOUT_MS}ms vs ${ROUTE_BUDGET_MS}ms`
  );
  /* ⚠⚠ AND BELOW HALF OF THE READ BUDGET, because the inventory pass is serial
     in front of the other five — the minimum chain is TWO calls, so anything
     above half guarantees the pair cannot fit. THIS is the arithmetic that was
     missing, not merely "55 < 60". */
  check(
    "1 — ⚠⚠ and no greater than HALF the read budget (inventory is serial)",
    MODEL_TIMEOUT_MS * 2 <= READ_BUDGET_MS,
    `2 x ${MODEL_TIMEOUT_MS} = ${MODEL_TIMEOUT_MS * 2} vs ${READ_BUDGET_MS}`
  );
  check(
    "1 — the read budget leaves room for the tail and the response",
    READ_BUDGET_MS + ROUTE_TAIL_RESERVE_MS + RESPONSE_RESERVE_MS <= ROUTE_BUDGET_MS,
    `${READ_BUDGET_MS}+${ROUTE_TAIL_RESERVE_MS}+${RESPONSE_RESERVE_MS} vs ${ROUTE_BUDGET_MS}`
  );
  check("1 — every reserve is positive", ROUTE_TAIL_RESERVE_MS > 0 && RESPONSE_RESERVE_MS > 0);
  /* ⚠ AND IT HOLDS AT RUNTIME, not just as constants — the grant shrinks with
     the clock and can never exceed the route. */
  const t0 = 1_000_000;
  check("1 — a call at t=0 gets the ceiling", callTimeoutMs(t0, t0) === MODEL_TIMEOUT_MS);
  check(
    "1 — ⚠ a call late in the request gets only what is LEFT",
    callTimeoutMs(t0, t0 + READ_BUDGET_MS - 5_000) === 5_000,
    `got ${callTimeoutMs(t0, t0 + READ_BUDGET_MS - 5_000)}`
  );
  check("1 — ⚠ past the deadline it is zero, never negative", callTimeoutMs(t0, t0 + 999_999) === 0);
  check("1 — off-route (null) it is the plain ceiling", callTimeoutMs(null) === MODEL_TIMEOUT_MS);
  check("1 — remaining time is measured from the request start", readTimeRemaining(t0, t0) === READ_BUDGET_MS);
}

/* ═══ 2 · ⚠ DERIVED, NOT TWO INDEPENDENT LITERALS ════════════════════════
   Mutate: replace the derivation with a hardcoded number → red.            */
{
  check(
    "2 — the per-call ceiling is COMPUTED from the read budget",
    /export const MODEL_TIMEOUT_MS = Math\.floor\(READ_BUDGET_MS \/ 2\);/.test(BUDGET),
    "a literal here is how 55-inside-60 happened"
  );
  check(
    "2 — the read budget is computed from the route budget",
    /export const READ_BUDGET_MS =\s*ROUTE_BUDGET_MS - ROUTE_TAIL_RESERVE_MS - RESPONSE_RESERVE_MS;/.test(BUDGET)
  );
  check("2 — the route budget is computed from maxDuration", /ROUTE_MAX_DURATION_S \* 1000/.test(BUDGET));
  /* ⚠⚠ AND THE ROUTE'S OWN LITERAL AGREES. `export const maxDuration` must be
     statically analysable, so Next.js will not accept an imported expression —
     which is precisely how the two drifted apart. The pair is CHECKED instead. */
  const declared = /export const maxDuration = (\d+);/.exec(ROUTE)?.[1];
  check(
    "2 — ⚠⚠ route.ts's `maxDuration` matches ROUTE_MAX_DURATION_S",
    declared !== undefined && Number(declared) === ROUTE_MAX_DURATION_S,
    `route says ${declared}, budget.ts says ${ROUTE_MAX_DURATION_S}`
  );
  check("2 — ABSENCE: the provider declares no timeout of its own", !/const MODEL_TIMEOUT_MS =/.test(PROVIDER));
  check("2 — it imports the derived one", /import \{ MODEL_TIMEOUT_MS \} from "@\/lib\/resume\/budget";/.test(PROVIDER));
}

/* ═══ 3 · ⚠ THE CLOCK REACHES EVERY CALL ════════════════════════════════ */
{
  check("3 — the route starts the clock at its first line", /const startedAt = Date\.now\(\);/.test(ROUTE));
  check("3 — and hands it to the import", /startedAt,/.test(ROUTE));
  check("3 — the import hands it to the reader", /readDocument\(text, startedAt\)/.test(IMPORT));
  check("3 — the reader hands it to the multi-pass", /aiExtractResumeMultiPass\(text, startedAt\)/.test(IMPORT));
  check("3 — the inventory pass receives it", /inventoryPass\(text, startedAt\)/.test(PASSES));
  for (const p of ["employersPass", "projectsPass", "certificationsPass", "skillsPass", "profilePass"]) {
    check(`3 — ${p} receives it`, new RegExp(`${p}\\([^)]*startedAt\\)`).test(PASSES));
  }
  check("3 — ⚠ every call asks for the remaining time", /const budget = callTimeoutMs\(startedAt\);/.test(PASSES));
  check("3 — ⚠ and the provider enforces THAT, not the constant", /signal: AbortSignal\.timeout\(budgetMs\)/.test(PROVIDER));
  /* ⚠ DON'T START A CALL THERE IS NO TIME FOR — cheaper and truer than letting
     it run out. */
  check("3 — ⚠ a call with no time left is not made at all", /budget < MIN_CALL_MS/.test(PASSES));
  check("3 — and reports `deadline`, not a model error", /reason: "deadline",/.test(PASSES));
  check("3 — MIN_CALL_MS is a real floor", MIN_CALL_MS > 0 && MIN_CALL_MS < MODEL_TIMEOUT_MS);
}

/* ═══ 4 · ⚠ THE FAILURE SAYS SOMETHING ══════════════════════════════════
   Mutate: return a bare failure → red.                                     */
{
  check(
    "4 — ⚠⚠ a deadline produces a sentence for the person",
    /Your document took longer to read than we allow for one upload/.test(IMPORT)
  );
  check("4 — it says the work was still saved", /Everything below was still saved/.test(IMPORT));
  check("4 — it is raised only when the CLOCK was the cause", /read\.path\.reason === "deadline"/.test(IMPORT));
  check("4 — the reason survives to the row", /reason: outcome\.reason,/.test(IMPORT));
  check("4 — `deadline` is in the outcome union", /"no_key" \| "error" \| "refusal" \| "deadline"/.test(PASSES));
  /* ⚠ THE PROVIDER'S OWN TIMEOUT MESSAGE NAMES THE BUDGET THAT WAS APPLIED,
     not a constant that may not have been the one enforced. */
  check(
    "4 — the timeout message quotes the enforced budget",
    /took longer than \$\{Math\.round\(budgetMs \/ 1000\)\}s/.test(PROVIDER)
  );
  /* ⚠ AND THE ROUTE REPORTS ITS OWN SPEND, which is the number nobody had. */
  check("4 — the route logs what it spent", /\[resume\] route=\$\{Date\.now\(\) - startedAt\}ms/.test(ROUTE));
  check("4 — the reader logs what IT spent", /\[resume\] read=\$\{Date\.now\(\) - readStarted\}ms/.test(IMPORT));
}

/* ═══ 5 · ⚠ NULL, NOT A SENTINEL — AND THE COUNT SURVIVES ═══════════════
   5 and 6 together are the point.                                          */
{
  check(
    "5 — ⚠⚠ ABSENCE: the company sentinel is never written",
    !/pending\.employer = "\(Company not detected\)"/.test(PARSE),
    "E373 made Employer.name nullable precisely so this string would not exist"
  );
  check(
    "5 — the storage path writes null for an absent name",
    /name: e\.employer \? e\.employer\.slice\(0, 200\) : null,/.test(IMPORT)
  );
  /* ⚠ THE ROLE SENTINEL IS DELIBERATELY UNTOUCHED — a different column, not
     what E373 made nullable, and its write/compare pair still holds. */
  check("5 — ⚠ the ROLE sentinel is still written", /pending\.roleTitle = "\(Role not detected\)";/.test(PARSE));
}

/* ═══ 6 · ⚠ THE MISSING-NAME GAP STILL FIRES ════════════════════════════
   Mutate: remove the count → red.                                          */
{
  check(
    "6 — ⚠⚠ the count now reads the ABSENCE, not the marker",
    /!e\.employer\?\.trim\(\) \|\| e\.roleTitle === "\(Role not detected\)"/.test(PARSE)
  );
  check(
    "6 — and the gap message still exists",
    /imported with a missing company or job title/.test(PARSE)
  );
  check("6 — it is still gated on a non-zero count", /if \(unnamed > 0\)/.test(PARSE));
}

if (failures.length) {
  console.error(`\ncheck:import-deadline — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:import-deadline — ${pass}/${pass} passed`);
