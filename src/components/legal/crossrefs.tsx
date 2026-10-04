import { Fragment, type ReactNode } from "react";

const REFS: { phrase: string; href: string; doc: LegalDoc }[] = [
  { phrase: "Section 7 of our User Agreement", href: "/user-agreement#section-7", doc: "user-agreement" },
  { phrase: "Section 7 of the User Agreement", href: "/user-agreement#section-7", doc: "user-agreement" },
  { phrase: "User Agreement", href: "/user-agreement", doc: "user-agreement" },
  { phrase: "Privacy Policy", href: "/privacy", doc: "privacy" },
  { phrase: "Terms of Use", href: "/terms", doc: "terms" },
  { phrase: "Cookie Policy", href: "/legal/cookie-policy", doc: "cookie-policy" },
  {
    phrase: "Data Processing Agreement",
    href: "/legal/data-processing-agreement",
    doc: "data-processing-agreement",
  },
];

export type LegalDoc = string | null;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function linkifyLegal(text: string, self: LegalDoc): ReactNode {
  const active = REFS.filter((r) => r.doc !== self);
  if (active.length === 0) return text;

  const re = new RegExp(`(${active.map((r) => escape(r.phrase)).join("|")})`, "g");
  const parts = text.split(re);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    const ref = active.find((r) => r.phrase === part);
    if (!ref) return <Fragment key={i}>{part}</Fragment>;
    return (
      <a key={i} href={ref.href} className="font-semibold text-magenta hover:underline">
        {part}
      </a>
    );
  });
}
