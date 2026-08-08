import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Primary marketing nav links (shared by header + mobile menu).
 *
 * E051 — ABSOLUTE PATHS, NOT BARE HASHES. Every one of these was `#learn`,
 * `#punchout` or `#pricing`, which worked while one page held every section.
 * The fork moved those sections onto /for-buyers and /for-providers, and a bare
 * hash is resolved against the CURRENT page — so on `/` these silently scrolled
 * nowhere, and the header is on every page, so the breakage was sitewide.
 *
 * Pointing them at `/path#anchor` fixes it in both directions: from `/` it
 * navigates to the right page and then to the section, and from an audience
 * page it still lands on the section it names.
 *
 * "Why Panameer" is the exception and stays a bare hash — that section renders
 * on all three pages, so the nearest one is always the right one.
 */
export const MARKETING_NAV: { label: string; href: string }[] = [
  { label: "Learn", href: "/for-providers#learn" },
  { label: "Hire Talent", href: "/for-buyers" },
  { label: "Find Work", href: "/for-providers" },
  { label: "Why Panameer", href: "#why" },
  { label: "Pricing", href: "/for-buyers#pricing" },
  { label: "Enterprise", href: "/for-buyers#punchout" },
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
