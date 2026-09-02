/**
 * `check:work-request-identity` — the four ways "who is asking" goes wrong
 * (`P1-J4-E025` WS-5).
 *
 *   1  THE POST GATE IS SERVER-SIDE. The wizard mirrors it; the wizard is not
 *      it. `/api/work-requests/[id]/post` is reachable without ever loading the
 *      component, and a gate that lives only in the client is not a gate.
 *   2  ⚠⚠ A CONFIDENTIAL COMPANY NAME NEVER CROSSES THE WIRE. Not "styled as
 *      hidden", not "hidden unless you read the payload" — the same class of
 *      failure `provider-profile-view.ts` had to close for `client_domain`,
 *      where the redacted name leaked through a second identifying field.
 *   3  THE VERIFICATION LINE RENDERS IN BOTH STATES, from ONE layout. `E282` is
 *      not built, so today every request renders the negative; the affirmative
 *      copy must already exist and the component must not branch on it, or
 *      "flip it later without a redesign" turns into a rewrite.
 *   4  DRAFTS ARE NEVER GATED. Write and save freely — the gate is on POSTING.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SOURCE SCAN, reusing `check-community.ts`'s
 * `strip()`. This file and the files it audits both name the forbidden tokens in
 * their own prose; a scanner that read prose would fail on its own
 * documentation, and the fix for that is always to weaken the scanner.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  buildBuyerIdentity,
  missingIdentityForPost,
  verificationLines,
  entityVerificationState,
  standingLine,
  VERIFICATION_COPY,
  POST_REQUIREMENTS,
  type PostRequirementKey,
} from "@/lib/work-request-identity";

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

const LIB = join("src", "lib", "work-request-identity.ts");
const WR = join("src", "lib", "work-request.ts");
const ROUTE = join("src", "app", "api", "work-requests", "[id]", "post", "route.ts");
const FEED = join("src", "lib", "work-feed.ts");
const BLOCK = join("src", "components", "work", "WhoIsAsking.tsx");
const REVIEW = join("src", "components", "work", "ReviewWorkRequest.tsx");

for (const f of [LIB, WR, ROUTE, FEED, BLOCK, REVIEW]) {
  check(`the file this guard is about exists: ${f}`, existsSync(f));
}
const wr = read(WR);
const route = read(ROUTE);
const feed = read(FEED);
const block = read(BLOCK);

// ---------------------------------------------------------------------------
// GUARD 1 — the post gate is server-side, and it is the whole required set
// ---------------------------------------------------------------------------

/* ⚠ RENAMED, NOT REDUCED (`P1-ALL-E033` WS-0). The three person keys moved to
   the shared vocabulary in `lib/identity-bar.ts` — `personName` -> `name`,
   `personPhoto` -> `photo`, `personTitle` -> `jobTitle`. All six are still
   asserted and no assertion below was dropped or loosened. */
const ALL_KEYS: PostRequirementKey[] = [
  "name",
  "photo",
  "jobTitle",
  "approvedCompany",
  "companyName",
  "companyCountry",
];

const EMPTY = {
  firstName: "", lastName: "", photoUrl: null, jobTitle: null,
  hasApprovedCompanyMembership: false, companyName: null, companyCountry: null,
};
const COMPLETE = {
  firstName: "Ada", lastName: "Lovelace", photoUrl: "/p.jpg", jobTitle: "Head of Procurement",
  hasApprovedCompanyMembership: true, companyName: "Northwind", companyCountry: "United States",
};

check(
  "1 — an empty buyer is missing every required field",
  ALL_KEYS.every((k) => missingIdentityForPost(EMPTY).includes(k)),
  `got ${JSON.stringify(missingIdentityForPost(EMPTY))}`
);
check("1 — a complete buyer is missing nothing", missingIdentityForPost(COMPLETE).length === 0);
for (const k of ALL_KEYS) {
  check(`1 — every required key has a reason and a link: ${k}`, Boolean(POST_REQUIREMENTS.find((r) => r.key === k)?.reason && POST_REQUIREMENTS.find((r) => r.key === k)?.href));
}
/*
  ⚠ THE REFUSAL MAY NOT BE THE VAGUE ONE. "Complete your profile" is exactly the
  non-answer this brief replaced, and it is worth failing the build over.
*/
for (const r of POST_REQUIREMENTS) {
  check(
    `1 — "${r.key}" names the field rather than saying "complete your profile"`,
    !/complete your profile/i.test(`${r.field} ${r.reason}`)
  );
}
check(
  "1 — whitespace is not a name",
  missingIdentityForPost({ ...COMPLETE, firstName: "   " }).includes("name")
);
check(
  "1 — a PENDING membership is not an approved one",
  missingIdentityForPost({ ...COMPLETE, hasApprovedCompanyMembership: false }).includes("approvedCompany")
);

