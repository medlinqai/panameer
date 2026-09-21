import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stripComments } from "./lib/strip-comments";

/**
 * ── ⚠⚠ `check:community-page` — THE COMMUNITY PAGE'S RULES (`E591` WS-C) ──
 *
 * ⚠⚠⚠ TWO OF THESE ARE SILENT FAILURES AND THAT IS WHY THEY ARE A GATE, not a
 * comment: a rate that reaches the payload without being rendered discloses
 * itself to anyone who opens devtools, and an initials fallback looks like a
 * design choice rather than a rule being broken.
 *
 * ⚠ EVERY SCAN STRIPS COMMENTS FIRST. This repo QUOTES superseded code
 * (`E164`), so a raw grep matches the quote and fails on history — the trap
 * rule 12 records and `scripts/lib/strip-comments.ts` now centralises.
 */

const read = (...p: string[]) => readFileSync(join(...p), "utf8");
const code = (...p: string[]) => stripComments(read(...p));

/**
 * ⚠⚠ THE MODULE SPECIFIER IS NOT CODE FOR THIS PURPOSE, AND LEAVING IT IN GAVE
 * A FALSE POSITIVE THE FIRST TIME THIS GATE RAN.
 *
 * ⚠ `community-page.ts` legitimately imports `profileIdsByPersonId` from
 * `@/lib/provider-rates` — the module that used to hand out rates is the one
 * that now hands out the link instead. ⚠⚠ THE PATH CONTAINS THE WORD `rates`,
 * so a bare `/rate/i` over the file flagged the FIX as the defect.
 * ⚠⚠⚠ THE RULE IS ABOUT RATE DATA, NOT ABOUT A FILENAME. Only the quoted path
 * is removed; the imported NAMES are left in, so importing `ratesByPersonId`
 * here would still be caught — which is the assertion that actually matters.
 */
const withoutImportPaths = (src: string) =>
  src.replace(/from\s+["'][^"']+["']/g, "from '…'");

const PAGE = code("src", "app", "(app)", "community", "page.tsx");
const LIB = code("src", "lib", "community-page.ts");
const CARDS = code("src", "components", "community", "ColleagueCards.tsx");
const RAIL = code("src", "components", "community", "CommunityRail.tsx");
const SIL = code("src", "components", "community", "Silhouette.tsx");
const RATES = code("src", "lib", "provider-rates.ts");
const CARDS_PROFILE = code("src", "components", "community", "ConnectProfile.tsx");
const HOME = code("src", "components", "community", "ConnectHome.tsx");

const SURFACE: [string, string][] = [
  ["the page", PAGE],
  ["the page's lib", LIB],
  ["the colleague cards", CARDS],
  ["the rail", RAIL],
  ["the placeholder", SIL],
];

let failed = 0;
let passed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  ok    ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("check:community-page — P2-J3-E591 WS-C\n");

