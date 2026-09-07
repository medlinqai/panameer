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
 *      ProviderBid rows, STOP AND REPORT."*
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
  basis: "RATE",
  ...o,
});

/** The truth table: every combination of assigned × priced, for both bases. */
const TRUTH_TABLE: { name: string; lines: LineForCompleteness[] }[] = [
  { name: "no lines at all", lines: [] },
  { name: "RATE, assigned + priced", lines: [L({ provider_person_id: "p", unit_price_cents: 15000 })] },
  { name: "RATE, assigned, no price", lines: [L({ provider_person_id: "p" })] },
  { name: "RATE, priced, no provider", lines: [L({ unit_price_cents: 15000 })] },
  { name: "RATE, neither", lines: [L({})] },
  { name: "AMOUNT, assigned + priced", lines: [L({ basis: "AMOUNT", provider_person_id: "p", amount_cents: 24000 })] },
  { name: "AMOUNT, assigned, no price", lines: [L({ basis: "AMOUNT", provider_person_id: "p" })] },
  { name: "AMOUNT, priced, no provider", lines: [L({ basis: "AMOUNT", amount_cents: 24000 })] },
  {
    /* ⚠ THE CROSS-COLUMN TRAP: an AMOUNT line carrying a unit price is NOT
       priced, and a RATE line carrying an amount is NOT priced. Reading one
       column for both bases is how half the lines render as free. */
    name: "AMOUNT line carrying a unit price is NOT priced",
    lines: [L({ basis: "AMOUNT", provider_person_id: "p", unit_price_cents: 15000 })],
  },
  {
    name: "RATE line carrying an amount is NOT priced",
    lines: [L({ provider_person_id: "p", amount_cents: 24000 })],
  },
  {
    name: "two lines, one short",
    lines: [
      L({ line_number: 1, provider_person_id: "p", unit_price_cents: 15000 }),
      L({ line_number: 2, basis: "AMOUNT", provider_person_id: "p" }),
    ],
  },
  {
    name: "three lines, all ready",
    lines: [
      L({ line_number: 1, provider_person_id: "p", unit_price_cents: 15000 }),
      L({ line_number: 2, basis: "AMOUNT", provider_person_id: "q", amount_cents: 900 }),
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

/* ⚠ THE MUTATION: a `completenessFor` that ignored the basis — the single most
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
    "1 — MUTATION: a basis-blind completeness check DOES disagree with the spine",
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
    L({ line_number: 2, basis: "AMOUNT" }),
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
   shortlisting, tests or interviews… If you find yourself rendering ProviderBid
   rows, STOP AND REPORT."* */

/**
 * ⚠ AN ALLOWLIST, NOT A DIRECTORY BLOCKLIST — the same reasoning `check:sourcing`
 * uses for `InterviewNote`. Enumerating every hire surface means the gate is only
 * as good as that list; a page added next month is not on it. So the sourcing
 * RESPONSE models may be referenced from NOWHERE, and the day somebody needs one
 * they add the file deliberately and a reviewer sees exactly the `include` that
 * opens the bid screen.
 */
const RESPONSE_MODELS = /\bproviderBid\b|\bProviderBid\b|\bTestResponse\b|\bInterviewResponse\b|\bShortlistLine\b|\bproviderBidLine\b/;
const SOURCING_LIB = join("src", "lib", "sourcing.ts");
const SOURCING_STAGE = join("src", "lib", "sourcing-stage.ts");
{
  const hits = SRC.filter(
    (f) =>
      RESPONSE_MODELS.test(f.code) &&
      f.path !== SOURCING_LIB &&
      f.path !== SOURCING_STAGE
  );
  check(
    "3 — ABSENCE: no hire surface reads a bid, test, interview or shortlist response",
    hits.length === 0,
    hits.map((h) => h.path).join(", ")
  );
}
check(
  "3 — MUTATION: the scan would catch a bid list",
  RESPONSE_MODELS.test("const bids = await prisma.providerBid.findMany();")
);
check(
  "3 — MUTATION: the scan would catch a shortlist render",
  RESPONSE_MODELS.test("rows.map((r: ShortlistLine) => r.line_number)")
);
{
  const inv = fileAt("src/lib/work-request-invite.ts");
  check("3 — the invite lib exists (E395 landed, so WS-3 is in scope)", !!inv);
  check(
    "3 — it writes BidRequest",
    !!inv && /prisma\.bidRequest\.create/.test(inv.code)
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
  const ui = fileAt("src/components/work/InviteToBid.tsx");
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
