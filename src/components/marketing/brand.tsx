import Link from "next/link";
import type { ReactNode } from "react";
import { ASSESSMENT_PRODUCT } from "@/lib/brand";

/*
  THE MARKETING NAV (brief_home_rebuild_08_09).

  Five items, matching both mockups. "Why Panameer" is gone with the section it
  pointed at — the rebuild has no Why-Panameer block, and a nav entry whose
  destination no longer exists is the dead link the walk keeps finding.

  EVERY HREF RESOLVES TO SOMETHING THAT EXISTS. Buyer is `/` now, so Hire Talent
  goes to the root; Pricing and Enterprise point at the two buyer sections that
  actually answer them — the value stack and the ERP punchout — rather than at
  pages nobody has built. An anchor into a real section is an honest
  destination; a route that 404s or a page that says "coming soon" is not.
*/
/*
  THE PUBLIC NAV — FINAL MODEL (Scott, 2026-08-12).

  Supersedes the labels in briefs #1 and #2.

      Assess · Talent · Projects · Packages · Learn · Enterprise   + For Experts

  ASSESS IS A PRIMARY CTA, not a nav link. The home IS the assessment front
  door, so the one thing a cold visitor can do for free — and the thing the
  whole funnel is built around — should not be a grey word sitting between five
  other grey words. It renders as the magenta button; see `MarketingHeader`.

  RENAMES, and they are more than cosmetic. "Hire Talent" -> Talent and "Find
  Work" -> Work, because the old pair split the nav by AUDIENCE (buyers
  here, sellers there) while the new set splits it by WHAT YOU GET: people
  (Talent), custom scoped work (Work), productized scope (Packages).

  ⚠ "Work" IS A LABEL, NOT A DOMAIN RENAME. It points at /work-marketplace;
  `/work` stays the authed provider page, and Work Request / Work Order / Work
  Package keep their names everywhere. A
  visitor picks a shape of engagement rather than declaring which side they are
  on.

  "WORK" IS ITS OWN ITEM, and its own page: `/work`, which is PUBLIC. It was
  briefly a separate "For Experts" door rendered apart from the six (E002 removed
  that); it is now simply one of the six.

  ⚠⚠ SUPERSEDED 2026-08-26 (P1-ALL-E017 closed) — the dead claim, quoted:
    *""FIND WORK" IS ITS OWN ITEM AGAIN, and its own page: /find-work, renamed
     from /for-providers so the label and the route say the same word."*
  ⚠ TRUE WHEN WRITTEN, FALSE NOW. The route swap gave `/work` to the PUBLIC page
  and moved the SIGNED-IN provider feed to `/find-work`, which is GATED
  (`guardPage("canProvideServices")`). The label is `Work`, not `Find Work`, and
  the public page it points at is `/work`. `/for-providers` survives only as a
  308 in `next.config.ts`, repointed to `/work`.

  PRICING IS NOT IN THE NAV. Price surfaces contextually, when a selection needs
  a plan, plus a passive link in the footer — which the footer already carries.
  Removed here rather than left as a seventh item: a nav "Pricing" invites a
  comparison before there is anything to compare.

  NO NAV DESTINATION IS A STUB ANY MORE. `/shop` HAS A REAL HERO AND A REAL
  FIVE-STEP SPINE as of `1d790be`. `/work-marketplace` is still an honest stub
  ("not built" behind the public header) and is still footer-only, not in the nav.

  ⚠⚠ SUPERSEDED 2026-08-26 (P1-ALL-E017 closed) — DOUBLE-STALE, quoted:
    *"ONE DESTINATION IN THE NAV IS AN HONEST STUB. /buy-services (renamed from
     /services) renders ComingSoon behind the public header."*
  ⚠ WRONG TWICE OVER: the route is `/shop`, not `/buy-services` (that folder is
  DELETED, and `/services` is a 308 to `/shop` since `P1-ALL-E023`), AND it no
  longer renders `ComingSoon` — `1d790be` gave it real content. Do not go looking
  for a stub that is not there.
*/
export type MarketingNavItem = {
  label: string;
  href: string;
  /**
   * ⚠ UNUSED SINCE E028, AND READ THIS BEFORE SETTING IT AGAIN.
   *
   * "AI Assessment" was the only item that ever carried it, and the branch that
   * rendered it applied `font-bold text-magenta` UNCONDITIONALLY — the same
   * treatment `isActive` uses. So a promoted item read as active on every page,
   * and two items looked selected at once. The branch is deleted.
   *
   * If anything is ever promoted again: PROMOTION USES WEIGHT, ACTIVE KEEPS
   * COLOUR. They have to be different signals or they collide exactly like this.
   */
  primary?: boolean;
};

