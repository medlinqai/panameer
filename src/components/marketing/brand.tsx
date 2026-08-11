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
  THE NAV FOLLOWS THE THREE-PAGE IA (brief_public_pages_ia WS-4).

  Three things were wrong once the pages were re-allocated, and all three were
  the same mistake — hrefs pointing at content that had moved:

    "Hire Talent" -> "/"            the home is the ASSESSMENT now, not hiring,
                                    so this both mislabelled the home and left
                                    Hire Talent unreachable from the nav
    "Pricing"     -> "/#value"      ValueStack moved to /hire-talent, so the
                                    anchor pointed at a section that is no
                                    longer on that page — a link that silently
                                    lands you at the top and looks like nothing
                                    happened
    "Enterprise"  -> "/#punchout"   same, for ErpPunchout

  A hash link to a section that has moved is the worst kind of broken: it
  returns 200, scrolls nowhere, and reads as an unresponsive page rather than
  as an error.

  "Assessment" leads because the home leads — it is the free thing, and the one
  a cold visitor can act on without deciding anything.
*/
export const MARKETING_NAV: { label: string; href: string }[] = [
  { label: "Assessment", href: "/" },
  { label: "Learn", href: "/learn" },
  { label: "Hire Talent", href: "/hire-talent" },
  { label: "Find Work", href: "/for-providers" },
  { label: "Pricing", href: "/hire-talent#value" },
  { label: "Enterprise", href: "/hire-talent#punchout" },
];
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
