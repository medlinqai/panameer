/**
 * `check:hire` — the rules the Hire surfaces cannot be allowed to lose
 * (`P1-J4-E392`). `npm run check:hire`.
 *
 * ── ⚠⚠ THE THREE THINGS THIS BRIEF SAID TWICE ───────────────────────────────
 *
 *   1. **ONE FUNCTION for the COMPLETE gate**, read by the page AND the API, so
 *      a disabled button can never disagree with the refusal behind it.
 *   2. **THE WIZARD IS NOT REBUILT.** Its `STEPS` array is nine steps in one
 *      order, and this asserts them BY NAME — *"if you find yourself editing the
 *      STEPS array or restructuring the wizard, STOP AND REPORT."*
 *   3. **THE WS-3 FENCE: CREATE THE INVITE, NOTHING MORE.** No bid list, no
 *      comparison, no scoring, no shortlist. *"If you find yourself rendering
 *      Proposal rows, STOP AND REPORT."*
 *
 * ⚠ ALL THREE ARE THINGS A LATER CHANGE WOULD BREAK WHILE LOOKING LIKE AN
 * IMPROVEMENT. Adding a tenth wizard step is an obvious feature; showing whether
 * an invited provider replied is one `include` away and is the beginning of the
 * bid screen. They are wrong for reasons that live in the brief and nowhere in
 * the code, which is why the absence has to be a test — a comment cannot fail a
 * build.
 *
 * ⚠ NO DATABASE AND NO BROWSER. Source is read as text; rules are exercised as
 * functions.
 */
/*
  ── ⚠⚠ MOVED OFF `basis` ONTO `transaction_type` (`P2-A8-E621`, ruling 37b) ─
  ⚠ Scott's `WR_LINE` field set names THREE types where `LineBasis` had two, and
  the requisition line now carries `TransactionType`. ⚠⚠ THE RULE THESE FIXTURES
  ASSERT IS UNCHANGED — every line assigned and priced — only the field it reads
  moved. ⚠ `RATE` became `SERVICE_BY_QTY` and `AMOUNT` became `SERVICE_BY_AMT`:
  these fixtures are all SERVICES, and `PRODUCT_BY_QTY` is not reachable from a
  buyer's budget type (see `transactionTypeForPricingType`).
  ⚠ SUPERSEDED, quoted not deleted (`E164`): `basis: "RATE"` / `basis: "AMOUNT"`.
*/
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { workRequestIsComplete } from "@/lib/transaction-spine";
import {
  completenessFor,
  completenessMessage,
  type LineForCompleteness,
} from "@/lib/work-request-lines";
import { ROUTE_ACCESS } from "@/lib/route-access";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

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
const fileAt = (p: string) => SRC.find((f) => f.path === join(...p.split("/")));

/* ═══ 1 · THE COMPLETE GATE IS ONE FUNCTION, AND IT AGREES WITH THE SPINE ═══
   ⚠⚠ `E388`'s `workRequestIsComplete` stays the authority on WHAT complete
   means. `completenessFor` adds the REASONS and nothing else. If the two ever
   drift, the page greys a button the API would have accepted — or worse, offers
   one the API refuses. */

const L = (o: Partial<LineForCompleteness>): LineForCompleteness => ({
  line_number: 1,
  description: "a line",
  transaction_type: "SERVICE_BY_QTY",
  ...o,
});

