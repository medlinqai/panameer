import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `check:work-chain` (`P2-A8-E683a` WS-E) ─────────────────────────
 *
 * ⚠⚠⚠ **IT EXISTS BECAUSE `E665` WAS FOUND BY HAND AND NOTHING WOULD HAVE
 * CAUGHT IT.** Five work-chain writers were built, correct, gated — **and
 * unreachable from any page**, for weeks, while every domain gate passed. A
 * suite that exercises a function cannot see that nothing calls it.
 *
 * ⚠⚠ **SO THIS GATE ASKS ONE QUESTION THE OTHERS CANNOT: IS THERE A DOOR?**
 * It counts importers in `src/` specifically — `scripts/` does not count,
 * because a check script importing the writer is what the defect looked like,
 * not what fixes it.
 *
 * ⚠ **AND IT HOLDS THE OPTIONALITY RULE**, which is a product decision a future
 * refactor could quietly break: the brief says the interview and the test are
 * *"each optional… neither may be made a precondition of WS-F."*
 *
 * ⚠ It reads source only — no database, no writes.
 */
let pass = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, why = "") => {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
};
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
function walk(d: string, o: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    if (statSync(f).isDirectory()) walk(f, o);
    else if (/\.tsx?$/.test(f)) o.push(f);
  }
  return o;
}
const SRC = walk("src");
const read = (...p: string[]) => strip(readFileSync(join(...p), "utf8"));

check("0 — the source scan has a population (E586)", SRC.length > 50, `${SRC.length}`);

/* ── 1 · ⚠⚠⚠ EVERY WIRED WRITER HAS A DOOR ─────────────────────────────────
   ⚠⚠ A module is REACHED when some file in `src/` both imports it AND calls
   one of its writers. ⚠ Importing the module is not calling it — the compare
   view imports `@/lib/proposals` for a READ, which is why the call name is
   named too (the trap `check:proposals` §6 hit first). */
const WIRED: { module: string; writer: string; ws: string }[] = [
  { module: "proposals", writer: "submitProposal", ws: "WS-C" },
  { module: "work-request-invite", writer: "inviteProviders", ws: "WS-B" },
  { module: "interviews", writer: "requestInterview", ws: "WS-E" },
  { module: "work-tests", writer: "sendTest", ws: "WS-E" },
];
for (const w of WIRED) {
  const callers = SRC.filter((f) => {
    const b = read(f);
    return b.includes(`from "@/lib/${w.module}"`) && new RegExp(`${w.writer}\\(`).test(b);
  });
  check(
    `1 — ⚠⚠ ${w.writer} is REACHABLE from src/ (${w.ws})`,
    callers.length > 0,
    "the writer existed and was unreachable — scripts/ does not count, and importing is not calling"
  );
}

/*
  ⚠⚠⚠ THE TWO THAT ARE STILL UNREACHABLE ARE NAMED, NOT ASSERTED — AND THE
  DIFFERENCE IS DELIBERATE. `selectProvider` and `workOrder.create` are WS-F's,
  which has not been built. ⚠ Asserting them now would commit a RED gate against
  code that does not exist, and **a gate nobody can run green is a gate somebody
  switches off** (§10). ⚠⚠ They are printed every run so the count stays honest
  and nobody reads this gate as proving the whole chain is wired.
*/
const PENDING = [
  { module: "selection", writer: "selectProvider" },
  { module: "work-orders", writer: "createWorkOrder" },
];
for (const w of PENDING) {
  const callers = SRC.filter((f) => read(f).includes(`from "@/lib/${w.module}"`));
  console.log(
    `   ⚠ WS-F, not asserted: @/lib/${w.module} has ${callers.length} importer(s) in src/`
  );
}

/* ── 2 · ⚠⚠⚠ THE INTERVIEW AND THE TEST ARE OPTIONAL ──────────────────────
   ⚠⚠ The brief: *"each optional, each with its notify(). **Neither may be made
   a precondition of WS-F.**"* ⚠⚠⚠ This is a PRODUCT rule that a plausible
   refactor would break in one line — "only let them select someone they
   interviewed" reads like diligence and is exactly what was ruled out. */
