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

  "FIND WORK" WAS THE PROVIDER DOOR, and losing it would have made the public
  site buyer-only — so /for-providers keeps an explicit link ("For Experts",
  rendered apart from the six). The audience toggle on the marketing pages is
  the other route to it.

  PRICING IS NOT IN THE NAV. Price surfaces contextually, when a selection needs
  a plan, plus a passive link in the footer — which the footer already carries.
  Removed here rather than left as a seventh item: a nav "Pricing" invites a
  comparison before there is anything to compare.

  TWO DESTINATIONS ARE HONEST STUBS. /work-marketplace and /services render ComingSoon
  behind the public header. Both are real routes that say they are not built;
  neither fakes a listing, and neither doubles up on /hire-talent.
*/
export type MarketingNavItem = {
  label: string;
  href: string;
  /** Rendered as the magenta button rather than a text link. */
  primary?: boolean;
};

export const MARKETING_NAV: MarketingNavItem[] = [
  { label: "Assess", href: "/", primary: true },
  { label: "Talent", href: "/hire-talent" },
  { label: "Work", href: "/work-marketplace" },
  { label: "Packages", href: "/services" },
  { label: "Learn", href: "/learn" },
  { label: "Enterprise", href: "/hire-talent#punchout" },
];

/**
 * The seller front door, kept out of the six and rendered separately.
 *
 * It is a different KIND of link: the six are things to buy or learn, this is
 * "I am on the other side of the marketplace". Mixing it in made the nav read
 * as five buyer items and one odd one out, which is how "Find Work" came to
 * look like a buyer feature.
 */
export const MARKETING_PROVIDER_DOOR = {
  label: "For Experts",
  href: "/for-providers",
};
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-[22px] py-3 " +
  "text-[15px] font-bold transition-colors cursor-pointer";

/** Brand button. `magenta` = primary CTA, `ghost` = secondary outline. */
export function Btn({
  children,
  href,
  variant = "magenta",
  className = "",
  type,
}: {
  children: ReactNode;
  href?: string;
  variant?: "magenta" | "ghost";
  className?: string;
  type?: "button" | "submit";
}) {
  const tone =
    variant === "magenta"
      ? "bg-magenta text-white hover:bg-magenta-dark"
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
