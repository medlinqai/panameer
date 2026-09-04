/**
 * `check:trust-claims` — nothing claims a check Panameer has not run
 * (`P1-ALL-E035` WS-4).
 *
 * **THE POSITION, settled 2026-09-02:** Panameer verifies what it ASSERTS and
 * hosts what it does not. It asserts three things — email control (built), that
 * a company is a registered entity (⚠ `E282`, NOT BUILT), and that a person did
 * work for a client (built, and the strongest, because `ProjectValidation`'s
 * token only goes to an address at the client's own domain).
 *
 *   1  ⚠⚠ NO SHIPPED STRING CLAIMS A COMPANY IS VERIFIED, VETTED OR SCREENED
 *      WHILE `E282` IS UNBUILT. This is the assertion the whole file exists for.
 *   2  `terms.ts` IS GENERATED, NEVER HAND-EDITED — the header is asserted
 *      present, because editing the `.ts` is the one thing that guarantees a
 *      wording change is silently lost on the next `legal:build`.
 *   3  THE PUBLIC PAGE'S CLAIMS EACH HAVE A ToS COUNTERPART. ⚠ IMPLEMENTED AS A
 *      TOKEN CHECK, not a semantic one — see the note on assertion 3. A marketing
 *      page claiming more than the terms is the classic failure and it is worse
 *      than saying nothing.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SCAN, reusing `check-community.ts`'s
 * `strip()`. This file names every forbidden token, and so does the ToS section
 * it guards — a scanner that read prose would fail on its own documentation, and
 * the fix for that is always to weaken the scanner.
 *
 * ⚠⚠ WHEN `E282` LANDS, ASSERTION 1 GETS RELAXED DELIBERATELY, BY A BRIEF, ON
 * THE RECORD. Not by editing this file because it went red.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { TERMS_DOC } from "@/content/legal/terms";
import { PUBLIC_ROUTES } from "@/lib/public-routes";
import { FOOTER_LEGAL } from "@/components/marketing/brand";
import {
  ADAPTERS,
  SUPPORTED_STATES,
  US_STATES,
} from "@/lib/company-validation";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/* ⚠ VERBATIM FROM `scripts/check-community.ts`. */
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

const TRUST_PAGE = join("src", "app", "trust", "page.tsx");
const TERMS_TS = join("src", "content", "legal", "terms.ts");
const TOS_SRC = join("scripts", "data", "legal", "tos_panameer.md");
const VALIDATION = join("src", "lib", "company-validation.ts");
const STEP_PAGE = join("src", "components", "company", "CompanyStep.tsx");

for (const f of [TRUST_PAGE, TERMS_TS, TOS_SRC]) {
  check(`the file this guard is about exists: ${f}`, existsSync(f));
}

const tosText = TERMS_DOC.map((n) => ("text" in n ? n.text : "")).join("\n");

// ---------------------------------------------------------------------------
// GUARD 1 — ⚠⚠ nothing claims a check that has not run
// ---------------------------------------------------------------------------

/**
 * ⚠⚠ THE FORBIDDEN TOKENS, NAMED EXPLICITLY as the brief requires.
 *
 * These are claims about a COMPANY having been checked. ⚠ `verified` ALONE IS
 * NOT HERE and must not be: email verification IS built and "Email verified" is
 * a true statement the product should keep making. What is banned is pairing a
 * company with a checked-ness word.
 */
/*
  ⚠ `\\b` IS LOAD-BEARING. Without it `entity` matched inside `id-entity`, and
  the first run of this harness reported *"Identity validated by Panameer"* and
  *"Your identity is verified"* as company claims. Both are about a PERSON.
  Fixed by making the regex mean what it says, not by dropping the rule.
*/
const COMPANY_WORDS = "\\b(company|companies|business|entity|employer|organisation|organization)";
const CHECKED_WORDS = "(verified|vetted|screened|validated|confirmed|authenticated)";
const FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: "company + verified", re: new RegExp(`${COMPANY_WORDS}\\s+(is\\s+|are\\s+|been\\s+)?${CHECKED_WORDS}`, "i") },
  { name: "verified + company", re: new RegExp(`${CHECKED_WORDS}\\s+${COMPANY_WORDS}`, "i") },
  { name: "background check", re: /\bbackground[- ]check/i },
  { name: "credit check", re: /\bcredit[- ]check/i },
  { name: "criminal record check", re: /\bcriminal[- ]record/i },
  { name: "identity screening", re: /\bidentity[- ](screen|check)/i },
  { name: "secretary of state", re: /\bsecretary[- ]of[- ]state/i },
  { name: "good standing", re: /\bgood standing\b/i },
];