const selection = read("src", "lib", "selection.ts");
check(
  "2 — ⚠⚠⚠ selection reads NO InterviewRequest — an interview is not a precondition",
  !/interviewRequest\s*\.|InterviewRequest/.test(selection),
  "a buyer may select a provider having interviewed nobody"
);
check(
  "2 — ⚠⚠⚠ selection reads NO TestRequest — a test is not a precondition",
  !/testRequest\s*\.|TestRequest/.test(selection),
  "a buyer may select a provider having tested nobody"
);

/* ── 3 · ⚠⚠⚠ A PROVIDER'S NOTIFICATION POINTS AT A PROVIDER'S ROUTE ───────
   ⚠⚠ `E680(b)`: `work.interview_requested` sent the PROVIDER to
   `/work-requests/{id}`, which is `guardPage("canHireTalent")` — a bell entry
   the recipient is bounced out of. ⚠ It was deferred as unreachable; WS-E built
   the door, so it became live and had to be fixed with it. */
const events = read("src", "lib", "notification-events.ts");
const providerEvents = ["work.invited_to_propose", "work.interview_requested", "work.test_requested"];
for (const ev of providerEvents) {
  const i = events.indexOf(`"${ev}"`);
  const block = i >= 0 ? events.slice(i, i + 900) : "";
  /*
    ⚠⚠ IT ASSERTS THE ROUTE, NOT THE FORMATTING — AND THE FIRST VERSION DID THE
    OPPOSITE AND WENT RED ON CORRECT CODE. It matched a single-line
    `` href: (v) => `...` ``, so `work.invited_to_propose` — whose href is a
    two-line ternary with a `/find-work` fallback — read as *"no href found"*.
    ⚠ **A GATE THAT FAILS ON CORRECT CODE IS A GATE SOMEONE SWITCHES OFF** (§10).
    ⚠⚠⚠ The rule is *"a provider's bell entry opens on a provider's route"*, so
    it asks exactly that: the block mentions `/find-work` and does NOT mention
    the buyer-only `/work-requests`.
  */
  const h = block.indexOf("href:");
  const hrefLine = h >= 0 ? block.slice(h, h + 200) : "";
  check(
    `3 — ⚠⚠ ${ev} sends the provider to a provider route`,
    hrefLine.includes("/find-work") && !hrefLine.includes("/work-requests"),
    `${hrefLine.replace(/\s+/g, " ").slice(0, 120)} — /work-requests is canHireTalent and bounces them`
  );
}

/* ── 4 · THE DOORS ARE BUYER-GATED AND STRICT ─────────────────────────────── */
for (const r of ["interview", "test"]) {
  const route = read("src", "app", "api", "work-requests", "[id]", r, "route.ts");
  check(`4 — the ${r} route is gated to BUYERS`, /guardApi\("canHireTalent"\)/.test(route),
    "a provider must not be able to request their own interview or send themselves a test");
  check(`4 — ⚠ the ${r} body schema is .strict()`, /\.strict\(\);/.test(route),
    "a misspelled key would be silently ignored");
}

/* ── 5 · ⚠⚠ THE COMPARE VIEW STILL TAKES NO DECISION ──────────────────────
   ⚠⚠⚠ WS-D's rule is unchanged by WS-E: the steps are not decisions. This
   restates `check:proposals` §11 deliberately — the page now carries CONTROLS,
   so the assertion that it carries no SELECTION control matters more, not less. */
const page = read("src", "app", "(app)", "work-requests", "[id]", "page.tsx");
check(
  "5 — the compare view offers the two optional steps",
  /ProposalSteps/.test(page)
);
check(
  "5 — ⚠⚠⚠ and STILL no selection writer is reachable from it",
  !/selectProvider|@\/lib\/selection|awardTo|declineProposal/.test(page),
  "WS-F is where a decision is taken, and it has no surface yet"
);

console.log(`check:work-chain — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`);
for (const f of fails) console.log(`\n  ✗ ${f}`);
if (fails.length) process.exitCode = 1;
