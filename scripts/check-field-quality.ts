/**
 * `check:field-quality` — formats have one home, and a typed skill finds the one
 * that already exists (`P1-J1.4-E299` / `P1-J1.4-E298` WS-3).
 *
 *   1  EVERY FORMAT VALIDATOR HAS ONE HOME. No ZIP `superRefine` left in the
 *      route, no second phone regex, no re-typed EIN pattern. Both halves of
 *      `E299` shipped as inline copies once already — the ZIP rule in the route
 *      AND its message again in the component — so this is the assertion that
 *      stops the third copy.
 *   2  THE SAME MESSAGE STRING IS USED CLIENT AND SERVER. One constant, imported
 *      twice, never typed twice.
 *   3  EIN ACCEPTS BLANK, accepts hyphenated and bare, rejects malformed, and is
 *      NEVER REQUIRED.
 *   4  THE CUSTOM-SKILL PATH CALLS THE MATCHER BEFORE CREATING.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SOURCE SCAN, reusing `check-community.ts`'s
 * `strip()`. Every file here documents the very patterns it must not contain.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  EIN_MESSAGE,
  US_ZIP_MESSAGE,
  ein,
  isUnitedStates,
  usPhone,
  usZip,
  FIELD_FORMATS,
} from "@/lib/field-formats";
import {
  NEAR_MAX_EDITS,
  NEAR_MAX_RATIO,
  NEAR_MIN_LENGTH,
  didYouMean,
  editDistance,
  isNear,
  matchSkill,
  normaliseSkill,
} from "@/lib/skill-match";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

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

const FORMATS = join("src", "lib", "field-formats.ts");
const PHONE = join("src", "lib", "phone.ts");
const MATCH = join("src", "lib", "skill-match.ts");
const ROUTE = join("src", "app", "api", "company", "define", "route.ts");
const STEP = join("src", "components", "company", "CompanyStep.tsx");
const ONBOARDING = join("src", "lib", "onboarding.ts");
const MATCH_ROUTE = join("src", "app", "api", "onboarding", "provider", "skill-match", "route.ts");
const WIZARD = join("src", "app", "join", "provider", "page.tsx");

for (const f of [FORMATS, PHONE, MATCH, ROUTE, STEP, ONBOARDING, MATCH_ROUTE, WIZARD]) {
  check(`the file this guard is about exists: ${f}`, existsSync(f));
}
const route = read(ROUTE);
const step = read(STEP);
const onboarding = read(ONBOARDING);
const wizard = read(WIZARD);

// ---------------------------------------------------------------------------
// GUARD 1 — one home per format
// ---------------------------------------------------------------------------

check(
  "1 — the ZIP regex is GONE from the company route",
  !/\{5\}/.test(route),
  "it was MOVED to lib/field-formats.ts, not copied"
);
check(
  "1 — the ZIP regex is GONE from CompanyStep",
  !/\{5\}/.test(step),
  "the component imports usZip() now"
);
check("1 — the route imports the shared validator", /from ["']@\/lib\/field-formats["']/.test(route));
check("1 — the component imports the shared validator", /from ["']@\/lib\/field-formats["']/.test(step));
check(
  "1 — the route still refuses a bad ZIP (the check was moved, not dropped)",
  /usZip\s*\(/.test(route)
);
check(
  "1 — the route validates the EIN too",
  /einFormat\s*\(|\bein\s*\(/.test(route),
  "it was forty characters of anything"
);

/*
  ⚠⚠ NO SECOND PHONE IMPLEMENTATION ANYWHERE. `lib/phone.ts` already owned this
  and `usPhone` is a four-line adapter over it — the assertion is that nothing
  outside that file counts phone digits itself.
*/
const formatsBody = read(FORMATS);
check(
  "1 — field-formats does NOT re-implement phone logic",
  !/\{3\}|\{7\}|\{10\}/.test(formatsBody.slice(formatsBody.indexOf("usPhone"))),
  "it must delegate to validatePhone in lib/phone.ts"
);
check("1 — field-formats imports lib/phone", /from ["']@\/lib\/phone["']/.test(formatsBody));
const phoneRegexOwners = walk("src")
  .filter((f) => f !== PHONE && f !== FORMATS)
  .filter((f) => /validatePhone\s*=|function\s+validatePhone/.test(strip(readFileSync(f, "utf8"))));
check(
  "1 — validatePhone is defined in exactly one file",
  phoneRegexOwners.length === 0,
  `also defined in ${phoneRegexOwners.join(", ")}`
);
check("1 — every format is reachable from the module's own index", Object.keys(FIELD_FORMATS).length === 3);

// ---------------------------------------------------------------------------
// GUARD 2 — one message, both sides
// ---------------------------------------------------------------------------

for (const [name, body] of [["the route", route], ["the component", step]] as const) {
  check(
    `2 — ${name} does not re-type the ZIP sentence`,
    !body.includes("5 digits, or ZIP+4"),
    "import US_ZIP_MESSAGE instead"
  );
}
check("2 — the component renders the shared ZIP constant", /US_ZIP_MESSAGE/.test(step));
check("2 — the component renders the shared EIN constant", /EIN_MESSAGE/.test(step));
check("2 — the ZIP message is non-empty and names the format", /ZIP/.test(US_ZIP_MESSAGE) && US_ZIP_MESSAGE.length > 20);
check("2 — the EIN message names the format", /9 digits/.test(EIN_MESSAGE));
check(
  "2 — neither message says 'invalid'",
  !/invalid/i.test(`${US_ZIP_MESSAGE} ${EIN_MESSAGE}`),
  "say what the shape is, not that the person got it wrong"
);

// ---------------------------------------------------------------------------
// GUARD 3 — EIN: blank ok, both forms ok, malformed refused, never required
// ---------------------------------------------------------------------------

const US = "United States";
check("3 — ⚠ a BLANK EIN is valid", ein("", US).ok && ein(null, US).ok && ein(undefined, US).ok);
check("3 — a blank EIN normalises to null, not an empty string", ein("", US).normalised === null);
check("3 — hyphenated is accepted", ein("12-3456789", US).ok);
check("3 — bare nine digits are accepted", ein("123456789", US).ok);
check("3 — both forms store the SAME normalised value", ein("123456789", US).normalised === "12-3456789" && ein("12-3456789", US).normalised === "12-3456789");
check("3 — eight digits are refused", !ein("12-345678", US).ok);
check("3 — ten digits are refused", !ein("12-34567890", US).ok);
check("3 — Scott's six digits are refused", !ein("123456", US).ok, "the walk that filed E299");
check("3 — Scott's alpha is refused", !ein("12-34567AB", US).ok);
check("3 — a hyphen in the wrong place is refused", !ein("123-456789", US).ok);
check("3 — nine digits with two hyphens are refused", !ein("12-345-6789", US).ok);
check("3 — the refusal carries the shared message", ein("123456", US).message === EIN_MESSAGE);
/* ⚠ US ONLY. A non-US company must not be told its tax id is malformed. */
check("3 — ⚠ a non-US company's tax id is NOT format-checked", ein("GB123456789", "United Kingdom").ok);
check("3 — an unknown country is NOT treated as US", ein("123456", null).ok);
check("3 — 'USA' counts as the United States", isUnitedStates("USA") && isUnitedStates("us") && isUnitedStates("United States"));
check("3 — Canada does not", !isUnitedStates("Canada"));

/* ZIP, same shape of rules. */
check("3 — a blank ZIP is valid", usZip("", US).ok);
check("3 — five digits are accepted", usZip("32084", US).ok);
check("3 — ZIP+4 is accepted", usZip("32084-1234", US).ok);
check("3 — Scott's nine bare digits are refused", !usZip("295265326", US).ok, "the value that filed E299");
check("3 — letters are refused", !usZip("3208A", US).ok);
check("3 — a Canadian postcode is NOT judged by the US rule", usZip("K1A 0B1", "Canada").ok);
check("3 — a UK postcode is NOT judged by the US rule", usZip("SW1A 1AA", "United Kingdom").ok);
check("3 — the ZIP refusal carries the shared message", usZip("295265326", US).message === US_ZIP_MESSAGE);

/* Phone: the adapter answers, and it answers with lib/phone's own reason. */
check("3 — a blank phone is valid", usPhone("", US).ok);
check("3 — the phone adapter refuses a short number", !usPhone("555", US).ok);
check("3 — and its message comes from lib/phone, not from here", Boolean(usPhone("555", US).message));

/*
  ⚠⚠ NOTHING HERE CAN MAKE A FIELD REQUIRED. Blank is valid in every validator,
  which is the structural version of "EIN is optional and stays optional".
*/
for (const [name, fn] of Object.entries(FIELD_FORMATS)) {
  check(`3 — ⚠ ${name} treats BLANK as valid, so it can never require a field`, fn("", US).ok && fn(null, US).ok);
}

// ---------------------------------------------------------------------------
// GUARD 4 — the custom-skill path matches before creating
// ---------------------------------------------------------------------------

const CATALOG = [
  { id: "s1", name: "Purchase Requisitions" },
  { id: "s2", name: "Accounts Receivable" },
  { id: "s3", name: "Tax" },
  { id: "s4", name: "Business Process" },
];

check("4 — an exact match links", matchSkill("Purchase Requisitions", CATALOG).kind === "exact");
check("4 — case is ignored", matchSkill("purchase requisitions", CATALOG).kind === "exact");
check("4 — punctuation is ignored", matchSkill("Purchase/Requisitions", CATALOG).kind === "exact");
check("4 — whitespace is ignored", matchSkill("  purchase   requisitions ", CATALOG).kind === "exact");
check(
  "4 — ⚠ a trailing plural is ignored: 'purchase requisition' IS 'Purchase Requisitions'",
  matchSkill("purchase requisition", CATALOG).kind === "exact"
);
check("4 — plurals inside the phrase too", matchSkill("account receivable", CATALOG).kind === "exact");
check("4 — 'ss' is not mistaken for a plural", normaliseSkill("Business Process") === "business process");

/* ⚠ SCOTT'S ACTUAL TYPO. This is the row he filed. */
const typo = matchSkill("purchase requisitons", CATALOG);
check("4 — ⚠ Scott's 'purchase requisitons' is a NEAR match, so it ASKS", typo.kind === "near");
check(
  "4 — and it points at the right row",
  typo.kind === "near" && typo.skill.name === "Purchase Requisitions"
);
check(
  "4 — ⚠ a NEAR match keeps what was typed, so nothing is put in anyone's mouth",
  typo.kind === "near" && typo.typed === "purchase requisitons"
);
check("4 — the prompt names the candidate", didYouMean("Purchase Requisitions") === "Did you mean Purchase Requisitions?");

/* ⚠ THE THRESHOLD, ASSERTED so it cannot drift silently. */
check("4 — the near threshold is 2 edits", NEAR_MAX_EDITS === 2);
check("4 — bounded by 25% of the longer string", NEAR_MAX_RATIO === 0.25);
check("4 — and nothing under 4 characters is ever near", NEAR_MIN_LENGTH === 4);
check("4 — 'Tax' and 'Fax' are NOT near — a short word is a different word", matchSkill("Fax", CATALOG).kind === "none");
check("4 — a genuinely new skill is still allowed", matchSkill("Warehouse Robotics Tuning", CATALOG).kind === "none");
check("4 — an empty string matches nothing", matchSkill("   ", CATALOG).kind === "none");
check("4 — the distance function is sane", editDistance("kitten", "sitting") === 3 && editDistance("a", "a") === 0);
check("4 — an exact pair is not also reported as near", !isNear("purchase requisition", "purchase requisition"));
check(
  "4 — exact beats near even when both exist",
  matchSkill("Purchase Requisitions", [{ id: "x", name: "Purchase Requisiton" }, ...CATALOG]).kind === "exact"
);

/* And the write paths actually call it. */
check(
  "4 — ⚠ the SERVER write path matches before creating",
  /matchSkill\s*\(/.test(onboarding),
  "lib/onboarding.ts must consult the catalog before upserting a custom skill"
);
const upsertAt = onboarding.indexOf("catalog_id_role_type_id_pillar_id_name");
const matchAt = onboarding.indexOf("matchSkill(");
check(
  "4 — and it matches BEFORE the upsert, not after",
  matchAt >= 0 && upsertAt >= 0 && matchAt < upsertAt
);
check("4 — the wizard asks the shared matcher through its route", /skill-match\?q=/.test(wizard));
/*
  ⚠⚠ TWO MATCHERS EXIST AND BOTH ARE CORRECT — see `lib/skill-match.ts`'s header.
  `matchSkills` (PLURAL, `lib/resume/match.ts`) is BATCH and UNATTENDED and
  refuses to guess by design; `matchSkill` (SINGULAR, here) is INTERACTIVE and may
  ask. ⚠ THE FIRST DRAFT OF THIS ASSERTION USED A PREFIX REGEX AND COUNTED
  `matchSkills` AS A DUPLICATE — a miscount, fixed by matching the name exactly
  rather than by dropping the rule.
*/
check(
  "4 — the interactive matcher is defined in exactly ONE file",
  walk("src").filter((f) => /export function matchSkill\s*\(/.test(strip(readFileSync(f, "utf8")))).length === 1
);
/*
  ⚠⚠ AND THE BATCH MATCHER MUST NOT GROW A NEAR TIER. Its docblock is explicit
  that a false match is worse than an honest "unmatched", because nobody is
  watching when it runs. This is the assertion that stops someone "unifying" the
  two and quietly putting edit-distance guesses into the résumé import.
*/
const resumeMatch = read(join("src", "lib", "resume", "match.ts"));
check(
  "4 — ⚠ the BATCH résumé matcher still refuses to guess",
  resumeMatch.length > 0 && !/editDistance|levenshtein|isNear/i.test(resumeMatch),
  "an edit-distance tier there would inject guesses into an unattended import"
);
check(
  "4 — ⚠ the wizard NEVER auto-applies a near match",
  /setSkillMatch\s*\(\s*\{/.test(wizard) && /keepTypedSkill/.test(wizard),
  "both answers must be reachable — keeping what you typed is a real outcome"
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:field-quality — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:field-quality — ${pass}/${pass} passed`);
