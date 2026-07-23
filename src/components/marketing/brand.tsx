import Link from "next/link";
import type { ReactNode } from "react";

/** Primary marketing nav links (shared by header + mobile menu). */
export const MARKETING_NAV: { label: string; href: string }[] = [
  { label: "Learn", href: "#learn" },
  { label: "Hire Talent", href: "#how" },
  { label: "Find Work", href: "#how" },
  { label: "Why Panameer", href: "#punchout" },
  { label: "Pricing", href: "#pricing" },
  { label: "Enterprise", href: "#punchout" },
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