/** The truth table: every combination of assigned × priced, for both bases. */
const TRUTH_TABLE: { name: string; lines: LineForCompleteness[] }[] = [
  { name: "no lines at all", lines: [] },
  { name: "RATE, assigned + priced", lines: [L({ provider_person_id: "p", unit_price_cents: 15000 })] },
  { name: "RATE, assigned, no price", lines: [L({ provider_person_id: "p" })] },
  { name: "RATE, priced, no provider", lines: [L({ unit_price_cents: 15000 })] },
  { name: "RATE, neither", lines: [L({})] },
  { name: "AMOUNT, assigned + priced", lines: [L({ transaction_type: "SERVICE_BY_AMT", provider_person_id: "p", amount_cents: 24000 })] },
  { name: "AMOUNT, assigned, no price", lines: [L({ transaction_type: "SERVICE_BY_AMT", provider_person_id: "p" })] },
  { name: "AMOUNT, priced, no provider", lines: [L({ transaction_type: "SERVICE_BY_AMT", amount_cents: 24000 })] },
  {
    /* ⚠ THE CROSS-COLUMN TRAP: an AMOUNT line carrying a unit price is NOT
       priced, and a RATE line carrying an amount is NOT priced. Reading one
       column for both bases is how half the lines render as free. */
    name: "AMOUNT line carrying a unit price is NOT priced",
    lines: [L({ transaction_type: "SERVICE_BY_AMT", provider_person_id: "p", unit_price_cents: 15000 })],
  },
  {
    name: "RATE line carrying an amount is NOT priced",
    lines: [L({ provider_person_id: "p", amount_cents: 24000 })],
  },
  {
    name: "two lines, one short",
    lines: [
      L({ line_number: 1, provider_person_id: "p", unit_price_cents: 15000 }),
      L({ line_number: 2, transaction_type: "SERVICE_BY_AMT", provider_person_id: "p" }),
    ],
  },
  {
    name: "three lines, all ready",
    lines: [
      L({ line_number: 1, provider_person_id: "p", unit_price_cents: 15000 }),
      L({ line_number: 2, transaction_type: "SERVICE_BY_AMT", provider_person_id: "q", amount_cents: 900 }),
      L({ line_number: 3, provider_person_id: "r", unit_price_cents: 1 }),
    ],
  },
];

for (const row of TRUTH_TABLE) {
  const mine = completenessFor(row.lines).complete;
  const spine = workRequestIsComplete(row.lines);
  check(
    `1 — completenessFor agrees with workRequestIsComplete: ${row.name}`,
    mine === spine,
    `completenessFor said ${mine}, the spine said ${spine}`
  );
}

/* ⚠ THE MUTATION: a `completenessFor` that ignored the transaction type — the single most
   likely wrong rewrite — must DISAGREE with the spine, or the table above is
   proving nothing. */
function naiveComplete(lines: LineForCompleteness[]): boolean {
  return (
    lines.length > 0 &&
    lines.every((l) => !!l.provider_person_id && l.unit_price_cents != null)
  );
}
{
  const disagreements = TRUTH_TABLE.filter(
    (r) => naiveComplete(r.lines) !== workRequestIsComplete(r.lines)
  );
  check(
    "1 — MUTATION: a type-blind completeness check DOES disagree with the spine",
    disagreements.length > 0,
    "the truth table cannot tell the two apart — it is not exercising the rule"
  );
}

/* The reasons half — a boolean can only produce a grey button. */
check(
  "1 — no lines reports NO_LINES, not an empty success",
  completenessFor([]).reason === "NO_LINES" && !completenessFor([]).complete
);
{
  const c = completenessFor([
    L({ line_number: 1, provider_person_id: "p", unit_price_cents: 15000 }),
    L({ line_number: 2, transaction_type: "SERVICE_BY_AMT" }),
    L({ line_number: 3, provider_person_id: "p" }),
  ]);
  check("1 — only the SHORT lines appear in gaps", c.gaps.length === 2);
  check("1 — the gap names the line number", c.gaps[0].lineNumber === 2);
  check(
    "1 — a line missing both says both",
    c.gaps[0].missing.join(",") === "provider,price"
  );
  check(
    "1 — a line missing only the price says only that",
    c.gaps[1].lineNumber === 3 && c.gaps[1].missing.join(",") === "price"
  );
  check("1 — gaps come back in line order", c.gaps[0].lineNumber < c.gaps[1].lineNumber);
  check(
    "1 — the message names every short line",
    completenessMessage(c).includes("Line 2") && completenessMessage(c).includes("Line 3")
  );
}
check(
  "1 — the COMPLETE message is a sentence, not a code",
  completenessMessage(completenessFor([])).includes("Add at least one line")
);

/**
 * ⚠⚠ ABSENCE: NO SECOND DERIVATION OF THE GATE.
 *
 * **A disabled button with no reason is a defect this codebase already fixed
 * once** — `create-work/page.tsx` reads `missingIdentityForPerson`, the same
 * function `postWorkRequest` enforces with. This is that pattern again, and the
 * way it breaks is somebody writing `lines.every(l => l.provider_person_id)` in
 * a component because it is three seconds faster than an import.
 */
/**
 * ⚠ TWO FILES ARE ALLOWED, AND THEY ARE NOT TWO DERIVATIONS.
 * `transaction-spine.ts` holds `workRequestIsComplete` — `E388`'s rule and the
 * AUTHORITY on what complete means. `work-request-lines.ts` holds
 * `completenessFor`, which adds the REASONS and is asserted above to agree with
 * it across a truth table. Anything else is a third answer.
 */