/*
  ⚠ THE ToS AND THE TRUST PAGE ARE EXEMPT FROM THE PAIR RULES, and only from
  those two, because their whole job is to DESCRIBE the check — including the
  negative. `Company not yet verified` and *"we have not run it"* must be
  sayable. What they are NOT exempt from is the outright-fabrication tokens
  below, which nothing may say anywhere.
*/
const DESCRIBING_FILES = new Set([
  TRUST_PAGE,
  join("src", "lib", "work-request-identity.ts"),
  join("src", "components", "work", "WhoIsAsking.tsx"),
]);
const NEVER_ANYWHERE = FORBIDDEN.filter((f) =>
  ["background check", "credit check", "criminal record check", "identity screening"].includes(f.name)
);

/*
  ── ⚠⚠ THE `E282` RELAXATION (`P1-J3-E365`), AND IT IS DELIBERATELY NARROW ────

  This file's own header named the exit and forbade the shortcut: *"WHEN `E282`
  LANDS, ASSERTION 1 GETS RELAXED DELIBERATELY, BY A BRIEF, ON THE RECORD. Not by
  editing this file because it went red."* `P1-J3-E365` is that brief.

  `E282` shipped entity validation against three real state registers, so the
  premise the outright ban rested on — *"E282 is unbuilt and none of these checks
  exist"* — is now FALSE for Texas, Colorado and New York. Colorado's register
  literally returns the string `Good Standing`, and `lib/company-validation.ts`
  exists to report it with the URL it came from.

  ⚠⚠ THESE FILES ARE **NOT** ADDED TO `DESCRIBING_FILES`, AND THAT MATTERS.
  That set SWAPS the whole `FORBIDDEN` list for the four never-anywhere phrases,
  which would let these two files also say *"vetted"*, *"screened"*, *"verified
  company"* and the rest. THAT IS WIDER THAN THE TRUTH WE HAVE EARNED.

  ⚠ SO THIS SUBTRACTS EXACTLY TWO RULES FROM EXACTLY TWO FILES. Every other
  phrase stays banned in these files, and both of these phrases stay banned in
  every other file in the repository.
*/
const ENTITY_LOOKUP_PHRASES = ["good standing", "secretary of state"];
const ENTITY_LOOKUP_FILES = new Set([
  join("src", "lib", "company-validation.ts"),
  join("src", "components", "company", "CompanyStep.tsx"),
]);

const sourceFiles = walk("src").filter((f) => !/content\/legal\/|\.test\.tsx?$/.test(f));
for (const f of sourceFiles) {
  const body = strip(readFileSync(f, "utf8"));
  const rules = DESCRIBING_FILES.has(f)
    ? NEVER_ANYWHERE
    : ENTITY_LOOKUP_FILES.has(f)
      /* ⚠ SUBTRACTED, NOT SWAPPED — see the block above. */
      ? FORBIDDEN.filter((r) => !ENTITY_LOOKUP_PHRASES.includes(r.name))
      : FORBIDDEN;
  for (const rule of rules) {
    check(
      `1 — ${f} does not claim "${rule.name}"`,
      !rule.re.test(body),
      `E282 is unbuilt and none of these checks exist`
    );
  }
}
/*
  ⚠⚠ THE ToS IS THE ONE PLACE THAT MUST NAME THESE, BECAUSE IT DENIES THEM.
  ⚠ The first draft of this harness banned the phrases outright and went red on
  the very sentence the brief REQUIRES — *"We do not run background checks,
  credit checks or criminal record checks."* A token scan cannot tell a claim
  from a denial, so the assertion is INVERTED here instead of dropped: the
  denials must be PRESENT. That is strictly stronger — deleting the disclaimer
  now fails the build.
*/
const TOS_DENIALS = [
  /do not run background checks/i,
  /credit checks/i,
  /criminal record checks/i,
  /do not test skills/i,
  /do not interview anyone/i,
  /do not assess competence/i,
  /do not offer insurance/i,
  /cannot guarantee that a provider will deliver/i,
];
for (const re of TOS_DENIALS) {
  check(
    `1 — the Terms of Use still DENIES: ${re.source.slice(0, 44)}`,
    re.test(tosText),
    "the disclaimer was removed"
  );
}
for (const word of ["insurance", "insured", "we guarantee", "money-back", "refund guarantee"]) {
  check(
    `1 — the trust page does not promise "${word}"`,
    !new RegExp(word.replace(/[- ]/g, "[- ]"), "i").test(read(TRUST_PAGE))
  );
}
/* ⚠ NO EMBLEM. A trust mark is a claim, and it has not been earned. */
for (const emblem of ["badge", "seal", "shield", "ShieldCheck", "BadgeCheck", "Trusted Marketplace", "Verified Marketplace"]) {
  check(
    `1 — the trust page carries no "${emblem}"`,
    !new RegExp(emblem, "i").test(read(TRUST_PAGE)),
    "words only — a trust emblem is a claim Panameer has not earned"
  );
}

