/**
 * `check:tin` — the tax id is regulated data, and this is the fence
 * (`P1-ALL-E404` WS-2). `npm run check:tin`.
 *
 * ── ⚠⚠ THE ASSERTION THIS FILE EXISTS FOR ──────────────────────────────────
 *
 * **A TIN MUST NEVER REACH A THIRD-PARTY MODEL.** That is not hypothetical here:
 * this product already ships whole documents to Anthropic through
 * `callExtractionModel`, and `Company.tin` is selected in `work-feed.ts` and
 * `work-request-identity.ts` and travels inside company objects. One careless
 * spread — `{ ...company }` into a prompt — is all it takes, and nothing about
 * the resulting request would look wrong.
 *
 * ⚠ THE AI FILES ARE DISCOVERED, NOT LISTED. A hand-written list of "the files
 * that talk to a model" is out of date the first time somebody adds one, and the
 * file they add is exactly the one that would leak. §3 finds them by following
 * the SDK import and the shared call site.
 *
 * ⚠ AND A FORMAT PASS IS NOT A VERIFIED TIN — §2 asserts nothing in the repo can
 * produce `match`, because Panameer is not enrolled and cannot.
 *
 * ⚠ NO DATABASE AND NO BROWSER.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { checkTin, maskTin, tinFormatMessage, IRS_EIN_PREFIXES } from "@/lib/tin";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

type F = { path: string; text: string; code: string };
function walk(dir: string, out: F[] = []): F[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(e)) {
      const text = readFileSync(full, "utf8");
      out.push({ path: relative(".", full), text, code: strip(text) });
    }
  }
  return out;
}
const SELF = join("scripts", "check-tin.ts");
const SRC = walk("src").concat(walk("scripts")).filter((f) => f.path !== SELF);

/* ═══ 1 · THE VALIDATOR DOES WHAT IT SAYS ═════════════════════════════════ */
{
  check("1 — 83 IRS EIN prefixes are held", IRS_EIN_PREFIXES.size === 83, `${IRS_EIN_PREFIXES.size}`);
  /* A real, well-known EIN prefix from the Brookhaven row. */
  check("1 — a well-formed EIN passes", checkTin("13-1234567", "EIN").format === "VALID");
  check("1 — dashes and spaces are accepted", checkTin("13 1234567", "EIN").formatOk);
  check("1 — eight digits is MALFORMED", checkTin("13-123456", "EIN").format === "MALFORMED");
  check("1 — letters are MALFORMED", checkTin("13-12345AB", "EIN").format === "MALFORMED");
  /* ⚠ THE CASE THE BRIEF NAMES: well-formed and impossible. */
  check("1 — 00-0000000 is IMPOSSIBLE, not valid", checkTin("00-0000000", "EIN").format === "IMPOSSIBLE");
  check("1 — a 00 prefix is IMPOSSIBLE", checkTin("00-1234567", "EIN").format === "IMPOSSIBLE");
  /*
    ⚠⚠ THESE TWO EXERCISE THE REPEATED-DIGIT RULE, AND MY FIRST TEST DID NOT.
    Mutation-testing found it: deleting the repeated-digit check still passed,
    because `00-0000000` is ALSO caught by the `00` prefix rule — so the only
    assertion I had for that rule was being satisfied by a different rule.
    `11-1111111` has a REAL IRS prefix (11, Brookhaven), so nothing but the
    repeated-digit rule can reject it.
    ⚠ THE TRADE-OFF IS DELIBERATE: an all-same-digit number is structurally
    issuable and overwhelmingly a placeholder somebody typed to get past a form.
    It is rejected. If a real one ever turns up, this is the line to revisit.
  */
  check("1 — 11-1111111 is IMPOSSIBLE despite a valid prefix",
    checkTin("11-1111111", "EIN").format === "IMPOSSIBLE");
  check("1 — 111-11-1111 is IMPOSSIBLE as an SSN too",
    checkTin("111-11-1111", "SSN").format === "IMPOSSIBLE");
  /* ⚠ 07 is not on the IRS list. NOT a hard failure — the list goes stale. */
  check("1 — an unlisted prefix is UNKNOWN_PREFIX, not IMPOSSIBLE",
    checkTin("07-1234567", "EIN").format === "UNKNOWN_PREFIX");
  check("1 — UNKNOWN_PREFIX does not claim formatOk", !checkTin("07-1234567", "EIN").formatOk);

  /* ⚠⚠ EIN AND SSN ARE DIFFERENT RULES, AND A SOLE PROPRIETOR MAY GIVE EITHER. */
  check("1 — a valid SSN passes as an SSN", checkTin("123-45-6789", "SSN").format === "VALID");
  check("1 — SSN area 000 is IMPOSSIBLE", checkTin("000-45-6789", "SSN").format === "IMPOSSIBLE");
  check("1 — SSN area 666 is IMPOSSIBLE", checkTin("666-45-6789", "SSN").format === "IMPOSSIBLE");
  check("1 — SSN area 9xx is IMPOSSIBLE", checkTin("900-45-6789", "SSN").format === "IMPOSSIBLE");
  check("1 — SSN group 00 is IMPOSSIBLE", checkTin("123-00-6789", "SSN").format === "IMPOSSIBLE");
  check("1 — SSN serial 0000 is IMPOSSIBLE", checkTin("123-45-0000", "SSN").format === "IMPOSSIBLE");
  /* ⚠ THE ASYMMETRY IS THE POINT: 123-45-6789 is a fine SSN and its EIN prefix
     (12) is also real, so the kind must be asked, never guessed. */
  check("1 — the same digits judged as an EIN are judged by EIN rules",
    checkTin("123456789", "EIN").format === "VALID" && checkTin("123456789", "SSN").format === "VALID");
  check("1 — an SSN-impossible number is fine as an EIN",
    checkTin("666-45-6789", "EIN").format === "VALID");
}