const COMPLETENESS_HOMES = [
  join("src", "lib", "work-request-lines.ts"),
  join("src", "lib", "transaction-spine.ts"),
];
function derivesCompletenessLocally(path: string, code: string): boolean {
  if (COMPLETENESS_HOMES.includes(path)) return false;
  return /\.every\(\s*\(?\s*\w+\s*\)?\s*=>[^)]*provider_person_id/.test(code);
}
check(
  "1 — the two allowed homes are real files",
  COMPLETENESS_HOMES.every((p) => SRC.some((f) => f.path === p))
);
check(
  "1 — MUTATION: the scan catches a hand-rolled completeness check",
  derivesCompletenessLocally(
    join("src", "app", "fake", "page.tsx"),
    "const ready = lines.every((l) => l.provider_person_id && l.unit_price_cents);"
  )
);
{
  const hits = SRC.filter((f) => derivesCompletenessLocally(f.path, f.code));
  check(
    "1 — ABSENCE: the COMPLETE gate is derived in exactly one file",
    hits.length === 0,
    hits.map((h) => h.path).join(", ")
  );
}

/* ⚠ BOTH READERS ACTUALLY READ IT. "One function" is only true if the page and
   the route are the two callers the brief named. */
{
  const api = fileAt("src/app/api/work-requests/[id]/complete/route.ts");
  const lib = fileAt("src/lib/work-request-lines.ts");
  const ui = fileAt("src/components/work/WorkRequestLines.tsx");
  const list = fileAt("src/lib/hire.ts");
  check("1 — the complete API route exists", !!api);
  check(
    "1 — the API refuses out of the shared function",
    !!lib && /completenessFor\(rows\)/.test(lib.code) && /completenessMessage\(/.test(lib.code)
  );
  check(
    "1 — the page's button is disabled out of the server's completeness",
    !!ui && /disabled=\{!c\.complete/.test(ui.code)
  );
  check(
    "1 — the LIST reads the same function too",
    !!list && /completenessFor\(/.test(list.code)
  );
  /* ⚠ THE UI MUST NOT COMPUTE IT — it renders what the server sent. */
  check(
    "1 — ABSENCE: the component never imports the raw spine rule",
    !!ui && !/workRequestIsComplete/.test(ui.code)
  );
}

/* ═══ 2 · THE WIZARD IS NOT REBUILT ════════════════════════════════════════
   ⚠⚠ *"If you find yourself editing the STEPS array or restructuring the wizard,
   STOP AND REPORT."* Nine steps, in this order. */

const WIZARD_STEPS = [
  "role",
  "domain",
  "skills",
  "specializations",
  "dates",
  "location",
  "budget",
  "description",
  "review",
];
{
  const wiz = fileAt("src/components/work/CreateWorkRequest.tsx");
  check("2 — the wizard is still where it was", !!wiz);
  const m = wiz?.text.match(/const STEPS = \[([\s\S]*?)\] as const;/);
  check("2 — the STEPS array is still a const array", !!m);
  const found = (m?.[1].match(/"([a-z]+)"/g) ?? []).map((s) => s.replace(/"/g, ""));
  check(
    "2 — the wizard is NINE steps",
    found.length === 9,
    `found ${found.length}: ${found.join(", ")}`
  );
  check(
    "2 — the nine steps are unchanged, in order",
    found.join(",") === WIZARD_STEPS.join(","),
    `found ${found.join(",")}`
  );
  /* ⚠ AND IT IS STILL THE SAME SIZE. A "restructure" that kept the nine names
     would still be the rewrite the brief forbade. 1,062 lines at `54d272b`;
     a generous band, because this is a tripwire and not a style rule. */
  const lineCount = wiz?.text.split("\n").length ?? 0;
  check(
    "2 — the wizard has not been rewritten (line count within ±10%)",
    lineCount > 950 && lineCount < 1170,
    `${lineCount} lines`
  );
  /* ⚠ LINE 1 COMES FROM THE HEADER, NOT FROM A TENTH WIZARD STEP. */
  check(
    "2 — ABSENCE: the wizard knows nothing about lines",
    !!wiz && !/workRequestLine|WorkRequestLine|line_number/.test(wiz.code)
  );
}

/* ═══ 3 · THE WS-3 FENCE — CREATE THE INVITE, NOTHING MORE ═════════════════
   ⚠⚠ *"Do NOT build the bid list, the bid-comparison screen, scoring,
   shortlisting, tests or interviews… If you find yourself rendering Proposal
   rows, STOP AND REPORT."* */

/**
 * ⚠ AN ALLOWLIST, NOT A DIRECTORY BLOCKLIST — the same reasoning `check:sourcing`
 * uses for `InterviewNote`. Enumerating every hire surface means the gate is only
 * as good as that list; a page added next month is not on it. So the sourcing
 * RESPONSE models may be referenced from NOWHERE, and the day somebody needs one
 * they add the file deliberately and a reviewer sees exactly the `include` that
 * opens the bid screen.
 */
/*
  ── ⚠⚠⚠ RE-ANCHORED ON THE CALL SHAPE, NOT THE WORD (`P2-ALL-E699` Lane 0.3) ──

  ⚠⚠ **RULED IN `98f`: THE RULE IS RIGHT AND THE UNIT IS WRONG. ANCHOR ON THE
  FUNCTION, NOT THE FILE — AND DO NOT CUT A NEEDLE EXCEPTION.**

  ⚠⚠⚠ **BUT THE FILE SCOPE WAS ONLY HALF THE DEFECT, AND THE OTHER HALF IS WORSE.**
  This regex used to read `/\bproposal\b|\bProposal\b|.../`, which matched the
  ENGLISH WORD. ⚠ While the model was called `ProviderBid`, "proposal" appeared
  nowhere but in prose nobody scanned — so the pattern was specific by accident.
  ⚠⚠ **`P2-A8-E695` RENAMED `ProviderBid` -> `Proposal`, AND THE SAME PATTERN BECAME A
  PROSE MATCHER OVERNIGHT:** it started hitting `content/legal/terms.ts`,
  `user-agreement.ts`, `email/templates/work-request-invite.ts`,
  `notification-events.ts` and `assessment-data.ts` — none of which reads a
  proposal. They contain the word, inside live string literals, which
  `stripComments` cannot and should not remove.
  ⚠⚠⚠ **THAT IS RULING `98a`'s FAMILY: A RENAME MADE A STRING-BASED CHECK MEAN
  SOMETHING ELSE, AND NOTHING FAILED AT THE MOMENT IT CHANGED MEANING.**

  ⚠ **SO THE SUBJECT IS NOW A CALL SHAPE AND A TYPE USE, NAMED EXPLICITLY (ruling
  96 — a census names the shapes it searched):**
    · a Prisma READ on one of the response models, via `prisma.` OR `tx.`
      (`tx.` matters: a read inside `$transaction` is the shape `E693`'s census
      missed, and it is how "0 readers" became a false sentence)
    · a RENDER over one of those types — an annotation or an array type, which is
      how a comparison screen shows up before any query does
  ⚠⚠ **PROSE NO LONGER MATCHES, AND THAT IS THE POINT: the fence is about reading
  another provider's price, not about saying the word.**
*/
const RESPONSE_READ =
  /\b(?:prisma|tx)\.(?:proposal|proposalLine|testResponse|interviewResponse|shortlist|shortlistLine)\.(?:findMany|findFirst|findUnique|count|aggregate|groupBy)/;
const RESPONSE_RENDER =
  /:\s*(?:Proposal|ProposalLine|ShortlistLine|TestResponse|InterviewResponse)\b|\b(?:Proposal|ProposalLine|ShortlistLine|TestResponse|InterviewResponse)\[\]/;
const RESPONSE_MODELS = new RegExp(`${RESPONSE_READ.source}|${RESPONSE_RENDER.source}`);
const SOURCING_LIB = join("src", "lib", "sourcing.ts");
const SOURCING_STAGE = join("src", "lib", "sourcing-stage.ts");
/*
  ── ⚠⚠⚠ TWO FILES ADDED DELIBERATELY (`P2-A8-E621` WS-A) ────────────────

  ⚠ THE DOCBLOCK ABOVE DESCRIBES EXACTLY THIS MOMENT: *"the day somebody needs
  one they add the file DELIBERATELY and a reviewer sees exactly the `include`
  that opens the bid screen."* ⚠⚠ This is that addition, and it is authorised —
  **ruling 25** makes the whole chain MVP scope and **ruling 24** says a missing
  writer is not a reason to defer the surface that creates it.

  ⚠⚠⚠ THE FENCE IS NOT WEAKENED, BECAUSE NEITHER FILE IS WHAT IT GUARDS. The
  WS-3 fence names *"the bid list, the bid-comparison screen, scoring,
  shortlisting, tests or interviews"* — **all of which are still forbidden here
  and are WS-B's and WS-C's to add, each with its own deliberate line.**
  · `proposals.ts` is the WRITER — it creates and withdraws a proposal. It
    renders nothing and reads no other provider's bid.
  · `statistics.ts` reads a **COUNT of the viewer's OWN proposals**, for the
    figure that said *"nothing creates one"*. ⚠ A count of your own is not the
    comparison screen; it cannot show you anybody else's price.
*/
const PROPOSAL_WRITER = join("src", "lib", "proposals.ts");
const STATISTICS_LIB = join("src", "lib", "statistics.ts");
/*
  ── ⚠⚠⚠ TWO MORE ADDED DELIBERATELY (`P2-A8-E621` WS-B) ─────────────────

  ⚠ The fence names *"tests or interviews"* as forbidden, and said they would be
  **WS-B's to add, each with its own deliberate line.** ⚠⚠ This is that line.

  ⚠⚠⚠ AND WHAT THE FENCE ACTUALLY GUARDS IS STILL GUARDED, because neither file
  is a SCREEN. The rule exists to stop **a bid list and a bid-comparison view** —
  one buyer reading many providers' prices side by side.
  · `interviews.ts` reaches `proposal` for exactly ONE thing: proving the
    named provider has proposed, by the `(work_request_id, provider_person_id)`
    unique key. **One provider, by key, no list, no price read.**
  · `work-tests.ts` does the identical single lookup, for the identical reason.
  ⚠ Both are WRITERS. Neither renders anything and neither can enumerate.
*/
const INTERVIEW_WRITER = join("src", "lib", "interviews.ts");
const TEST_WRITER = join("src", "lib", "work-tests.ts");
/*
  ── ⚠⚠⚠ AND THE SELECTION WRITER (`P2-A8-E621` WS-C) ────────────────────

  ⚠⚠ THIS ONE IS DIFFERENT FROM THE OTHER FOUR AND IS FENCED HARDER, BECAUSE IT
  GENUINELY READS A PROPOSAL'S PRICE. ⚠ It has to: the requisition line is priced
  at **the provider's own rate**, and the alternative is the buyer typing it,
  which is the defect `selectProvider`'s docblock exists to prevent.

  ⚠⚠⚠ WHAT THE FENCE ACTUALLY FORBIDS IS STILL FORBIDDEN — **many providers'
  prices side by side.** So the narrowing below is specific rather than blanket:
  · the WINNER is read by the `(work_request_id, provider_person_id)` UNIQUE KEY,
    which can only ever return the one provider the buyer already chose;
  · the one `findMany` over proposals selects **`id` alone** — it exists to clear
    worklist notifications and to mark losers, and **cannot see a price**;
  · `cover_note` is never read here. ⚠ The pitch is comparison material, and a
    writer has no use for it.
*/
const SELECTION_WRITER = join("src", "lib", "selection.ts");
/*
  ── ⚠⚠⚠ AND THE WORK ORDER WRITER (`P2-A8-E621` WS-D) ───────────────────

  ⚠ It touches `proposal` for ONE reason: ruling 16 — *"a declined work order
  goes back to the buyer to pick someone else"* — so a decline puts the other
  proposals back in contention. ⚠⚠ **It only ever WRITES statuses. It performs no
  `proposal` read at all**, which is a tighter fence than any of the four
  above, and the assertion below is an absence rather than a narrowing.
*/
const ORDER_WRITER = join("src", "lib", "work-orders.ts");
/*
  ── ⚠⚠⚠ A THIRD DELIBERATE ADDITION (`P2-A8-E703`) ──────────────────────────

  ⚠ **THE DOCBLOCK ABOVE DESCRIBES EXACTLY THIS MOMENT:** *"the day somebody needs one
  they add the file DELIBERATELY and a reviewer sees exactly the `include` that opens the
  bid screen."* ⚠⚠ This is that addition, and it is authorised: `A4`'s brief adds the
  `source` column so suggested and shortlisted can live in one table (ruling 94e).

  ⚠⚠⚠ **AND IT IS NOT A NEEDLE EXCEPTION FOR ONE LINE, WHICH `98f` FORBIDS — IT IS A
  NAMED FILE WITH A FENCE UNDER IT.** The WS-3 fence names *"the bid list, the
  bid-comparison screen, scoring, shortlisting, tests or interviews"*; ⚠ **shortlisting is
  now built, so the fence narrows to what it was really protecting: THE PRICE.**
  ⚠⚠ `lib/shortlists.ts` may name providers and carry a `note`. **It must never read a
  proposal's PRICE or narrative** — that is what turns a list into a comparison screen,
  and the assertions below hold it to that.
*/
const SHORTLIST_LIB = join("src", "lib", "shortlists.ts");
{
  const hits = SRC.filter(
    (f) =>
      RESPONSE_MODELS.test(f.code) &&
      f.path !== SOURCING_LIB &&
      f.path !== SOURCING_STAGE &&
      f.path !== PROPOSAL_WRITER &&
      f.path !== STATISTICS_LIB &&
      f.path !== INTERVIEW_WRITER &&
      f.path !== TEST_WRITER &&
      f.path !== SELECTION_WRITER &&
      f.path !== ORDER_WRITER &&
      f.path !== SHORTLIST_LIB
  );
/*
  ⚠⚠⚠ AND THE TWO EXEMPTIONS ARE FENCED, so neither can grow into the screen
  the rule exists to prevent. ⚠ An exemption worth having is one that stays
  narrow — the `check:derived-source` pattern.
*/
{
  const statsFile = SRC.find((f) => f.path === STATISTICS_LIB);
  check(
    "3 — ⚠⚠ statistics only COUNTS proposals, never selects their rows",
    statsFile != null &&
      !/proposal\.(findMany|findFirst|findUnique)/.test(statsFile.code),
    "a count of your own is not the comparison screen; a findMany would be"
  );
  /*
    ── ⚠⚠⚠ ANCHORED ON THE FUNCTIONS, NOT THE FILE (`98f`, Lane 0.3) ───────────

    ⚠⚠ **THIS WENT RED AT `22cf82d`, WHICH PUT `proposalsOn` — A LEGITIMATE,
    OWNER-SCOPED *BUYER* READ — INTO `proposals.ts`**, while the assertion treated
    the whole FILE as the provider's writer. ⚠ Scott, `98f`: *"THE RULE IS RIGHT AND
    THE UNIT IS WRONG… DO NOT SILENCE IT AND DO NOT CUT A NEEDLE EXCEPTION FOR
    `22cf82d`'s LINE. A file-scoped gate with one hand-cut hole is a gate that will
    be wrong again and will look deliberate."*

    ⚠⚠⚠ **SO `proposalsOn` IS EXCLUDED BY SCOPE, NOT BY NAME-MATCHING ITS LINE.** The
    three PROVIDER-side functions are named and each body is asserted on its own. A
    fourth writer added tomorrow must be added here — which is the point: the list is
    of WRITERS, and a writer that is not on it is not asserted, so the gate says so.
    ⚠ Ruling 92: each function must EXIST, asserted before anything is measured —
    a renamed writer must not silently stop being checked (`98g`, `99c`).
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   writerFile != null && !/proposal\.findMany/.test(writerFile.code)
  */
  const writerFile = SRC.find((f) => f.path === PROPOSAL_WRITER);
  check("3 — the proposal writer file is where this guard expects it", writerFile != null);
  /** The body of one top-level `export function` / `export async function`. */
  const fnBody = (code: string, name: string): string | null => {
    const m = new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`).exec(code);
    if (!m) return null;
    const rest = code.slice(m.index);
    const next = /\n(?=export\s+(?:async\s+)?function\s)/.exec(rest.slice(1));
    return next ? rest.slice(0, next.index + 1) : rest;
  };
  /*
    ⚠ THE PROVIDER'S WRITERS. `proposalsOn` is deliberately ABSENT — it is the
    BUYER's read of proposals on their OWN work request (`E682` WS-D), owner-scoped
    through `loadOwned`, and comparing proposals is the buyer's whole job.
  */
  const PROPOSAL_WRITER_FNS = ["proposeEligibility", "submitProposal", "withdrawProposal"];
  for (const fn of PROPOSAL_WRITER_FNS) {
    const body = writerFile ? fnBody(writerFile.code, fn) : null;
    check(`3 — the writer \`${fn}\` exists to be asserted on`, body != null);
    check(
      `3 — ⚠⚠⚠ \`${fn}\` never reads ANOTHER provider's proposal`,
      body != null && !/proposal\.findMany/.test(body),
      "it may read the viewer's own by unique key; a list is the bid screen"
    );
  }
  /*
    ⚠⚠⚠ THE TWO WS-B EXEMPTIONS, FENCED THE SAME WAY AND MORE TIGHTLY: each may
    look ONE proposal up BY KEY and must not enumerate or read a price.
    ⚠ `findMany` is what turns a permission check into a bid list; `cover_note`
    and the line models are what turn it into a comparison.
  */
  for (const [label, path] of [
    ["the interview writer", INTERVIEW_WRITER],
    ["the test writer", TEST_WRITER],
  ] as const) {
    const f = SRC.find((x) => x.path === path);
    check(
      `3 — ⚠⚠⚠ ${label} checks ONE proposal by key and never lists them`,
      f != null && !/proposal\.(findMany|count|aggregate|groupBy)/.test(f.code),
      "a findMany here is the bid screen the WS-3 fence exists to prevent"
    );
    check(
      `3 — ⚠⚠ ${label} reads no proposal PRICE or narrative`,
      f != null && !/proposalLine|cover_note|amount_cents|rate_cents/.test(f.code),
      "the fence is about comparing providers' prices — that is the comparison"
    );
  }

  /*
    ⚠⚠⚠ THE SELECTION WRITER'S OWN FENCE — TIGHTER, BECAUSE IT DOES READ A PRICE.
    ⚠ See the block above `SELECTION_WRITER` for why each of these three is the
    assertion that matters rather than a blanket ban.
  */
  const sel = SRC.find((f) => f.path === SELECTION_WRITER);
  check(
    "3 — ⚠⚠⚠ the selection writer reads the WINNER by unique key, never a list of bidders",
    sel != null && /work_request_id_provider_person_id/.test(sel.code),
    "a unique key can only return the one provider the buyer already chose"
  );
  check(
    "3 — ⚠⚠⚠ and its only proposal findMany selects `id` ALONE — it cannot see a price",
    sel != null &&
      (sel.code.match(/proposal\.findMany/g) ?? []).length === 1 &&
      /proposal\.findMany\(\{[\s\S]{0,160}?select:\s*\{\s*id:\s*true,?\s*\}/.test(sel.code),
    "widening that select is how a writer becomes the bid-comparison screen"
  );
  check(
    "3 — ⚠⚠ it never reads a proposal's cover note",
    sel != null && !/cover_note/.test(sel.code),
    "the pitch is comparison material; a writer has no use for it"
  );
  /*
    ── ⚠⚠ THE SHORTLIST LIB'S FENCE — IT MAY LIST, IT MAY NOT COMPARE ──────────
  */
  const slLib = SRC.find((f) => f.path === SHORTLIST_LIB);
  check("3 — the shortlist lib exists to be fenced", slLib != null);
  check(
    "3 — ⚠⚠⚠ it reads NO proposal price and NO cover note — a list, never a comparison",
    slLib != null && !/proposalLine|cover_note|unit_price_cents|amount_cents/.test(slLib.code),
    "the price is what turns a shortlist into the bid-comparison screen"
  );
  check(
    "3 — ⚠⚠ and it never reads a Proposal row at all — `proposal_id` is carried, not followed",
    slLib != null && !/(?:prisma|tx)\.proposal\w*\.(findMany|findFirst|findUnique)/.test(slLib.code),
    "a suggestion has no proposal behind it (94e); following one would be the screen"
  );
  /* ⚠⚠⚠ THE WORK ORDER WRITER NEVER READS A PROPOSAL AT ALL — only updateMany. */
  const wo = SRC.find((f) => f.path === ORDER_WRITER);
  check(
    "3 — ⚠⚠⚠ ABSENCE: the work order writer never READS a proposal, it only records a decline",
    wo != null && !/proposal\.(findMany|findFirst|findUnique|count|aggregate|groupBy)/.test(wo.code),
    "ruling 16 needs the statuses moved, and nothing else"
  );
  check(
    "3 — ⚠⚠ and it reads no proposal price or narrative either",
    wo != null && !/proposalLine|cover_note/.test(wo.code)
  );
}

  check(
    "3 — ABSENCE: no hire surface reads a bid, test, interview or shortlist response",
    hits.length === 0,
    hits.map((h) => h.path).join(", ")
  );
}
check(
  "3 — MUTATION: the scan would catch a bid list",
  RESPONSE_MODELS.test("const bids = await prisma.proposal.findMany();")
);
check(
  "3 — MUTATION: the scan would catch a shortlist render",
  RESPONSE_MODELS.test("rows.map((r: ShortlistLine) => r.line_number)")
);
{
  const inv = fileAt("src/lib/work-request-invite.ts");
  check("3 — the invite lib exists (E395 landed, so WS-3 is in scope)", !!inv);
  check(
    "3 — it writes ProposalRequest",
    !!inv && /prisma\.proposalRequest\.create/.test(inv.code)
  );
  check(
    "3 — it names the LINE on the ITB",
    !!inv && /work_request_line_id/.test(inv.code)
  );
  /* ⚠ ONE ITB PER PROVIDER — `E395`'s @@unique. The fan-out is the document. */
  check(
    "3 — the inviter comes from the SESSION, never from input",
    !!inv && /invited_by_person_id: personId/.test(inv.code)
  );
  check(
    "3 — the closing date is enforced by E395's own function",
    !!inv && /assertIssuable\(/.test(inv.code)
  );
  const ui = fileAt("src/components/work/InviteToPropose.tsx");
  check("3 — the invite screen exists", !!ui);
  check(
    "3 — ABSENCE: the invite screen is no longer a ComingSoon stub",
    !fileAt("src/app/(app)/work-requests/[id]/invite/page.tsx")?.code.includes("ComingSoon")
  );
}

/* ═══ 4 · EVERY NEW ROUTE IS REGISTERED — THE DEFAULT IS DENY ══════════════ */

const gated = new Map(ROUTE_ACCESS.map((e) => [e.prefix, e.requires]));
check("4 — /hire is gated canHireTalent", gated.get("/hire") === "canHireTalent");
check(
  "4 — /work-requests is gated canHireTalent",
  gated.get("/work-requests") === "canHireTalent"
);
/* ⚠⚠ AND THE MATCHER AGREES. `route-access.ts` and `proxy.ts` fail in BOTH
   directions in `public-allowlist.spec.ts`; this catches the pairing earlier and
   without a browser. */
{
  const proxy = fileAt("src/proxy.ts");
  for (const prefix of ["/hire", "/work-requests"]) {
    check(
      `4 — proxy.ts runs the edge on ${prefix}`,
      !!proxy && proxy.text.includes(`"${prefix}/:path*"`)
    );
  }
}
/* ⚠ AND EVERY NEW PAGE STILL SELF-GUARDS. Three layers, not one: the edge, the
   map, and the page. `/create-work` is gated only by the third — reported, not
   changed here. */
for (const p of [
  "src/app/(app)/hire/page.tsx",
  "src/app/(app)/work-requests/[id]/page.tsx",
  "src/app/(app)/work-requests/[id]/invite/page.tsx",
]) {
  const f = fileAt(p);
  check(`4 — ${p.split("/").slice(-2).join("/")} calls guardPage`, !!f && /guardPage\(/.test(f.code));
}

/* ═══ 5 · OWNER SCOPING — RESOLVED FROM THE SESSION, NEVER FROM INPUT ══════ */

for (const p of [
  "src/lib/work-request-lines.ts",
  "src/lib/work-request-invite.ts",
  "src/lib/hire.ts",
]) {
  const f = fileAt(p);
  check(`5 — ${p.split("/").pop()} resolves the owner from the session`, !!f && /resolveBuyer\(/.test(f.code));
}
{
  const lines = fileAt("src/lib/work-request-lines.ts");
  /* ⚠⚠ A LINE ID FROM THE CLIENT IS ALWAYS SCOPED TO THE OWNED REQUEST. Every
     write is `{ id: lineId, work_request_id: wr.id }` — a line id from another
     tenant touches ZERO rows instead of theirs. */
  const writes = lines?.code.match(/workRequestLine\.(updateMany|deleteMany)\(\{[\s\S]{0,120}?where: \{([\s\S]{0,120}?)\}/g) ?? [];
  check("5 — the line writes were found", writes.length >= 3, `found ${writes.length}`);
  check(
    "5 — every line write is scoped to the owned request",
    writes.every((w) => /work_request_id/.test(w)),
    writes.filter((w) => !/work_request_id/.test(w)).join(" | ")
  );
  check(
    "5 — ABSENCE: no line write is scoped by id alone",
    !/workRequestLine\.update\(\{\s*where: \{ id:/.test(lines?.code ?? "")
  );
}

/* ═══ REPORT ══════════════════════════════════════════════════════════════ */

if (failures.length) {
  console.error(`\ncheck:hire — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:hire — ${pass}/${pass} passed`);
