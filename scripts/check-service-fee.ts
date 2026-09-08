/**
 * `check:service-fee` — the service fee is ONE number, and the ways it can
 * quietly become several (`P1-J1.4-E390`). `npm run check:service-fee`.
 *
 * ── ⚠⚠ THE ASSERTION THIS FILE EXISTS FOR ───────────────────────────────────
 *
 * **A Prisma `@default` is not readable from TypeScript.** So the fee is written
 * twice — once in `schema.prisma`, once as `DEFAULT_SERVICE_FEE_BPS` — and no
 * import can cross that boundary. **The only thing that can stop the two
 * drifting is a test that reads the schema as TEXT and compares them**, which is
 * what this does. The drift it prevents is a provider being quoted one fee on
 * screen and charged another.
 *
 * ⚠ AND THE THIRD COPY IS THE ONE THAT COMES BACK. Two literals in
 * `join/provider/page.tsx` were removed by `E388`; this asserts they stay gone.
 *
 * ── ⚠⚠ AND THE PROHIBITION FROM WS-3, AS A TEST RATHER THAN A COMMENT ───────
 *
 * **91 provider rows hold 1000 (10%) and every new one gets 1490 (14.9%). The
 * mix is DELIBERATE.** It reads as data corruption to whoever finds it next, and
 * the obvious "fix" is an `UPDATE`. **That would raise 91 live providers' fees
 * without telling them.** So a write to that column fails the build — a comment
 * cannot.
 *
 * ⚠ NO DATABASE AND NO BROWSER.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { bpsToPercentLabel, DEFAULT_SERVICE_FEE_BPS, rateBreakdown } from "@/lib/display";

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
/**
 * ⚠⚠ THIS FILE IS EXCLUDED FROM ITS OWN TREE SCANS, AND THAT IS NOT A LOOPHOLE.
 *
 * Every absence scan below is MUTATION-TESTED by being fed the forbidden code,
 * which means this file necessarily CONTAINS `data: { service_fee_bps: 1490 }`,
 * `serviceFeeBps: 1000` and a competitor comparison — as string literals in the
 * mutation cases. Comment-stripping is not enough because they are code, not
 * prose. **A scan that has never been seen to fire is a scan whose regex might
 * match nothing at all** (`E041`), so proving they fire is worth one exclusion.
 *
 * ⚠ EXACTLY ONE FILE, NAMED, AND ASSERTED TO EXIST. Excluding a glob like
 * `scripts/check-*` would silently exempt every future harness — including one
 * that legitimately wanted to add a backfill.
 */
const SELF = join("scripts", "check-service-fee.ts");
const ALL_FILES = [...walk("src"), ...walk("scripts"), ...walk("prisma")];
const SRC = ALL_FILES.filter((f) => f.path !== SELF);
const fileAt = (p: string) => SRC.find((f) => f.path === join(...p.split("/")));

check("0 — the self-exclusion names a real file", ALL_FILES.some((f) => f.path === SELF));
check("0 — and it excludes exactly one file", ALL_FILES.length - SRC.length === 1);

const SCHEMA_RAW = readFileSync(join("prisma", "schema.prisma"), "utf8");
/** ⚠ Comments stripped: this schema QUOTES the value in prose, twice. */
const SCHEMA = SCHEMA_RAW.replace(/^\s*\/\/\/.*$/gm, "").replace(/^\s*\/\/.*$/gm, "");

/* ═══ 1 · ⚠⚠ THE SCHEMA DEFAULT AND THE CONSTANT AGREE ════════════════════ */

const declared = SCHEMA.match(/service_fee_bps\s+Int\s+@default\((\d+)\)/);
check("1 — the schema declares a service_fee_bps default", !!declared, "not found in schema.prisma");
check(
  "1 — ⚠⚠ the schema @default and DEFAULT_SERVICE_FEE_BPS are the SAME NUMBER",
  !!declared && Number(declared[1]) === DEFAULT_SERVICE_FEE_BPS,
  `schema says ${declared?.[1]}, lib/display.ts says ${DEFAULT_SERVICE_FEE_BPS}`
);
/* ⚠ AND THE VALUE IS THE ONE SCOTT DECIDED. Without this, the two could agree at
   any number at all — including back at 1000 — and still pass. */