/*
  ⚠ FOUR ITEMS, IN SCOTT'S ORDER (E029/E030). "I think we need clarity and less
  menu options." Learn leads deliberately: it is the free door, the widest
  audience, and the only page that serves both sides without making a visitor
  pick one.

  THREE WERE REMOVED, and none of them lost a route:

    "AI Assessment"  pointed at `/`. A home link wearing the assessment's name,
                     while the wordmark already goes home and `/assess` is the
                     actual assessment. It was also the ONLY `primary: true`
                     item — see the note on that field.
    "Enterprise"     was `/hire-talent#punchout`, an anchor, never a page. It
                     keeps its footer entry as "Services Punch-Out".
    "Work"           was `/work-marketplace`. THE ROUTE STAYS and is neither
                     deleted nor redirected: it is a real future destination for
                     custom scoped work, distinct from the seller marketing page
                     that has now taken its "Find Work" label. It appears in the
                     footer as TBD.

  ⚠ MENU LABEL == PAGE ROUTE, and that is why two routes were renamed. A menu
  called "Find Work" landing on /for-providers is a name the visitor never sees
  matching the one they clicked. See `next.config.ts` for the redirects.
*/
/*
  ── ⚠ THIS IS THE **THIRD** LABEL SET. READ ALL THREE BEFORE CHANGING ONE ─────

  ⚠ IF YOU ARE HERE BECAUSE AN OLDER NOTE SOMEWHERE SAYS THE LABEL SHOULD BE
  SOMETHING ELSE: the older note is describing set 1 or set 2. Do not "restore"
  it. Every one of these was Scott's call, and each supersedes the last.

    set 1 (E118)   Learn · Hire Talent · Find Work · Buy Services
    set 2 (E222)   Learn · Find Talent · Find Work · Shop          — wording only,
                   two labels moved and the order changed; not one href did.
    set 3 (E245)   Learn · Talent · Work · Shop · Optimize · Integrate

  ── ⚠⚠ SET 3, 2026-08-21 (P1-J0-E245) — A HISTORICAL SNAPSHOT, NOT THE CURRENT
        TABLE. FIVE OF THESE SIX HREFS HAVE SINCE MOVED (2026-08-26, P1-ALL-E017
        closed). THE LIVE TABLE IS `MARKETING_NAV` BELOW — READ THAT, NOT THIS. ──

  What SET 3 changed on the day: two labels SHORTEN and two are ADDED, and on
  that day not one existing href moved. ⚠ THE HREF COLUMN BELOW IS AS OF
  2026-08-21 AND IS NOW WRONG; the third column says where each one went.

    label       href @ 2026-08-21   ⚠ href TODAY
    Learn       /learn              /learn          unchanged
    Talent      /hire-talent        /talent         renamed, old folder DELETED
    Work        /find-work          /work           ⚠ SWAPPED — /find-work is now
                                                    the GATED provider feed
    Shop        /buy-services       /shop           renamed, old folder DELETED
    Optimize    /optimize           /optimize       unchanged (NEW at E245 as
                                                    /assess, repointed at E266)
    Integrate   /enterprise         /integrate      renamed, old folder DELETED

  ⚠ NO REDIRECTS FOR THE RENAMES — nothing was shared, so the old folders were
  deleted outright by instruction. The standing rule is `decisions-01.md`
  2026-08-25: A PUBLIC PAGE'S URL IS ITS MENU NAME, which all six now obey.

  ⚠ `Optimize` POINTS AT `/optimize` AS OF 2026-08-21 (`P1-J0-E266`), AND IT
  POINTED AT `/assess` FOR ONE DAY. Do not put it back.

  `/assess` IS THE WIZARD AND IT KEEPS FOCUSED CHROME WITH NO MARKETING NAV —
  documented at `assess/page.tsx` and locked in `nav_model_LOCKED`: *"a Sign Up
  button in a nav bar while someone is signing up is wrong."* So a nav item
  pointing there DROPPED THE VISITOR OUT OF THE SITE'S OWN NAVIGATION: click
  Optimize, and the six-item header you clicked it from disappears. That is the
  defect, and it is why the destination moved rather than the chrome.

  ⚠ `/optimize` IS NOT `/`. It is the assessment journey at its own address —
  hero, "Here's How It Works", and the five steps as disclosures — and its own
  CTA starts the wizard. `nav_model_LOCKED`'s reasoning that a plain HOME link
  would be redundant with the logo still holds and is not what this changes.

  ⚠ THE HEADER FITS, AND IT WAS MEASURED ON THE REAL PAGE RATHER THAN ASSUMED.
  Six items are WIDER than four despite two labels shortening, because the two
  new labels are the two longest in the set and each one also buys a 34px gap.
  At 1024 the nav went 353.88 -> 486.12 and the required row total 836.86 ->
  969.10 against 1024 available. `lg` still clears, but the slack fell from
  187.14 to 54.90. The full arithmetic is in `MarketingHeader.tsx`.

  ⚠ 54.90px IS THE WHOLE REMAINING BUDGET AND IT IS THE THING TO WATCH. A
  SEVENTH item, or a longer word in place of any of these six, overflows `lg`
  before it overflows anything else. This is not a number to eyeball a future
  change against — re-measure.

  ⚠ TWO LABELS STILL DIFFER BY ONE WORD AND STILL SIT ADJACENT — and shortening
  them made it WORSE, not better: "Talent" and "Work" are now single words with
  nothing else to tell them apart. They are the two sides of one market, which is
  the point, and it means an off-by-one in this array swaps a buyer destination
  for a seller one and STILL READS PLAUSIBLY. CHECK THE PAIRING BY HREF, NEVER BY
  READING DOWN THE LABELS. `check:app-shell` asserts it by href for that reason.

  ── ⚠⚠ THE LABEL AND THE ROUTE AGREE AGAIN — AND THIS REVERSES THE INSTRUCTION
  THAT USED TO SIT HERE (`P1-ALL-E017`, 2026-08-25) ────────────────────────────

  This block used to read: *"DO NOT 'TIDY' IT BY RENAMING THE ROUTES —
  `/enterprise` least of all. A rename means redirects, external links, metadata,
  sitemap entries and every in-app link: a large, risky change to close a cosmetic
  gap. The routes stay."* ⚠ IT IS QUOTED RATHER THAN DELETED because it was a
  reasonable call on its own facts, and exactly ONE of them changed.

  ⚠ SCOTT, 2026-08-25: *"this is JUST me. no one else is seeing anything else. i
  have not shared anything. it is WAAAAY to early."* NOTHING IS SHARED, so there
  are no external links and no redirect layer to carry. The cost the old comment
  priced was the redirect layer, and that cost is currently zero.

  ⚠ THE STANDING RULE IS NOW `decisions-01.md` 2026-08-25: **a public page's URL is
  its menu name.** `Talent -> /talent`, `Shop -> /shop`, `Integrate -> /integrate`,
  and the old folders were DELETED — no redirects, by instruction.

  ⚠⚠ `Work` POINTS AT `/work` AND THAT IS CORRECT AND FINISHED. The fourth rename
  landed on 2026-08-26: `/work` is the PUBLIC BUYER marketing page (`src/app/work/page.tsx`,
  `○`, 200 signed out) and the SIGNED-IN provider feed moved to `/find-work`
  (`src/app/(app)/find-work/page.tsx`, `guardPage("canProvideServices")`, reached from the
  rail). The two routes SWAPPED. No redirects — nothing was shared. So all six public
  pages now obey the standing rule above, `Work` included.

  ⚠⚠ SUPERSEDED 2026-08-26 (`P1-ALL-E017` CLOSED) — the dead claim, QUOTED not deleted:
    *"`Work` STILL POINTS AT `/find-work` AND THAT IS A BLOCKER, NOT AN OVERSIGHT.
     `src/app/(app)/work/page.tsx` ALREADY OWNS `/work` — it is the SIGNED-IN provider
     'Find Work' feed … Two pages cannot resolve one URL, so the fourth rename was
     stopped and reported rather than forced. ⚠ IT IS ALSO A NAMING COLLISION … That
     needs Scott's decision, not a file move."*
  ⚠ IT WAS TRUE WHEN WRITTEN and it is FALSE NOW. Scott made that decision (swap, not
  rename), `src/app/(app)/work/` no longer exists, and the naming collision is resolved
  because each URL now names one audience: `/work` = buyer, `/find-work` = provider.
  ⚠⚠ A COMMENT THAT ASSERTS A PRESENT-TENSE FACT IS INHERITED AS FACT BY THE NEXT
  READER — that is why this was rewritten rather than left to rot (`ORIENTATION §10.1`).

  ⚠ `/work-marketplace` IS A DIFFERENT ROUTE and was not touched by any of this.
*/
export const MARKETING_NAV: MarketingNavItem[] = [
  { label: "Learn", href: "/learn" },
  { label: "Talent", href: "/talent" },
  { label: "Work", href: "/work" },
  { label: "Shop", href: "/shop" },
  { label: "Optimize", href: "/optimize" },
  { label: "Integrate", href: "/integrate" },
];