/* ═══ 2 · A FORMAT PASS IS NOT A VERIFIED TIN ═════════════════════════════ */
{
  const c = checkTin("13-1234567", "EIN");
  check("2 — ⚠ a passing format still reports the IRS half as unchecked", c.irs.status === "unchecked");
  check("2 — the message never says verified", !/verif/i.test(tinFormatMessage(c)));
  check("2 — the message carries no digits", !/\d/.test(tinFormatMessage(c)));
  /* ⚠⚠ NOTHING IN THE REPO MAY CLAIM A MATCH. Panameer is not enrolled in IRS
     TIN Matching and cannot be until it has filed 1099s. A `match` appearing
     anywhere means somebody wired a matcher — which is a decision, not a patch. */
  const claims = SRC.filter((f) => /irs\s*:\s*\{\s*status\s*:\s*["']match["']|status:\s*["']match["']/.test(f.code));
  check("2 — ABSENCE: nothing produces an IRS `match`", claims.length === 0,
    claims.map((c2) => c2.path).join(", "));
}

/* ═══ 3 · ⚠⚠ THE TIN CANNOT REACH A MODEL ════════════════════════════════ */
{
  /* Discovered: anything importing the Anthropic SDK, or using the shared
     extraction call. ⚠ FOLLOW THE CALL, DO NOT LIST THE FILES. */
  const aiFiles = SRC.filter(
    (f) =>
      /@anthropic-ai\/sdk/.test(f.code) ||
      /callExtractionModel/.test(f.code) ||
      /messages\.create\(/.test(f.code)
  );
  check("3 — the guard can see the AI files", aiFiles.length >= 4, `${aiFiles.length} found`);
  /*
    ── ⚠⚠ THE RULE IS "NO TIN **VALUE** REACHES A MODEL", NOT "THE WORD IS BANNED" ─

    ⚠ MY FIRST VERSION BANNED THE WORD AND IT FIRED ON REAL CODE:
    `scripts/spike-entity-lookup.ts` names a field
    `texasTaxpayerNumber_NOT_EIN` and its prompt instructs the model
    *"NEVER return an EIN or any federal tax id"* — a GUARDRAIL, the exact
    opposite of a leak. Banning the word would have forced that prompt to stop
    saying the safe thing, which is how a scan gets weakened instead of fixed.

    ⚠ SO IT MATCHES A DATA SHAPE, NOT A NOUN: reading `.tin` off a record, or
    putting `tin:` into an object literal. A string in a prompt is prose; a
    property read is a value on its way somewhere.
    ⚠ `\btin\b` would also have hit "routine", "continue" and "Martin".
  */
  const TIN_VALUE = /\.\s*tin\b|\btin\s*:|\.\s*tax_?id\b|\btax_?id\s*:|\.\s*taxId\b|\btaxId\s*:/i;
  const leaks = aiFiles.filter((f) => TIN_VALUE.test(f.code));
  check(
    "3 — ⚠⚠ ABSENCE: no file that talks to a model reads a TIN VALUE",
    leaks.length === 0,
    leaks.map((l) => l.path).join(", ")
  );
  /* ⚠ AND THE PROMPT INPUT IS A DOCUMENT, NOT A RECORD. A company object spread
     into a prompt is how this would actually happen. */
  const spreads = aiFiles.filter((f) => /\.{3}\s*company\b|company\s*:\s*company\b/.test(f.code));
  check("3 — ABSENCE: no company record is spread into a model call", spreads.length === 0,
    spreads.map((s) => s.path).join(", "));
}

/* ═══ 4 · THE TIN CANNOT REACH A LOG OR AN ERROR STRING ══════════════════ */
{
  /* ⚠ THE SHAPE THAT LEAKS: a console call or a thrown message that interpolates
     something called tin/ein/ssn. `maskTin(...)` is explicitly allowed — that is
     the whole point of having it. */
  const LOGGISH = /(console\.(log|info|warn|error|debug)|throw new \w*Error)\([^)]{0,220}/g;
  const offenders: string[] = [];
  for (const f of SRC) {
    if (f.path.startsWith("src/lib/tin.ts")) continue;
    for (const m of f.code.matchAll(LOGGISH)) {
      const seg = m[0];
      if (/maskTin\s*\(/.test(seg)) continue;
      if (/\$\{[^}]*\b(tin|ein|ssn|taxId|tax_id)\b[^}]*\}/i.test(seg)) offenders.push(`${f.path}`);
    }
  }
  check("4 — ⚠⚠ ABSENCE: no log line or error message interpolates a TIN",
    offenders.length === 0, [...new Set(offenders)].join(", "));

  /* ⚠ MASKING IS THE ONLY EXPORT THAT MAY RENDER. */
  check("4 — maskTin keeps only the last four", maskTin("13-1234567") === "•••••4567");
  check("4 — maskTin refuses to leak a short value", maskTin("12") === "••••");
  check("4 — maskTin handles null", maskTin(null) === "••••");
  check("4 — the mask contains no separator that reveals length",
    !/\d/.test(maskTin("13-1234567").slice(0, -4)));
}

/* ═══ REPORT ══════════════════════════════════════════════════════════════ */
if (failures.length) {
  console.error(`\ncheck:tin — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:tin — ${pass}/${pass} passed`);