check(
  "1 — the fee is 1490 bps (14.9%), the rate decided 2026-09-07",
  DEFAULT_SERVICE_FEE_BPS === 1490,
  `it is ${DEFAULT_SERVICE_FEE_BPS}`
);
check("1 — exactly one @default on that column", (SCHEMA.match(/service_fee_bps\s+Int\s+@default/g) ?? []).length === 1);
check(
  "1 — exactly one declaration of the constant",
  (fileAt("src/lib/display.ts")?.code.match(/export const DEFAULT_SERVICE_FEE_BPS/g) ?? []).length === 1
);

/**
 * ⚠⚠ NO THIRD COPY. `E388` removed two bare literals from
 * `join/provider/page.tsx`; this is what stops them coming back — and it looks
 * for the SHAPE, not the number, so it still fires after the next price change.
 */
{
  const feeLiteral = /serviceFeeBps\s*[:?]{1,2}=?\s*\d{3,}|serviceFeeBps\s*\?\?\s*\d{3,}/;
  const offenders = SRC.filter(
    (f) => f.path !== join("src", "lib", "display.ts") && feeLiteral.test(f.code)
  );
  check(
    "1 — ABSENCE: no bare fee literal anywhere outside the constant",
    offenders.length === 0,
    offenders.map((o) => o.path).join(", ")
  );
  /* ⚠ MUTATION: the scan catches the exact shape `E388` removed. */
  check(
    "1 — MUTATION: the scan catches `serviceFeeBps: 1000`",
    feeLiteral.test("const x = { serviceFeeBps: 1000 };")
  );
  check(
    "1 — MUTATION: the scan catches `p.serviceFeeBps ?? 1000`",
    feeLiteral.test("const x = p.serviceFeeBps ?? 1000;")
  );
  /* ⚠ AND THE TWO CALL SITES GO THROUGH THE CONSTANT. */
  const page = fileAt("src/app/join/provider/page.tsx");
  check("1 — the onboarding page imports the constant", !!page && /DEFAULT_SERVICE_FEE_BPS/.test(page.code));
  check(
    "1 — and uses it in both places it needs a default",
    (page?.code.match(/DEFAULT_SERVICE_FEE_BPS/g) ?? []).length >= 3,
    `${(page?.code.match(/DEFAULT_SERVICE_FEE_BPS/g) ?? []).length} references (1 import + 2 uses)`
  );
}

/* ═══ 2 · THE LABEL RENDERS 1490 AS "14.9%" ═══════════════════════════════
   ⚠ Not "15%", not "14%", and not "14.90%" — which is what it DID before
   `E390`, measured rather than assumed. The two-decimal fallback was
   unreachable while the fee was an integer percentage. */

check('2 — ⚠⚠ bpsToPercentLabel(1490) is "14.9%"', bpsToPercentLabel(1490) === "14.9%", `it is "${bpsToPercentLabel(1490)}"`);
check('2 — the OLD value still reads "10%"', bpsToPercentLabel(1000) === "10%");
check('2 — an integer percentage keeps no decimal point', bpsToPercentLabel(1500) === "15%");
/* ⚠⚠ TRAILING ZEROS GO, SIGNIFICANT DIGITS STAY. "Strip the zeros" written
   carelessly also strips the 5 from 10.05. */
check('2 — 1250 → "12.5%"', bpsToPercentLabel(1250) === "12.5%");
check('2 — 1050 → "10.5%"', bpsToPercentLabel(1050) === "10.5%");
check('2 — 1005 → "10.05%" (the significant zero survives)', bpsToPercentLabel(1005) === "10.05%");
check('2 — 10 → "0.1%"', bpsToPercentLabel(10) === "0.1%");
check('2 — 1 → "0.01%"', bpsToPercentLabel(1) === "0.01%");
check('2 — 0 → "0%"', bpsToPercentLabel(0) === "0%");
/* ⚠ ABSENCE: no trailing zero can survive the formatter. */
check(
  "2 — ABSENCE: no output ends in a trailing zero after a decimal point",
  [1490, 1250, 1050, 10, 1200, 1100].every((b) => !/\.\d*0%$/.test(bpsToPercentLabel(b)))
);