/* ── 1 · ⚠⚠⚠ NO RATE ANYWHERE EXCEPT THE VIEWER'S OWN ──────────────────── */
/*
  ⚠ Scott, 2026-09-20: *"I do nto think providers should see other provider's
  rates."* — *"Not on a colleague card, not on a team roster, not in a tooltip,
  not in an aria-label, not in the JSON the page ships to the client."*
  ⚠⚠ A RATE OMITTED FROM THE RENDER BUT PRESENT IN THE PAYLOAD IS STILL
  DISCLOSED, so the test is on the whole surface, not on the JSX.
*/
for (const [name, src] of SURFACE) {
  check(`1 — ⚠ ${name} names no rate`, !/rate/i.test(withoutImportPaths(src)));
}
check(
  "1 — ⚠⚠ the page does not reach for `ratesByPersonId`",
  !/ratesByPersonId/.test(PAGE + LIB + CARDS + RAIL)
);
/*
  ⚠⚠ AND THE REPLACEMENT CANNOT REGROW ONE. `profileIdsByPersonId` exists
  precisely so a caller that wants the profile LINK stops asking for the money;
  a rate column added to its select would restore the defect invisibly.
*/
const profileIdFn = /export async function profileIdsByPersonId[\s\S]*?\n}/.exec(RATES)?.[0] ?? "";
check("1 — `profileIdsByPersonId` exists", profileIdFn.length > 0);
check(
  "1 — ⚠⚠⚠ it selects TWO columns and no rate",
  /select:\s*\{\s*id:\s*true,\s*person_id:\s*true\s*\}/.test(profileIdFn) &&
    !/rate|currency/i.test(profileIdFn)
);
/*
  ⚠ `ratesByPersonId` IS NOT DELETED and must not be — three other callers use
  it legitimately, and one of them (`/api/invite-colleague`) shows the viewer a
  member they searched for. ⚠⚠ THE RULE IS ABOUT THIS PAGE, NOT ABOUT THE
  FUNCTION.
*/
check("1 — `ratesByPersonId` still exists for the surfaces that may show a rate", /export async function ratesByPersonId/.test(RATES));
check(
  "1 — ⚠ Connect Home stopped asking for rates too",
  !/ratesByPersonId/.test(HOME) && /profileIdsByPersonId/.test(HOME)
);

/* ── 2 · ⚠⚠ NEVER INITIALS ─────────────────────────────────────────────── */
/*
  ⚠ Scott: *"makes sure to use the icons you used on the mock up if there are no
  pictures."* ⚠⚠ `components/Avatar.tsx` RENDERS INITIALS AS ITS FALLBACK and is
  used across the app — it is deliberately NOT changed, and deliberately NOT
  used here.
*/
for (const [name, src] of SURFACE) {
  check(`2 — ⚠ ${name} does not use the initials Avatar`, !/\bAvatar\b/.test(src));
}
check(
  "2 — the placeholder is inline SVG, not a network request",
  /<svg/.test(SIL) && !/<img/.test(stripComments(read("src", "components", "community", "Silhouette.tsx")).replace(/export function Face[\s\S]*$/, ""))
);
check(
  "2 — ⚠⚠ one placeholder, used by the cards AND the rail",
  /Silhouette|Face/.test(CARDS) && /Face/.test(RAIL)
);