/**
 * THE FOOTER INDEX — ONE TABLE, BOTH FOOTERS (E118).
 *
 * There were two footers and they disagreed. `/` renders `HomeFooter` (the
 * ported `.pm-home` stylesheet, with socials and a legal strip); every other
 * public page renders `MarketingFooter` (Tailwind, dark, five columns). Their
 * "Find Work" entries pointed at DIFFERENT pages — /for-providers and
 * /work-marketplace — and they used different words for the same destinations.
 *
 * The two SHELLS are kept, because their visual treatments genuinely differ and
 * collapsing them would restyle the home page, which is out of scope. The DATA
 * is shared, which is the part that was drifting: the same label can no longer
 * resolve to two places.
 *
 * ⚠ THE LABELS MATCH THE HEADER ON PURPOSE. As of E245 the header is Learn ·
 * Talent · Work · Shop · Optimize · Integrate. This table sits beside
 * `MARKETING_NAV` so a re-word has to pass both at once — the footer used to say
 * "Buy Pre-Built Services" and "Find Talent" for things the header called
 * something else, and it said "Enterprise Integration" for what the header now
 * calls `Integrate`.
 *
 * ⚠ THE TWO TABLES ARE NOT THE SAME SHAPE AND ARE NOT MEANT TO BE. The footer is
 * the full INDEX, including entries with no header item and entries with no page
 * at all; the header is six doors. The rule is one WORD PER DESTINATION, not one
 * row per row.
 *
 * ── ⚠ AND E222 REVERSED HALF OF THAT UNIFICATION, DELIBERATELY ───────────────
 *
 * Read the sentence above carefully before "fixing" anything: the footer's OLD
 * wording was "Find Talent", and E118 unified it TO "Hire Talent" because that is
 * what the header said. E222 (2026-08-19) moved BOTH to "Find Talent".
 *
 * So the current label is the one E118 removed. THAT IS A REVERSAL, NOT A
 * REGRESSION — E118's rule was "one word per destination", and that rule still
 * holds; only the word changed. Anyone reading E118's note and restoring "Hire
 * Talent" here would re-break the very thing E118 was written to fix.
 *
 * ── ⚠ AN ENTRY WITH NO `href` IS NOT A LINK ──────────────────────────────────
 *
 * It renders as plain text with a muted TBD marker: no anchor, no href, not
 * focusable. Scott asked for the full listing INCLUDING what is not built, so he
 * can see and manage it — but the footer today LINKS About, Careers and Contact
 * to /about, /careers and /contact, none of which exist, and "Coordinators" to
 * `href="#"`. TBD REPLACES those broken promises; it does not join them. A
 * visitor has to be able to tell a door from a plan at a glance, and a 404 is
 * the worst possible way to learn the difference.
 */