check(
  "1 — postWorkRequest runs the identity check SERVER-SIDE",
  /missingIdentityForPerson\s*\(/.test(wr),
  "lib/work-request.ts never calls it, so the API would accept an anonymous post"
);
check(
  "1 — the post route delegates to postWorkRequest rather than gating only on guardApi",
  /postWorkRequest\s*\(/.test(route)
);
check(
  "1 — the refusal carries its fields to the client",
  /IDENTITY_REQUIRED/.test(wr) && /fields/.test(route),
  "without them the UI can only say 'complete your profile'"
);

// ---------------------------------------------------------------------------
// GUARD 2 — ⚠⚠ a CONFIDENTIAL company name never crosses the wire
// ---------------------------------------------------------------------------

const PERSON = {
  first_name: "Ada",
  last_name: "Lovelace",
  title: "Head of Procurement",
  photo_url: "/p.jpg",
  company: {
    id: "c1",
    name: "Northwind Energy",
    country: "United States",
    vertical: "Oil & Gas",
    logo_url: "/logo.png",
    tin: "12-3456789",
  },
  user: { email_verified: new Date("2025-01-01") },
};
const STANDING = { memberSince: "2025-03-04T00:00:00.000Z", postedCount: 4 };
const idFor = (visibility: string, viewer = { isOwner: false, isAdmin: false, isPlus: false }) =>
  buildBuyerIdentity({
    person: PERSON,
    companyVisibility: visibility,
    companyCodeName: "A global energy company",
    standing: STANDING,
    viewer,
  });

const provider = idFor("CONFIDENTIAL");
check("2 — CONFIDENTIAL withholds the company name from a provider", provider.companyName === null);
check(
  "2 — CONFIDENTIAL withholds the LOGO too, which names a company as surely as text",
  provider.companyLogoUrl === null
);
check("2 — CONFIDENTIAL is flagged so the UI can say so", provider.companyConfidential === true);
check("2 — PLUS_ONLY also withholds it from a plain provider", idFor("PLUS_ONLY").companyName === null);
check("2 — PUBLIC shows it", idFor("PUBLIC").companyName === "Northwind Energy");
check("2 — the owner always sees their own name", idFor("CONFIDENTIAL", { isOwner: true, isAdmin: false, isPlus: false }).companyName === "Northwind Energy");
check("2 — staff always see it, because they arbitrate", idFor("CONFIDENTIAL", { isOwner: false, isAdmin: true, isPlus: false }).companyName === "Northwind Energy");

/*
  ⚠⚠ CONFIDENTIAL HIDES THE NAME AND NOTHING ELSE. This is the assertion that
  stops a future "make confidential more confidential" from turning a work
  request into the anonymous post the whole brief exists to prevent.
*/
check("2 — CONFIDENTIAL still shows the person", provider.personName === "Ada Lovelace");
check("2 — CONFIDENTIAL still shows their job title", provider.personTitle === "Head of Procurement");
check("2 — CONFIDENTIAL still shows their photo", provider.personPhotoUrl === "/p.jpg");
check("2 — CONFIDENTIAL still shows the country", provider.companyCountry === "United States");
check("2 — CONFIDENTIAL still shows the industry", provider.companyVertical === "Oil & Gas");
check("2 — CONFIDENTIAL still shows the standing counts", provider.standing.postedCount === 4);
check("2 — CONFIDENTIAL still shows both verification lines", provider.verification.length === 2);

/*
  ⚠ AND THE FEED MUST TAKE ITS CARD FIELDS FROM THE REDACTED VIEW, not from the
  raw row it selected them on. Reading `w.buyer.company.name` straight onto the
  card is exactly how the redaction gets bypassed.
*/
check(
  "2 — the work feed builds the identity through the redaction",
  /buildBuyerIdentity\s*\(/.test(feed)
);
check(
  "2 — the work feed does not put the RAW company name on a card",
  !/company(Name|LogoUrl)\s*:\s*w\.buyer\.company/.test(feed),
  "that value has not been through clientNameVisibility"
);

// ---------------------------------------------------------------------------
// GUARD 3 — both verification states exist, and there is only one layout
// ---------------------------------------------------------------------------

check(
  "3 — E282 is not built, so the entity line is negative for everyone today",
  entityVerificationState({ id: "c1", tin: "12-3456789" }) === "unverified"
);
const verified = verificationLines({ emailVerifiedAt: new Date(), company: { id: "c" } });
const unverified = verificationLines({ emailVerifiedAt: null, company: null });
check("3 — a verified inbox reads verified", verified[0].state === "verified");
check("3 — an unverified inbox reads unverified", unverified[0].state === "unverified");
check("3 — the entity line is always present, never omitted", verified.length === 2 && unverified.length === 2);
check(
  "3 — the negative is stated, not left blank",
  Boolean(VERIFICATION_COPY.entity.unverified.label.trim() && VERIFICATION_COPY.entity.unverified.detail.trim())
);
/*
  ⚠⚠ THE AFFIRMATIVE COPY ALREADY EXISTS. This is the assertion that makes
  "flips without a redesign" true rather than aspirational: the words `E282` will
  need are written and sitting in the table today.
*/
check(
  "3 — the AFFIRMATIVE entity copy is already written, ready for E282",
  Boolean(VERIFICATION_COPY.entity.verified.label.trim() && VERIFICATION_COPY.entity.verified.detail.trim())
);
check(
  "3 — the email line underclaims: it says it is not proof of identity",
  /not proof of who they are/i.test(VERIFICATION_COPY.email.verified.detail)
);
check(
  "3 — the block renders the lines from the array, in ONE loop",
  /verification\.map\s*\(/.test(block),
  "two hand-written branches drift the moment one state changes"
);
check(
  "3 — no component hard-codes the affirmative label",
  !/["'`]Company verified["'`]/.test(block),
  "it must come from VERIFICATION_COPY so E282 flips it centrally"
);
check(
  "3 — no invented trust signal anywhere in the block",
  !/trust score|highly rated|out of 5|★|stars?\b/i.test(block)
);

/* Standing: a first-time poster is STATED, never warned about. */
check(
  "3 — a first-time poster reads 'First work request'",
  standingLine({ memberSince: null, postedCount: 1 }) === "First work request"
);
check(
  "3 — a zero count reads the same rather than '0 work requests'",
  standingLine({ memberSince: null, postedCount: 0 }) === "First work request"
);
check(
  "3 — a repeat poster is counted plainly",
  standingLine({ memberSince: null, postedCount: 4 }) === "4 work requests posted"
);
check(
  "3 — member since is stated when known",
  standingLine(STANDING).startsWith("Member since March 2025")
);
check(
  "3 — nothing editorialises a new account",
  !/new account|caution|beware|be careful|unproven/i.test(
    `${standingLine({ memberSince: null, postedCount: 1 })} ${block}`
  )
);

// ---------------------------------------------------------------------------
// GUARD 4 — drafts are never gated
// ---------------------------------------------------------------------------

/*
  ⚠ THE CHECK MUST APPEAR EXACTLY ONCE, IN `postWorkRequest`. `saveSection` is
  the draft path; if the call ever appears there, a requester is locked out of
  their own half-written request.
*/
/* ⚠ THE DEFINITION IS NOT A CALL SITE. `function missingIdentityForPerson(` also
   matches the bare name, and counting it made this assertion red against correct
   code on the day it was written — a miscount, fixed by counting properly rather
   than by loosening the rule from "exactly once" to "at most twice". */
const calls = (wr.match(/(?<!function\s)missingIdentityForPerson\s*\(/g) ?? []).length;
check(
  "4 — the identity check is called exactly once (definition aside)",
  calls === 1,
  `found ${calls} call sites — a second one is almost certainly on the draft path`
);
const saveSectionBody = wr.slice(
  wr.indexOf("export async function saveSection"),
  wr.indexOf("function missingForPost")
);
check(
  "4 — saveSection does not run the identity gate",
  saveSectionBody.length > 0 && !/missingIdentityForPerson/.test(saveSectionBody),
  "drafts must save freely"
);
check(
  "4 — the gate sits after the POSTED short-circuit, so re-posting is still idempotent",
  wr.indexOf('wr.status === "POSTED"') < wr.indexOf("missingIdentityForPerson(wr.buyer_person_id)")
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:work-request-identity — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:work-request-identity — ${pass}/${pass} passed`);