/* ⚠ THE DISCLOSURE IS A LABEL, SO IT FOLLOWS THE CONSTANT — verified, not
   assumed. If somebody ever types the percentage into that string, this fires. */
{
  const page = fileAt("src/app/join/provider/page.tsx");
  check(
    "2 — the provider's fee disclosure is computed, not typed",
    !!page && /label=\{`Service fee \(\$\{bpsToPercentLabel\(profile\.serviceFeeBps\)\}\)`\}/.test(page.code)
  );
  check(
    "2 — ABSENCE: no fee percentage is hardcoded into the disclosure",
    !!page && !/Service fee \(1[0-9]/.test(page.code)
  );
}

/* ═══ 3 · THE ARITHMETIC IS UNTOUCHED ═════════════════════════════════════
   ⚠ The brief: *"CORRECT ALREADY, DO NOT TOUCH THE ARITHMETIC."* Asserting it is
   what makes that instruction outlive the brief. */

check(
  "3 — fee = round(gross × bps / 10,000)",
  rateBreakdown(15000, 1490).fee === Math.round((15000 * 1490) / 10_000)
);
check("3 — youGet is the remainder, so the three reconcile exactly", (() => {
  for (const cents of [15000, 33333, 500, 1, 999999]) {
    const b = rateBreakdown(cents, DEFAULT_SERVICE_FEE_BPS);
    if ((b.fee ?? 0) + (b.youGet ?? 0) !== cents) return false;
  }
  return true;
})());
check(
  "3 — at 14.9%, $150.00 becomes a $22.35 fee and $127.65 to the provider",
  rateBreakdown(15000, 1490).fee === 2235 && rateBreakdown(15000, 1490).youGet === 12765
);
check("3 — a null rate stays null, and does not become a zero fee", rateBreakdown(null, 1490).fee === null);
/* ⚠ INTEGER CENTS END TO END — never a float. */
check(
  "3 — every figure is an integer number of cents",
  [15000, 33333, 7].every((c) => Number.isInteger(rateBreakdown(c, 1490).fee ?? 0))
);

/* ═══ 4 · ⚠⚠ NO BACKFILL. THE GRANDFATHERING IS THE DECISION ══════════════
   **91 rows hold 1000 and every new one gets 1490. The mix is deliberate**, it
   reads as corruption to whoever finds it next, and the obvious "fix" is an
   UPDATE that raises 91 live providers' fees without telling them. */

function writesTheFee(code: string): string | null {
  /* A Prisma write naming the column — `data: { service_fee_bps: ... }`. */
  if (/data:\s*\{[^}]*service_fee_bps/.test(code)) return "prisma data: { service_fee_bps }";
  if (/providerProfile\.(update|updateMany|upsert)\(([\s\S]{0,300}?)service_fee_bps/.test(code))
    return "providerProfile.update over service_fee_bps";
  /* Raw SQL. */
  if (/UPDATE\s+provider_profiles[\s\S]{0,200}?service_fee_bps/i.test(code)) return "raw UPDATE";
  if (/SET\s+service_fee_bps/i.test(code)) return "raw SET";
  return null;
}
/* ⚠⚠ MUTATION-TEST THE SCAN. A structural scan nobody has seen fire is a scan
   whose regex might match nothing at all (`E041`). */
check(
  "4 — MUTATION: the scan catches a prisma backfill",
  writesTheFee('await prisma.providerProfile.updateMany({ data: { service_fee_bps: 1490 } });') !== null
);
check(
  "4 — MUTATION: the scan catches raw SQL",
  writesTheFee('await prisma.$executeRawUnsafe("UPDATE provider_profiles SET service_fee_bps = 1490");') !== null
);
check(
  "4 — MUTATION: the scan catches a bare SET",
  writesTheFee("SET service_fee_bps = 1490") !== null
);
check(
  "4 — the scan does NOT fire on a READ",
  writesTheFee("serviceFeeBps: profile.service_fee_bps,") === null
);
{
  const writers = SRC.map((f) => ({ f, why: writesTheFee(f.code) })).filter((w) => w.why);
  check(
    "4 — ⚠⚠ ABSENCE: nothing in the tree writes service_fee_bps",
    writers.length === 0,
    writers.map((w) => `${w.f.path} (${w.why})`).join("; ")
  );
}
/* ⚠ AND NO MIGRATION DIRECTORY. The schema ships via `db push`; a migration is
   the other way a backfill arrives. */
check(
  "4 — ABSENCE: no prisma migration has appeared",
  !SRC.some((f) => f.path.includes(join("prisma", "migrations")))
);
/* ⚠ THE REASON IS RECORDED ON THE COLUMN, so the next reader does not "tidy" it. */
check(
  "4 — the column says the mix is deliberate",
  /A MIX OF 1000s AND 1490s IN THIS COLUMN IS DELIBERATE/.test(SCHEMA_RAW)
);
check(
  "4 — and names the date the split happened",
  /2026-09-07/.test(SCHEMA_RAW.slice(SCHEMA_RAW.indexOf("service_fee_bps") - 2000, SCHEMA_RAW.indexOf("service_fee_bps") + 200))
);

/* ═══ 5 · THE SPINE SNAPSHOTS THE FEE; IT DOES NOT READ THE DEFAULT ═══════
   ⚠⚠ `WorkOrder.fee_bps` (`E388`) is a SNAPSHOT — what was agreed, frozen — so an
   in-flight engagement finishes at the rate it was agreed at even after the
   platform rate moves. That is precisely what makes a future migration of the 91
   possible at all. */

{
  const wo = SCHEMA.match(/^model WorkOrder \{([\s\S]*?)^\}/m)?.[1] ?? "";
  check("5 — WorkOrder was found", wo.length > 0);
  check("5 — WorkOrder carries fee_bps", /fee_bps\s+Int/.test(wo));
  /* ⚠⚠ AND IT HAS NO `@default`. A default there would silently stamp today's
     platform rate onto an order nobody priced at it. */
  check(
    "5 — ⚠⚠ ABSENCE: WorkOrder.fee_bps has NO @default (it is a snapshot)",
    !/fee_bps\s+Int\s+@default/.test(wo)
  );
  /* ⚠ NOTHING IN THE SPINE IMPORTS THE PLATFORM DEFAULT. E388/E392/E393/E394 all
     read the snapshot or take the bps as a parameter. */
  const spine = [
    "src/lib/transaction-spine.ts",
    "src/lib/orders.ts",
    "src/lib/settlements.ts",
    "src/lib/work-request-lines.ts",
    "src/lib/hire.ts",
  ];
  const leaks = spine.map(fileAt).filter((f) => f && /DEFAULT_SERVICE_FEE_BPS/.test(f.code));
  check(
    "5 — ABSENCE: no spine module reads the platform default",
    leaks.length === 0,
    leaks.map((l) => l!.path).join(", ")
  );
  const orders = fileAt("src/lib/orders.ts");
  check("5 — the order detail reads the SNAPSHOT off the row", !!orders && /feeBps: o\.fee_bps/.test(orders.code));
}

/* ═══ 6 · PANAMEER CHARGES THE PROVIDER ONLY ══════════════════════════════
   ⚠⚠ *"I do not want to charge my customer — removes a big NO."* There is no
   buyer-side fee in the schema or the code, and none is being added. */

check("6 — ABSENCE: no buyer fee column in the schema", !/buyer_fee|buyer_service_fee/i.test(SCHEMA));
{
  const buyerFee = SRC.filter((f) => /buyerFee|buyer_fee_bps/.test(f.code));
  check(
    "6 — ABSENCE: no buyer fee anywhere in the code",
    buyerFee.length === 0,
    buyerFee.map((b) => b.path).join(", ")
  );
}
/* ⚠ AND NO COMPETITOR COMPARISON. *"Cheaper than Upwork" is NOT supportable* —
   Upwork's freelancer fee is 0–15% and most pay about 10%. The defensible line is
   "we never charge the buyer". Copy is Scott's; this only stops one arriving by
   accident alongside a fee change. */
{
  const claims = SRC.filter((f) =>
    /(cheaper|lower|less)\s+than\s+(upwork|fiverr|toptal)/i.test(f.text)
  );
  check(
    "6 — ABSENCE: no 'cheaper than a competitor' claim",
    claims.length === 0,
    claims.map((c) => c.path).join(", ")
  );
}

/* ═══ REPORT ══════════════════════════════════════════════════════════════ */

if (failures.length) {
  console.error(`\ncheck:service-fee — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:service-fee — ${pass}/${pass} passed`);