export type FooterEntry = {
  /** ⚠ Off-site. Renders `target="_blank" rel="noopener noreferrer"`. */
  external?: boolean;
  label: string;
  /** Absent = not built. Renders as text + TBD, never as an anchor. */
  href?: string;
};

export const FOOTER_GROUPS: { title: string; entries: FooterEntry[] }[] = [
  /*
    ── ⚠⚠ REBUILT FOR ONE SHARED FOOTER (`brief_walk_fixes` WS9) ──────────────

    Scott: *"i want the footer to be consistent across all public pages."* There
    were two footers; `HomeFooter` is retired (on disk, unimported — `E164`) and
    `MarketingFooter` now serves `/`, `/learn` and `/optimize` too.

    ⚠ `HIRE`, `WORK` AND `LEARN` COLUMNS REMOVED. Scott: *"it is duplicating a
    page."* Those three columns re-listed the header's own destinations.

    ⚠⚠ AND THE RULE THAT SHAPED EVERY ROW BELOW: **NO `href` MEANS NO ANCHOR.**
    `FooterRow` renders an entry without an href as PLAIN TEXT with a `TBD`
    marker. Of the 25 items Scott specified, 5 have pages and 20 do not — and the
    20 are deliberately not links. ⚠ A FOOTER OF DEAD LINKS ON EVERY PUBLIC PAGE
    IS EXACTLY WHAT `HomeFooter` WAS CUT DOWN TO REMOVE. DO NOT REGROW IT.
  */
  {
    /* ⚠ REAL URLS, and the only group where every row but one is a link. The
       anchors carry `target="_blank" rel="noopener noreferrer"` — see `FooterRow`. */
    title: "Panameer on the Web",
    entries: [
      {
        label: "YouTube",
        href: "https://www.youtube.com/c/panameer",
        external: true,
      },
      {
        label: "Instagram",
        href: "https://instagram.com/onpanameer",
        external: true,
      },
      /* ⚠ `?viewAsMember=true` STRIPPED — a preview parameter, not a public link. */
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/company/panameer/",
        external: true,
      },
      { label: "X", href: "https://x.com/onpanameer", external: true },
      /* ⚠ NO DESTINATION YET. Plain text, by instruction. */
      { label: "WhatsApp" },
    ],
  },
  {
    /* ⚠ ALL FIVE ARE PLAIN TEXT. Every one names a capability a provider does not
       have a page for: `/settings/packages` publishes a product but it is signed-in
       and role-gated, and there is no public page for any of these five. */
    title: "Service SELLER Features",
    entries: [
      { label: "Sell Consulting Hours" },
      { label: "Sell Retainer Hours" },
      { label: "Sell Pre-Defined Demos" },
      { label: "Sell Pre-Built AI Agents" },
      { label: "Sell Pre-Built BI Pub Reports" },
    ],
  },
  {
    title: "Service BUYER Features",
    entries: [
      /* ⚠ WIRED — the public Work page. IT IS `/work`, and `/work` IS PUBLIC: the
         route swap of 2026-08-26 moved the signed-in provider feed out to
         `/find-work` and gave this URL to the buyer's marketing page. The href
         below is right and does not need to move again.

         ⚠⚠ SUPERSEDED 2026-08-26 (`P1-ALL-E017` CLOSED) — the dead claim, quoted:
           *"It is `/find-work` and NOT `/work`: `(app)/work` is the signed-in provider
            feed, which is why `P1-ALL-E017` stopped that rename. When it resolves,
            this href moves with it."*
         It resolved, and the href moved WITH the page rather than away from it — so
         the sentence read backwards against the code beneath it. Kept, not deleted. */
      { label: "Post Work for Free", href: "/work" },
      /* ⚠ WIRED — `/assess` is public and is the free front door. */
      { label: "Assess Processing Maturity for Free", href: "/assess" },
      { label: "Buy Pre-Built Demos, Reports & Agents" },
      { label: "Buy Pre-Project Consultations" },
      { label: "Buy Expert on Retainer" },
    ],
  },
  {
    title: "Panameer",
    entries: [
      { label: "About Us" },
      { label: "Contact Us" },
      /* ⚠ WIRED — `AIP Integration` is `/integrate`, renamed from `/enterprise`
         by `P1-ALL-E017`. */
      { label: "AIP Integration", href: "/integrate" },
      { label: "Why Panameer", href: "/why-panameer" },
      /*
        ⚠ PLAIN TEXT, AND THAT IS A CHANGE FROM THE OLD TABLE, WHICH POINTED
        `Pricing` AT `/talent#value`. `ValueStack` — the section that anchor
        targeted — MOVED TO `/` in WS1, so the fragment would now land on a page
        that no longer contains it. Same defect class as the dead
        `/optimize#spine-step-N` fragments, caught by grepping the anchor before
        shipping rather than after. There is still no approved price, so it becomes
        an honest TBD rather than a link to the wrong page.
      */
      { label: "Pricing" },
    ],
  },
  {
    /* ⚠ ALL FIVE PLAIN TEXT. `Services Punchout` is the closest to real — the
       section exists at `/integrate#punchout` — but Scott's label here names a
       PLATFORM SOLUTION, not that section, and pointing a solution name at a
       marketing anchor is the `E119` defect. Left as text. */
    title: "AI Platform Solutions",
    entries: [
      { label: "Processes-Specific Agent Suites" },
      { label: 'Services Procurement "Punchout"' },
      { label: "Dynamic Analytics (Data-Driven Reports)" },
      { label: "Assessment-Integrated Deployables" },
      { label: "AI Method-Based Provider Work Tracker" },
    ],
  },
];

