import Link from "next/link";
import type { ReactNode } from "react";
import { ASSESSMENT_PRODUCT } from "@/lib/brand";

export type MarketingNavItem = {
  label: string;
  href: string;
  primary?: boolean;
};

export const MARKETING_NAV: MarketingNavItem[] = [
  { label: "Training", href: "/training" },
  { label: "Talent", href: "/talent" },
  { label: "Work", href: "/work" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Optimize", href: "/optimize" },
  { label: "Integrate", href: "/integrate" },
];

export type FooterEntry = {
  external?: boolean;
  label: string;
  /** Absent = not built. Renders as text + TBD, never as an anchor. */
  href?: string;
};

export const FOOTER_GROUPS: { title: string; entries: FooterEntry[] }[] = [
  {
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
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/company/panameer/",
        external: true,
      },
      { label: "X", href: "https://x.com/onpanameer", external: true },
      { label: "WhatsApp" },
    ],
  },
  {
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
      { label: "Post Work for Free", href: "/work" },
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
      { label: "AIP Integration", href: "/integrate" },
      { label: "Why Panameer", href: "/why-panameer" },
      { label: "Pricing" },
    ],
  },
  {
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

export const FOOTER_ASSESSMENT: FooterEntry = {
  label: ASSESSMENT_PRODUCT,
  href: "/assess",
};

export const FOOTER_LEGAL: FooterEntry[] = [
  { label: "What we check", href: "/trust" },
  { label: "Terms of Use", href: "/terms" },
  { label: "User Agreement", href: "/user-agreement" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/legal/cookie-policy" },
  { label: "Glossary", href: "/glossary" },
  { label: "All legal documents", href: "/legal" },
];

export const MARKETING_PROVIDER_DOOR = {
  label: "For Experts",
  href: "/work",
};
const BASE =
  "inline-flex items-center justify-center gap-2 px-[22px] py-3 " +
  "text-[15px] font-bold transition-colors cursor-pointer";

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