/* ── 3 · ⚠⚠ AN INVITED PERSON HAS NAME, EMAIL AND A DATE. NOTHING ELSE ─── */
/*
  ⚠⚠⚠ NEVER A PLACEHOLDER TITLE. Scott: *"Invites will ONLY have the
  information we provide (name and email). they will have no title."* ⚠ A
  fabricated title is a record of somebody who does not exist yet.
*/
const invitedCard = /export function InvitedCardView[\s\S]*?\n}/.exec(CARDS)?.[0] ?? "";
check("3 — the invited card exists", invitedCard.length > 0);
check("3 — ⚠⚠ it renders NO title", !/\btitle\b/.test(invitedCard.replace(/title="[^"]*"/g, "")));
check("3 — ⚠ it renders NO location", !/location/.test(invitedCard));
check("3 — it renders no photo — the face is explicitly null", /photoUrl=\{null\}/.test(invitedCard));
check("3 — it carries the email and when it was sent", /email/.test(invitedCard) && /sentAt|sentLabel/.test(invitedCard));
/*
  ⚠⚠ AND IT IS NOT A LINK. There is no profile to open, so the card must not be
  tabbable as one — `pm-cm-open` is the stretched-link class and must not appear
  in the invited card.
*/
check("3 — ⚠⚠ the invited card opens nothing (no stretched link)", !/pm-cm-open/.test(invitedCard));
/* ⚠ The lapsed-invitation rule, in the lib: `EXPIRED` is never written, so the
   filter must read the DATE. */
check(
  "3 — ⚠⚠ a lapsed invitation is excluded by date, not by status alone",
  /expires_at:\s*\{\s*gt:/.test(LIB)
);

/* ── 4 · THE JOINED CARD OPENS THE PROFILE, WITHOUT NESTING ANCHORS ────── */
const joinedCard = /export function JoinedCard[\s\S]*?\n}/.exec(CARDS)?.[0] ?? "";
check("4 — the joined card exists", joinedCard.length > 0);
check("4 — it uses a stretched link", /pm-cm-open/.test(joinedCard));
/*
  ⚠⚠⚠ AN `<a>` INSIDE AN `<a>` IS INVALID HTML AND BREAKS KEYBOARD ORDER. The
  card must be a `div` carrying ONE Link, not a Link carrying controls.
*/
check(
  "4 — ⚠⚠ the card itself is not an anchor",
  !/<Link[^>]*className="pm-cm-card/.test(joinedCard) && /<div className="pm-cm-card">/.test(joinedCard)
);
check("4 — exactly one Link in the card", (joinedCard.match(/<Link/g) ?? []).length === 1);
check(
  "4 — Message stays its own control, above the overlay",
  /pm-cm-actions/.test(joinedCard) && /ConnectControls/.test(joinedCard)
);
/* ⚠ A person's title is DATA and is never re-cased (`E568`). A
   `text-transform` anywhere on this page's CSS would do it invisibly. */
/* ⚠⚠ CSS COMMENTS ARE STRIPPED FIRST, AND THE FIRST RUN PROVED WHY: the
   stylesheet carries a comment WARNING against a literal fallback, quoting
   the forbidden form to explain it — and the raw scan matched the warning.
   ⚠ That is rule 12's trap in a stylesheet: a gate that greps source must
   strip comments or it fails on its own documentation. */
const CSS = stripComments(read("src", "components", "community", "community-page.css"));
check(
  "4 — ⚠⚠ no `text-transform` re-cases a person's data",
  !/text-transform:\s*(uppercase|capitalize|lowercase)/.test(CSS)
);

/* ── 5 · ⚠⚠ PROFILE COMPLETION DOES NOT APPEAR ON THIS PAGE ────────────── */
/*
  ⚠ Scott, explicitly. ⚠⚠ ONE SUMMARY OF COMPLETENESS, ONE SURFACE — `E588`
  WS-A's ruling applied across pages rather than only within one. ⚠⚠⚠ `E590`
  OWNS THE RING AND `completeness.ts`; this brief says do not touch either.
*/
for (const [name, src] of SURFACE) {
  check(
    `5 — ⚠ ${name} shows no completeness / completion ring`,
    !/CompletionRing|completeness|computeProfileScore|ProfileScore/.test(src)
  );
}

/* ── 6 · THE RAIL CLEARS THE PINNED BAND (WS-A item 5) ─────────────────── */
/*
  ⚠⚠ A NEW STICKY RAIL CREATED AFTER `E587` PINNED THE BAND IS THE EXACT CASE
  THAT BROKE ONCE ALREADY. `check:app-shell` asserts it in a browser; this
  asserts the declaration, so the reason is written down next to the rule.
*/
check("6 — the rail is sticky", /\.pm-cm-rail[\s\S]*?position:\s*sticky/.test(CSS));
check(
  "6 — ⚠⚠ it clears the band with the variable",
  /top:\s*calc\(var\(--pm-band-h\)\s*\+\s*16px\)/.test(CSS)
);
/*
  ⚠⚠⚠ NO LITERAL FALLBACK. `var(--pm-band-h, 67px)` is a hard-coded height with
  extra steps and is WRONG below 780px, where the band is 57px.
*/
check(
  "6 — ⚠⚠⚠ the var carries NO literal fallback",
  !/var\(--pm-band-h\s*,/.test(CSS)
);

/* ── 7 · THE PAGE IS TWO COLUMNS, AND THE RAIL HOLDS THE SMALL THINGS ──── */
check("7 — the page renders the two-column grid", /pm-cm["\s]/.test(PAGE) || /className="pm-cm"/.test(PAGE));
check("7 — Mentors and Teams are in the rail", /Mentors/.test(RAIL) && /Teams/.test(RAIL));
check("7 — the rail is an <aside>, so the sticky assertion can find it", /<aside/.test(RAIL));
/*
  ⚠ Teams is bounded by premise 6: build only what `teams.ts` already returns.
  ⚠⚠ NO `Team` MODEL IS INVENTED — the rail must not reach for a table.
*/
check(
  "7 — ⚠⚠ the rail invents no team model",
  !/prisma\./.test(RAIL) && /getMyTeams/.test(RAIL)
);
check(
  "7 — ⚠ owner vs member is read from the roster, not the capability flag",
  /represents\.length/.test(RAIL) && !/isCoordinator/.test(RAIL.replace(/\/\/.*/g, ""))
);

/* ── 8 · ⚠⚠ "WAITING ON YOU" SURVIVES, AND SO DOES ITS CASING ──────────── */
/*
  ⚠⚠⚠ THIS BLOCK NEARLY SHIPPED MISSING. The WS-C layout replaced
  `ConnectHome`, and with it went the ONLY surface in the app that renders an
  incoming colleague request — `/community/colleagues` shows the roster, not the
  pending asks. ⚠ `check:connect-walk` caught it. A member could not have
  accepted a request at all.
  ⚠⚠ IT IS ASSERTED HERE, IN SOURCE, BECAUSE IT RENDERS NOTHING AT ZERO: a
  browser on a clean account cannot see it, and seeding a pending request to
  make a gate green is `E564`.
*/
check("8 — the Waiting on You block exists", /export function WaitingOnYou/.test(CARDS));
/*
  ⚠⚠ IT MOVED TO THE RAIL (`P2-A3-E596` WS-C item 1), ABOVE MENTORS.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   check("8 — ⚠⚠ the page renders it", /<WaitingOnYou/.test(PAGE));
  ⚠⚠⚠ THE INVARIANT IS UNCHANGED AND IS THE WHOLE POINT OF THIS BLOCK: the
  community surface must render the ONLY door to an incoming request. What
  changed is WHICH file mounts it, so the assertion follows the component
  instead of pinning a location.
  ⚠ THE GATE ALREADY STRIPPED COMMENTS, AND IT MATTERED HERE: the page keeps the
  old `<WaitingOnYou rows={incoming} />` line as an `E164` quote, and an
  unstripped scan would have read that quote as live code and passed while the
  block rendered nowhere. Rule 12's second trap, caught by the gate working.
*/
check("8 — ⚠⚠ the rail renders it", /<WaitingOnYou/.test(RAIL));
check(
  "8 — ⚠ and the page still supplies the incoming requests",
  /incoming=\{incoming\}/.test(PAGE)
);
check(
  "8 — ⚠⚠⚠ it offers accept AND decline, so a request can be answered",
  /relation="PENDING"/.test(CARDS) && /showDecline/.test(CARDS) && /incomingConnectionId/.test(CARDS)
);
/* ⚠ `E568` Title Case, checked where it is visible regardless of data. */
check(
  "8 — ⚠ Title Case: `Waiting on You`, and the lower-case original is gone",
  /Waiting on You/.test(CARDS) && !/Waiting on you/.test(CARDS)
);
check("8 — ⚠ it renders nothing at zero rather than an empty container", /rows\.length === 0\) return null/.test(CARDS));

/* ── 9 · ⚠⚠⚠ NO RATE THAT IS NOT THE VIEWER'S OWN (`E593` WS-C item 13) ── */
/*
  ⚠ Scott, 2026-09-20: *"no rate that is not the viewer's own."*
  ⚠⚠ THIS IS THE STRUCTURAL HALF, AND IT IS HERE BECAUSE THE BROWSER HALF
  CANNOT CARRY IT. Measured at the WS-C gate: the rate FIELD NAMES appear in
  NEITHER page's payload — not the visitor's, and not the owner's — because
  `ConnectProfile` and everything under it are SERVER components, so `p` is
  never serialised. ⚠⚠⚠ AN ABSENCE ASSERTION IN A SPEC THEREFORE COULD NEVER
  FAIL, which is `E586`. **The claim that CAN fail is this one: the view model
  does not build the object at all for a non-owner.**
*/
const PVIEW = code("src", "lib", "provider-profile-view.ts");
/*
  ── ⚠⚠⚠ OVERRULED 2026-09-20 — THE RULE IS PROVIDER→PROVIDER ──────────────

  ⚠ SUPERSEDED, quoted not deleted (`E164`) — what WS-C asserted for one gate:
  //   check("the view model withholds `rates` from a NON-OWNER",
  //     /rates:\s*!isOwner \? null :/.test(PVIEW));

  ⚠⚠ SCOTT'S RULING WAS ALWAYS *"providers should not see other provider's
  rates"*. The brief's *"no rate that is not the viewer's own"* was chat's
  over-generalisation, made twice, and it read as settled because it was
  repeated — the failure mode `CLAUDE.md` opens with.
  ⚠⚠⚠ THE BLANKET VERSION BROKE THE MARKETPLACE: a rate is in the REQUIRED set
  precisely so BUYERS CAN FILTER ON IT (`E581`), and hiding it from them removes
  the reason the field is mandatory.

  ⚠ THIS GATE NOW ASSERTS THE BUYER CASE, WHICH IS THE ONE THAT WOULD REGRESS
  SILENTLY: a future tightening back to `!isOwner` passes every visitor test —
  a provider still cannot see another provider's rate — while quietly taking it
  from every buyer. **The old assertion could not tell those two apart.**
*/
check(
  "9 — ⚠⚠ a BUYER sees the rate — the predicate is capability, not identity",
  /hasCapability\(opts\.viewer, "canHireTalent"\)/.test(PVIEW)
);
check(
  "9 — ⚠ the owner always sees their own",
  /isOwner \|\|/.test(PVIEW)
);
/* ⚠ A signed-out visitor is not a buyer: `viewer` is null and a null holds no
   capability, so the rate is withheld — the safe direction on a public page. */
check(
  "9 — ⚠ a signed-out viewer is not treated as a buyer",
  /opts\.viewer != null && hasCapability/.test(PVIEW)
);
/* ⚠⚠ AND THE BLANKET FORM MUST NOT COME BACK. This is the shape that hides the
   rate from buyers, and it is the one thing this section exists to prevent. */
check(
  "9 — ⚠⚠⚠ the blanket `!isOwner` form is gone and stays gone",
  !/rates:\s*!isOwner \?/.test(PVIEW)
);
/* ⚠ And the CARD is gated, not just its body — `RateRows` returning null still
   left `ProfileCard` printing the heading `Rates` over an empty box, which told
   a visitor a rate existed and was being withheld. Caught by the WS-C walk. */
check(
  "9 — ⚠ the Rates CARD is gated, not only its rows",
  /\{p\.rates && \(\s*<ProfileCard/.test(CARDS_PROFILE)
);
check(
  "9 — ⚠ both rate consumers handle the null",
  (CARDS_PROFILE.match(/if \(!p\.rates\) return null;/g) ?? []).length === 2
);

/* ── 10 · ⚠⚠ THE RAIL'S COMB, AND WHAT IT REPLACED (`E593`) ─────────────── */
/*
  ⚠ Scott, 2026-09-20: remove the plain-link card, put the Usage Stats comb in
  that slot. ⚠⚠ THE CONDITION WAS *"prove nothing becomes unreachable"*, so the
  four destinations it used to carry are each asserted to have another door.
*/
const USAGE = code("src", "lib", "usage-stats.ts");
const RAIL_L = CARDS_PROFILE;

check(
  "10 — the plain-link card is gone",
  !/label: "My Stats"/.test(RAIL_L) && !/label: "My Settings"/.test(RAIL_L)
);
check("10 — the comb is in its slot", /<UsageComb usage=\{usage\} \/>/.test(RAIL_L));
/*
  ⚠⚠ SIX CELLS, IN BAND ORDER, EACH WITH A ONE-WORD LABEL. Scott: *"Six
  unlabelled numbers can't be read — you can't tell which application owns
  which."* ⚠ The labels ARE the band's words, which is what makes one word
  enough.
*/
for (const label of ["Connect", "Learn", "Work", "Sell", "Orders", "Get Paid"]) {
  check(`10 — the comb labels "${label}"`, new RegExp(`label: "${label}"`).test(RAIL_L));
}
/*
  ⚠⚠⚠ INK, WITH ONE DELIBERATE EXCEPTION. `E433` reserves magenta for
  interactive things and these are figures — but Scott ruled `Get Paid`
  dominant *"by DESIGN WEIGHT: size, position, colour and label."* ⚠ The gate
  holds the exception to ONE cell so it cannot spread: exactly one `pay: true`.
*/
check(
  "10 — ⚠ exactly one cell is magenta, and it is Get Paid",
  (RAIL_L.match(/pay: true/g) ?? []).length === 1 &&
    /label: "Get Paid",[\s\S]{0,400}pay: true/.test(RAIL_L)
);
check(
  "10 — the figures are ink except that one",
  /c\.pay \? "text-magenta" : "text-ink"/.test(RAIL_L)
);
/*
  ⚠⚠⚠ AND THE `$0` IS DERIVED, NOT TYPED. Earnings are not modelled — `Payment`
  is scoped by `p_account_id`, the buyer's money arriving, and there is no
  payout model. ⚠ A typed `$0` would be the `Viewing Me` mistake: a plausible
  number that does not exist. ⚠⚠ IT IS ENTAILED BY HAVING ZERO WORK ORDERS, and
  it INVALIDATES ITSELF — the moment there is an order the function returns
  `null` and the card renders the dash convention instead.
*/
check(
  "10 — ⚠⚠ the earnings figure is derived from the order count",
  /const earnedCents = orders === 0 \? 0 : null;/.test(USAGE)
);
check(
  "10 — ⚠ and the card renders a dash when it is not measurable",
  /earnedCents === null \? "—"/.test(RAIL_L)
);
/* ⚠ Every figure is a real count — the LOCKED Counters decision. No literal
   may stand in for one. */
check(
  "10 — every cell but earnings comes from a count",
  /prisma\.bidRequest\.count/.test(USAGE) &&
    /prisma\.package\.count/.test(USAGE) &&
    /prisma\.workOrder\.count/.test(USAGE)
);
/*
  ⚠⚠ NOTHING BECAME UNREACHABLE. Each of the four links the removed card
  carried now has another door, and this asserts the door rather than trusting
  the note that says so.
*/
const NAV = code("src", "lib", "nav.ts");
const RAIL_C = code("src", "components", "community", "CommunityRail.tsx");
for (const [href, where, body] of [
  ["/stats", "the comb's own link", RAIL_L + NAV],
  ["/account-health", "the Account Health card", RAIL_L + NAV],
  ["/community/teams", "the Community rail", RAIL_C],
  ["/settings", "the Connect tab row", NAV],
] as const) {
  check(`10 — ⚠ ${href} is still reachable, via ${where}`, body.includes(`"${href}"`));
}

console.log(
  `\ncheck:community-page — ${failed === 0 ? `${passed}/${passed} passed` : `${failed} FAILED, ${passed} passed`}`
);
process.exit(failed === 0 ? 0 : 1);