/**
 * ⚠ `/assess`, NOT `/`. Two links on the site were labelled for the assessment
 * and neither reached it: the nav item "AI Assessment" and this one both went
 * to the home page. The nav item is gone, so this is the only one left — it had
 * better work (E119).
 *
 * ── ⚠ IT DID **NOT** MOVE TO `/optimize` WITH THE NAV ITEM (E266) ───────────
 *
 * `brief_optimize_page` WS4 says to check whether any footer entry points at
 * `/assess` and move it if one does. ⚠ NO ENTRY IN `FOOTER_GROUPS` DOES — this
 * one is a separate export, and repointing it would RE-BREAK E119 above: a link
 * labelled with the product name that lands on the page EXPLAINING the
 * assessment rather than on the assessment is the exact defect E119 fixed.
 *
 * ⚠ AND THIS IS NOT AN `E118` VIOLATION. That rule is one word per DESTINATION;
 * the header's `Optimize` and this `Optimization Assessment` are now two
 * different words for two different pages, which is what they should be.
 *
 * Reported rather than decided — if Scott wants the footer to reach the journey
 * page instead of the wizard, it is a one-line change here.
 */
export const FOOTER_ASSESSMENT: FooterEntry = {
  /* ⚠ ONE SOURCE — see `ASSESSMENT_PRODUCT` in `lib/brand.ts` (E274). */
  label: ASSESSMENT_PRODUCT,
  href: "/assess",
};