/*
  ── ⚠⚠ WHAT THE RELAXATION IS PAID FOR WITH (`P1-J3-E365`) ───────────────────

  Two rules came out of two files. These four assertions go in, and they are
  strictly stronger than the ban they replace: the ban said "nobody may say it",
  which was true only while nothing could check. These say "it may be said ONLY
  where it was actually read, and ONLY with the URL it was read from".
*/

/* ── 1 · A GOOD-STANDING CLAIM CANNOT RENDER WITHOUT ITS SOURCE URL ────────── */

check(
  "1a — ⚠ every field the lookup returns is a SourcedField, so a claim carries its URL",
  /export type SourcedField = \{[\s\S]{0,200}sourceUrl: string/.test(readFileSync(VALIDATION, "utf8")),
  "E282 built SourcedField for exactly this — a value without a URL is unattributable"
);
check(
  "1a — ⚠ the status field is typed as a SourcedField, not a bare string",
  /status\?: SourcedField/.test(readFileSync(VALIDATION, "utf8")),
  "a status the caller cannot trace is the thing the ban existed to prevent"
);
/*
  ⚠ AND THE UI CANNOT PRINT THE STATUS WITHOUT THE LINK. Asserted on the source
  because the two live in the same block: the panel that renders
  `matches[0].status.value` also renders `legalName.sourceUrl`.
*/
const stepSrc = strip(readFileSync(STEP_PAGE, "utf8"));
check(
  "1a — ⚠⚠ the panel that shows the register's status also shows its source link",
  !/status\.value/.test(stepSrc) || /sourceUrl/.test(stepSrc),
  "a status on screen with no link back is an unsourced claim"
);

/* ── 2 · IT MAY ONLY APPEAR FOR A STATE WITH AN ADAPTER ───────────────────── */

/*
  ⚠⚠ THIS IS THE HALF OF THE ORIGINAL BAN THAT MUST SURVIVE. `ADAPTERS` has three
  keys; there are 51 jurisdictions. For the other 48 the phrase must remain
  IMPOSSIBLE, which is what the outright ban used to guarantee for all 51.
*/
check("2a — there are 51 US jurisdictions offered", US_STATES.length === 51);
check("2a — and only three have an adapter", SUPPORTED_STATES.length === 3, SUPPORTED_STATES.join(", "));
/*
  ⚠ ASSERTED STRUCTURALLY, NOT BY CALLING THE REGISTERS. `validateEntity` returns
  `unsupported_state` for any state with no adapter and NEVER REACHES A NETWORK —
  so the absence of the adapter IS the guarantee, and asserting it keeps this
  harness pure. Calling 48 live registers to prove a negative would also be 48
  ways for a merge gate to fail on somebody else's downtime.
*/
const unsupported = US_STATES.filter((st) => !SUPPORTED_STATES.includes(st));
check("2a — 48 jurisdictions have no adapter", unsupported.length === 48, `${unsupported.length}`);
for (const st of unsupported) {
  check(
    `2a — ⚠ ${st} has no adapter, so no status can be produced for it`,
    ADAPTERS[st] === undefined,
    "an unsupported state returns unsupported_state, never a claim"
  );
}
/* ⚠ AND THE LIB MUST STILL REFUSE RATHER THAN FALL THROUGH. */
check(
  "2a — ⚠ a state with no adapter is refused explicitly",
  /unsupported_state/.test(readFileSync(VALIDATION, "utf8")),
  "silently returning an empty result would read as 'checked and found nothing'"
);
/*
  ⚠⚠ AND NEW YORK, WHICH HAS AN ADAPTER AND STILL MAY NOT MAKE THE CLAIM.
  Its dataset is *Active Corporations* and publishes NO status column, so
  `publishesStatus: false`. Being in the active register is a different statement
  and `E282` was careful about it — this is the assertion that keeps it careful.
*/
check(
  "2a — ⚠⚠ New York has an adapter but publishes NO status",
  ADAPTERS["New York"] !== undefined && ADAPTERS["New York"].publishesStatus === false,
  "being in the Active Corporations register is not a good-standing claim"
);
check(
  "2a — and it has no goodStanding predicate to be asked",
  ADAPTERS["New York"]?.goodStanding === undefined
);
for (const st of ["Texas", "Colorado"]) {
  check(`2a — ${st} DOES publish a status, so the claim is earned there`, ADAPTERS[st]?.publishesStatus === true);
  check(`2a — and ${st} has a goodStanding predicate behind it`, typeof ADAPTERS[st]?.goodStanding === "function");
}
/*
  ⚠ THE UI GATES THE SENTENCE ON `publishesStatus`, not on "we got a row back".
  Without this, New York would silently inherit Colorado's wording.
*/
check(
  "2a — ⚠ the UI only claims a status when the register publishes one",
  /publishesStatus && lookup\.matches\[0\]\.status/.test(stepSrc),
  "and says so plainly otherwise"
);
/* ⚠ EITHER APOSTROPHE. The sentence lives in a JS string literal, so it is a
   plain `'` — `&rsquo;` is only needed in JSX text, and the first draft of this
   assertion looked for the entity and went red on correct copy. */
check(
  "2a — and it says so plainly when the register does not",
  /doesn(&rsquo;|')t publish a status/.test(stepSrc),
  "New York must say we did not check, not inherit Colorado's wording"
);

// ---------------------------------------------------------------------------
// GUARD 2 — terms.ts is generated
// ---------------------------------------------------------------------------

const termsRaw = existsSync(TERMS_TS) ? readFileSync(TERMS_TS, "utf8") : "";
check("2 — terms.ts declares itself GENERATED", /GENERATED by scripts\/build-legal\.ts/.test(termsRaw));
check("2 — terms.ts says not to edit it by hand", /Do not edit by hand/.test(termsRaw));
check(
  "2 — terms.ts still carries the DRAFT / PENDING LEGAL REVIEW status",
  /DRAFT CONTENT, PENDING LEGAL REVIEW/.test(termsRaw),
  "nothing in this work is a lawyer's and the document must not pretend otherwise"
);
check(
  "2 — the SOURCE markdown carries the draft banner too",
  /DRAFT, PENDING LEGAL REVIEW/.test(readFileSync(TOS_SRC, "utf8"))
);
/*
  ⚠⚠ THE GENERATED FILE MUST MATCH ITS SOURCE. This is the assertion that catches
  a hand-edit: if someone edits `terms.ts` directly, the section text will be in
  the `.ts` and NOT in the `.md`, and the next `legal:build` silently reverts it.
*/
const tosSrc = readFileSync(TOS_SRC, "utf8");
for (const heading of [
  "5. What we check, and what we don’t",
  "5.1 What we verify",
  "5.2 What we don’t verify",
  "5.3 When an engagement goes wrong",
  "5.4 What we do with what we learn",
  "5.5 This section describes today",
  "6. Definitions",
]) {
  check(`2 — "${heading}" is in the SOURCE markdown`, tosSrc.includes(heading));
  check(`2 — "${heading}" survived into the generated doc`, tosText.includes(heading));
}

// ---------------------------------------------------------------------------
// GUARD 3 — every public claim has a ToS counterpart
// ---------------------------------------------------------------------------

/*
  ⚠⚠ IMPLEMENTED AS A TOKEN CHECK, AND SAYING SO PLAINLY IS PART OF THE JOB.
  This does NOT prove the two say the same thing — no static check can. What it
  proves is that for every claim the public page makes, a distinctive phrase from
  that claim also appears in the Terms of Use. Delete the ToS clause and the page
  goes red; add a new claim to the page with no ToS basis and it also goes red,
  because the new claim has no anchor to add here honestly.
*/
const trust = read(TRUST_PAGE);
const CLAIM_ANCHORS: { claim: string; page: RegExp; tos: RegExp }[] = [
  { claim: "5.1 email control", page: /controls the email address/i, tos: /controls this email address/i },
  { claim: "5.1 registered entity", page: /registered entity on the public register/i, tos: /public register for\s*\n?\s*its jurisdiction/i },
  { claim: "5.1 client-domain confirmation", page: /client&rsquo;s own email domain/i, tos: /client’s own\s*\n?\s*internet domain/i },
  { claim: "5.1 profile says so", page: /the profile says so/i, tos: /profile says\s*\n?\s*so/i },
  { claim: "5.2 no competence or quality", page: /do not assess competence or quality/i, tos: /do not assess competence, quality of work/i },
  { claim: "5.2 no background checks", page: /do not run background\s*\n?\s*checks/i, tos: /do not run background checks/i },
  { claim: "5.2 nobody endorsed", page: /endorsed or approved by us/i, tos: /recommended, endorsed, approved or accredited by us/i },
  { claim: "5.3 cannot promise delivery", page: /can&rsquo;t promise delivery/i, tos: /cannot guarantee that a provider will deliver/i },
  { claim: "5.3 staged and recoverable", page: /priced in stages/i, tos: /priced in stages those payment/i },
  { claim: "5.4 responsibility scales", page: /responsibility scales with what we\s*\n?\s*know/i, tos: /responsibility scales with what we know/i },
  { claim: "5.4 knowing and staying quiet", page: /knowing and staying\s*\n?\s*quiet is not/i, tos: /Knowing about one and staying quiet is not/i },
];
for (const a of CLAIM_ANCHORS) {
  check(`3 — the page makes the claim "${a.claim}"`, a.page.test(trust), "the page changed without this check being updated");
  check(`3 — and the Terms of Use carries it`, a.tos.test(tosText), `"${a.claim}" is on the page with no ToS basis`);
}
check(
  "3 — the page points a reader at the detailed version",
  /href="\/terms"/.test(trust) && /section 5/i.test(trust)
);
check(
  "3 — and says which document wins if they disagree",
  /Terms of Use is the one that counts/i.test(trust)
);

/* The page has to be reachable, and the default is DENY. */
check(
  "3 — /trust is on the public allowlist",
  PUBLIC_ROUTES.some((r) => r.route === "/trust"),
  "the default is DENY — without this it 302s to /login"
);
check("3 — and the footer links to it", FOOTER_LEGAL.some((e) => e.href === "/trust"));

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ⚠⚠ E282 — THE VALIDATION IS PERSISTED, AND THE TRUST RULES HOLD AT REST.
//
// THE DEFECT THIS CLOSES: `validateEntity()` got a real answer from a state
// register, with a source URL, and NOTHING WROTE IT DOWN — so "Company not yet
// verified" could never flip, for anybody, ever.
//
// ⚠ THESE SEVEN GUARD THE THINGS THAT GO WRONG QUIETLY: a status with no
// citation, a "verified" that secretly means "passed", a client-supplied trust
// claim, and the read/write split that this brief is the most likely thing ever
// to break.
// ---------------------------------------------------------------------------

const e282Schema = readFileSync(join("prisma", "schema.prisma"), "utf8");
const e282Company = readFileSync(join("src", "lib", "company.ts"), "utf8");
const e282Identity = readFileSync(join("src", "lib", "work-request-identity.ts"), "utf8");
const e282Validation = readFileSync(join("src", "lib", "company-validation.ts"), "utf8");
const e282Route = readFileSync(
  join("src", "app", "api", "company", "validate", "route.ts"),
  "utf8"
);

/* ── 1 · ⚠⚠ A STORED STATUS NEVER EXISTS WITHOUT A SOURCE URL ─────────────
   The SourcedField rule enforced AT REST, not just at render. A status with no
   citation is exactly the unsourced trust claim this whole harness exists to
   stop — it just survives a page reload. */
for (const col of [
  "entity_validated_at",
  "entity_validation_status",
  "entity_validation_source_url",
  "entity_status_detail",
]) {
  check(`E282/1 — Company.${col} exists`, new RegExp(`\\b${col}\\s+`).test(e282Schema));
}
/* ⚠ THE WRITE IS ONE OBJECT, so a status can never be written without the URL
   beside it. Both fields are set in the same `data`, and the URL is required
   before that object is reached. */
const writeBlock =
  /entity_validated_at: new Date\(\)[\s\S]{0,400}?\}/.exec(e282Company)?.[0] ?? "";
check("E282/1 — the write block was found by the scan", writeBlock.length > 0);
check(
  "E282/1 — status and source URL are written in the SAME object",
  /entity_validation_status/.test(writeBlock) &&
    /entity_validation_source_url/.test(writeBlock),
  "a stored status with no citation is an unsourced trust claim that survives a reload"
);
/* ⚠ AND A MATCHED STATUS CANNOT BE WRITTEN WITHOUT ONE: the helper returns early
   when the match carries no URL. */
check(
  "E282/1 — a match with no source URL writes nothing",
  /sourceUrl = match\.legalName\.sourceUrl;[\s\S]{0,120}?if \(!sourceUrl\) return;/.test(
    e282Company
  ),
  "the URL is the match's own and is never synthesised"
);
/* ⚠⚠ AND THE DETAIL IS THE REGISTER'S OWN STRING, VERBATIM — never a Panameer
   summary. It is assigned from `match.status.value` and from nothing else. */
const detailAssigns = [...e282Company.matchAll(/detail = ([^;]+);/g)].map((m) => m[1].trim());
check(
  "E282/1 — entity_status_detail is only ever the register's own words",
  detailAssigns.length > 0 && detailAssigns.every((a) => a === "match.status.value"),
  `assigned from: ${detailAssigns.join(" | ")}`
);
/* ⚠ `has_issues` REQUIRES A DETAIL — an issue with no stated reason is an
   accusation. */
check(
  "E282/1 — has_issues without a detail writes nothing",
  /status = "has_issues";[\s\S]{0,260}?if \(!detail\?\.trim\(\)\) return;/.test(e282Company)
);

/* ── 2 · ⚠⚠ entityVerificationState READS THE COLUMN ─────────────────────── */
check(
  "E282/2 — entityVerificationState reads entity_validated_at",
  /company\?\.entity_validated_at \? "verified" : "unverified"/.test(e282Identity),
  "reverting it to `void _company` must fail this"
);
check(
  "E282/2 — and it no longer voids its argument",
  !/void _company/.test(e282Identity)
);

/* ── 3 · ⚠⚠ "verified" MEANS "WE CHECKED", NOT "IT PASSED" ───────────────
   Gating on a passing status would render "not yet verified" for a company we
   checked and found problems with — which HIDES THE FINDING and looks like
   inaction rather than a result. */
check(
  "E282/3 — verified does not require a passing status",
  !/entity_validation_status[\s\S]{0,80}?(===|!==)[\s\S]{0,40}?(in_good_standing|has_issues)[\s\S]{0,60}?"verified"/.test(
    e282Identity
  ) && !/in_good_standing/.test(e282Identity),
  "has_issues is still a company Panameer checked"
);

/* ── 4 · THE 48 UNSUPPORTED STATES STAY IMPOSSIBLE ───────────────────────── */
/* ⚠ THE KEYS ARE BARE IDENTIFIERS OR QUOTED depending on whether the state name
   has a space — `Texas:` but `"New York":`. My first version matched only the
   quoted form and found one adapter instead of three. Both forms, scoped to the
   ADAPTERS block so a state name in prose cannot inflate the count. */
const adaptersBlock =
  /export const ADAPTERS: Record<string, Adapter> = \{[\s\S]*?\n\};/.exec(e282Validation)?.[0] ??
  "";
check("E282/4 — the ADAPTERS block was found by the scan", adaptersBlock.length > 0);
const adapterStates = [
  ...adaptersBlock.matchAll(/^\s{2}(?:"([A-Z][A-Za-z ]+)"|([A-Z][A-Za-z]+)):\s*\{/gm),
].map((m) => m[1] ?? m[2]);
check(
  "E282/4 — still exactly three states have an adapter",
  adapterStates.length === 3,
  `[${adapterStates.join(", ")}]`
);
/* ⚠ AND AN UNSUPPORTED STATE CANNOT PRODUCE A STORED CHECK: `ok: false` writes
   nothing, which is the only path an adapter-less state can take. */
check(
  "E282/4 — an ok:false result writes nothing",
  /if \(!result\.ok\) return;/.test(e282Company),
  "an unsupported state or an unreachable register is not a check"
);

/* ── 5 · ⚠⚠ NEW YORK STILL CANNOT CLAIM GOOD STANDING ──────────────────── */
check(
  "E282/5 — New York still publishes no standing",
  /publishesStatus: false/.test(e282Validation)
);
/* ⚠ EVEN WITH A ROW ON FILE. A register with no standing column lands on
   `standing_unknown`, which is why there are FOUR states and not three. */
check(
  "E282/5 — a register with no standing column stores standing_unknown",
  /if \(!result\.publishesStatus \|\| !match\.status\) \{[\s\S]{0,200}?status = "standing_unknown"/.test(
    e282Company
  ),
  "without the fourth state NY would have to be recorded as a pass or a problem"
);
check(
  "E282/5 — and it can never be stored as in_good_standing",
  e282Company.indexOf('status = "standing_unknown"') <
    e282Company.indexOf('status = "in_good_standing"'),
  "the no-standing branch must be reached first"
);

/* ── 6 · ⚠⚠ THE VALIDATE ROUTE STILL WRITES NOTHING ─────────────────────
   Its own docblock: "keeping the read and the write apart is what lets a user
   correct a bad lookup before anything is persisted." ⚠ THIS BRIEF IS THE MOST
   LIKELY THING EVER TO BREAK THAT SPLIT, so it is asserted structurally. */
check(
  "E282/6 — api/company/validate/route.ts performs no write",
  !/prisma\.[a-zA-Z]+\.(create|update|updateMany|upsert|delete|deleteMany)\(/.test(e282Route),
  "the route's body has no company id — it does not know what to write to"
);
check(
  "E282/6 — and the write lives in defineCompany instead",
  /await persistEntityValidation\(/.test(e282Company)
);

/* ── 7 · ⚠⚠ DefineInput CARRIES NO VALIDATION FIELDS ────────────────────
   Accepting a status or a source URL from the browser is a FORGEABLE TRUST
   CLAIM. The lookup is made server-side, from the name and state the function
   already has. */
const defineInput = /export type DefineInput = \{[\s\S]*?\n\};/.exec(e282Company)?.[0] ?? "";
check("E282/7 — DefineInput was found by the scan", defineInput.length > 0);
for (const f of [
  "entity_validated_at",
  "entity_validation_status",
  "entity_validation_source_url",
  "entity_status_detail",
  "sourceUrl",
  "validationStatus",
]) {
  check(
    `E282/7 — DefineInput carries no ${f}`,
    !new RegExp(f).test(defineInput),
    "a client-supplied trust claim is forgeable"
  );
}
/* ⚠ AND THE CALL IS MADE FROM THE SERVER'S OWN VALUES, not from anything the
   client could have shaped into a match. */
check(
  "E282/7 — validateEntity is called with the server's name and state",
  /validateEntity\(\{[\s\S]{0,160}?name: input\.name[\s\S]{0,160}?stateOfFiling: state/.test(
    e282Company
  )
);
/* ⚠ AND IT CAN NEVER COST A USER THEIR COMPANY RECORD. */
check(
  "E282/7 — the lookup cannot fail the save",
  /try \{[\s\S]*?await prisma\.company\.update\([\s\S]*?\} catch \{/.test(e282Company) &&
    /timeoutMs: 5000/.test(e282Company),
  "a dead register must not block onboarding — decision 5"
);

if (failures.length > 0) {
  console.error(`check:trust-claims — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:trust-claims — ${pass}/${pass} passed`);
