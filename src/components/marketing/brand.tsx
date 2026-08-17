import Link from "next/link";
import type { ReactNode } from "react";

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

  "FIND WORK" IS ITS OWN ITEM AGAIN, and its own page: /find-work, renamed from
  /for-providers so the label and the route say the same word. It was briefly a
  separate "For Experts" door rendered apart from the six (E002 removed that);
  it is now simply one of the four.

  PRICING IS NOT IN THE NAV. Price surfaces contextually, when a selection needs
  a plan, plus a passive link in the footer — which the footer already carries.
  Removed here rather than left as a seventh item: a nav "Pricing" invites a
  comparison before there is anything to compare.

  ONE DESTINATION IN THE NAV IS AN HONEST STUB. /buy-services (renamed from
  /services) renders ComingSoon behind the public header: a real route that says
  it is not built rather than faking a listing. /work-marketplace is the same
  kind of stub but is no longer in the nav — footer only, as TBD.
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
export const MARKETING_NAV: MarketingNavItem[] = [
  { label: "Learn", href: "/learn" },
  { label: "Find Work", href: "/find-work" },
  { label: "Hire Talent", href: "/hire-talent" },
  { label: "Buy Services", href: "/buy-services" },
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
 * ⚠ THE LABELS MATCH THE HEADER ON PURPOSE. Hire Talent · Find Work · Buy
 * Services · Learn. This table sits beside `MARKETING_NAV` so a re-word has to
 * pass both at once — the footer used to say "Buy Pre-Built Services" and
 * "Find Talent" for things the header called something else.
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
  label: string;
  /** Absent = not built. Renders as text + TBD, never as an anchor. */
  href?: string;
};

export const FOOTER_GROUPS: { title: string; entries: FooterEntry[] }[] = [
  {
    title: "Hire",
    entries: [
      { label: "Hire Talent", href: "/hire-talent" },
      { label: "Post a Work Request", href: "/join/buyer" },
    ],
  },
  {
    title: "Work",
    entries: [
      { label: "Find Work", href: "/find-work" },
      { label: "Become a Provider", href: "/join/provider" },
      /* The route exists and renders ComingSoon; the DESTINATION does not. */
      { label: "Work Marketplace" },
      /* Was `href="#"` — a link that went nowhere is worse than an honest TBD. */
      { label: "Coordinators" },
    ],
  },
  {
    title: "Learn",
    entries: [
      { label: "Learning Paths", href: "/learn" },
      { label: "Courses", href: "/learn/courses" },
      { label: "Categories", href: "/find-work#learn" },
    ],
  },
  {
    title: "Solutions",
    entries: [
      { label: "AI Agents" },
      /*
        ⚠ THE ONLY PUNCH-OUT ENTRY. "Enterprise" and "ERP Punchout" both pointed
        at this same anchor from two different columns; one destination with two
        names in one footer is how a reader concludes they are two things.
      */
      { label: "Services Punch-Out", href: "/hire-talent#punchout" },
      { label: "OTS Goods Contracts" },
      { label: "Analytics" },
    ],
  },
  {
    title: "Why & Commercial",
    entries: [
      /*
        ⚠ A PAGE NOW, NOT AN ANCHOR (brief_public_ia_block2 WS-7). It pointed at
        `/hire-talent#three-ways`, which sent a reader asking "why Panameer" to a
        hiring page and dropped them mid-way down it.

        `ThreeWays` STAYS on /hire-talent and #three-ways is still a valid
        anchor — this changes where the footer link points, it does not move a
        section.
      */
      { label: "Why Panameer", href: "/why-panameer" },
      /*
        An ANCHOR, not a page. There is no approved per-transaction figure, and a
        page headed "Pricing" with no price is a worse promise than a section.
      */
      { label: "Pricing", href: "/hire-talent#value" },
      /* Was a TBD with no href until /enterprise existed (WS-7). */
      { label: "Enterprise Integration", href: "/enterprise" },
    ],
  },
  {
    title: "Company",
    entries: [
      { label: "Contact Us" },
      { label: "About Us" },
      { label: "Careers" },
    ],
  },
];

/**
 * ⚠ `/assess`, NOT `/`. Two links on the site were labelled for the assessment
 * and neither reached it: the nav item "AI Assessment" and this one both went
 * to the home page. The nav item is gone, so this is the only one left — it had
 * better work (E119).
 */
export const FOOTER_ASSESSMENT: FooterEntry = {
  label: "AI Maturity Assessment",
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
 * `/find-work` (renamed from `/for-providers`) is a HEADER ITEM again as of
 * E029, so the door's original worry — a seller page with no inbound link — no
 * longer applies. It also keeps its footer entries.
 *
 * KEPT AS AN EXPORT deliberately. The label and href are the paper trail for a
 * decision that has now been made twice in opposite directions; deleting them
 * would leave nothing to read.
 */
export const MARKETING_PROVIDER_DOOR = {
  label: "For Experts",
  href: "/find-work",
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