/**
 * LEGAL, SHARED TOO. The corpus is 23 documents; these are the four a person
 * actually accepts, plus the hub for the rest. `MarketingFooter` renders them as
 * a sixth column and `HomeFooter` as its bottom strip — same destinations, two
 * placements.
 */
export const FOOTER_LEGAL: FooterEntry[] = [
  { label: "Terms of Use", href: "/terms" },
  { label: "User Agreement", href: "/user-agreement" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/legal/cookie-policy" },
  { label: "All legal documents", href: "/legal" },
];

/**
 * ⚠ NO LONGER IN THE HEADER. Removed by Scott, 2026-08-15 (P1-J0.4-E002):
 * "I think we remove it and let people troll based on options. It is getting
 * too crowded in the main menu." A Buyer/Seller view toggle was considered as
 * an alternative and REJECTED — the answer is removal, not a smaller version of
 * the same thing. Do not restore it to the header as an oversight.
 *
 * ── WHY IT EXISTED, WHICH IS STILL WORTH KNOWING ─────────────────────────────
 *
 * It was the seller front door, kept out of the six and rendered apart from
 * them because it is a different KIND of link: the six are things to buy or
 * learn, this is "I am on the other side of the marketplace". Mixing it in made
 * the nav read as five buyer items and one odd one out, which is how "Find
 * Work" came to look like a buyer feature. The comment above `MARKETING_NAV`
 * still records that reasoning; it is history now, not a live rule.
 *
 * ── THE ROUTE IS STILL REACHABLE, AND THAT IS THE THING TO PROTECT ───────────
 *
 * `/work` IS A HEADER ITEM (labelled `Work`), so the door's original worry — a
 * seller page with no inbound link — no longer applies. It also keeps its footer
 * entries. ⚠ THE `href` ON THIS EXPORT IS `/work` AND IS CORRECT.
 *
 * ⚠⚠ SUPERSEDED 2026-08-26 (P1-ALL-E017 closed) — the dead claim, quoted:
 *   *"`/find-work` (renamed from `/for-providers`) is a HEADER ITEM again as of
 *    E029."*
 * ⚠ `/find-work` IS NOT A HEADER ITEM AND IS NOT PUBLIC. Since the route swap it
 * is the SIGNED-IN provider feed behind `guardPage("canProvideServices")`, reached
 * from the app RAIL, and it 307s to `/login` signed out. The public seller page
 * this export points at is `/work`.
 *
 * KEPT AS AN EXPORT deliberately. The label and href are the paper trail for a
 * decision that has now been made twice in opposite directions; deleting them
 * would leave nothing to read.
 */
export const MARKETING_PROVIDER_DOOR = {
  label: "For Experts",
  href: "/work",
};
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-[22px] py-3 " +
  "text-[15px] font-bold transition-colors cursor-pointer";

/**
 * Brand button. `magenta` = primary CTA, `ghost` = secondary outline,
 * `white` = a filled white control on a light surface.
 *
 * `white` exists for the public header's Log In (WS-0, 2026-08-13). It is NOT
 * `ghost` with a background bolted on via className: `ghost` sets
 * `bg-transparent`, and `bg-white` passed through className would tie with it
 * on specificity and be decided by whichever utility Tailwind happens to emit
 * later — a coin flip written as CSS. A variant settles it in one place.
 */
export function Btn({
  children,
  href,
  variant = "magenta",
  className = "",
  type,
}: {
  children: ReactNode;
  href?: string;
  variant?: "magenta" | "ghost" | "white";
  className?: string;
  type?: "button" | "submit";
}) {
  const tone =
    variant === "magenta"
      ? "bg-magenta text-white hover:bg-magenta-dark"
      : variant === "white"
        ? "border-[1.5px] border-line bg-white text-ink hover:border-[#d9d4e2] hover:bg-bg-soft"
        : "border-[1.5px] border-line text-ink hover:border-[#d9d4e2] bg-transparent";
  const cls = `${BASE} ${tone} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} className={cls}>
      {children}
    </button>
  );
}
