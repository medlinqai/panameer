import { Fragment, type ReactNode } from "react";

/**
 * Cross-document references inside legal prose (brief_user_agreement WS-C).
 *
 * THE DOCUMENTS CITE EACH OTHER AND THE CITATIONS WERE DEAD TEXT. The Terms of
 * Use tells you to "take a look at Section 7 of our User Agreement" and the
 * Privacy Policy defines its actors "as each is defined in the User Agreement" —
 * both pointing at a document that, until now, had no page. Scott's call was to
 * keep the references and make them work.
 *
 * A RENDER-TIME PASS, NOT MARKUP IN THE CONTENT. The generated content modules
 * hold plain strings, and adding inline link nodes to them would mean the
 * generator deciding what counts as a citation — a judgement that belongs next
 * to the routes, not next to the text parser. Here it is one table, and adding
 * a fourth document is one line.
 *
 * LONGEST PHRASE FIRST. "Section 7 of our User Agreement" has to win over the
 * bare "User Agreement" inside it, or the citation loses its anchor and lands
 * the reader at the top of a 20,000-word document instead of the clause the
 * sentence is actually about.
 */
const REFS: { phrase: string; href: string; doc: LegalDoc }[] = [
  { phrase: "Section 7 of our User Agreement", href: "/user-agreement#section-7", doc: "user-agreement" },
  { phrase: "Section 7 of the User Agreement", href: "/user-agreement#section-7", doc: "user-agreement" },
  { phrase: "User Agreement", href: "/user-agreement", doc: "user-agreement" },
  { phrase: "Privacy Policy", href: "/privacy", doc: "privacy" },
  { phrase: "Terms of Use", href: "/terms", doc: "terms" },
  /*
    Supplements the core documents cite by name. The Privacy Policy points at
    the Cookie Policy in prose ("please visit our Cookie Policy at …"), and the
    DPA is named from both directions; both now resolve.
  */
  { phrase: "Cookie Policy", href: "/legal/cookie-policy", doc: "cookie-policy" },
  {
    phrase: "Data Processing Agreement",
    href: "/legal/data-processing-agreement",
    doc: "data-processing-agreement",
  },
];

/**
 * Which document is being rendered, so it never links to itself.
 *
 * The core pages pass their own name; a supplement passes its SLUG, which is
 * why this is a plain string rather than a union of the three core documents —
 * the Cookie Policy page must not turn its own title into a link back to
 * itself, and there are nineteen supplements that could grow the same problem.
 */
export type LegalDoc = string | null;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Wrap every cross-document reference in `text` in a link.
 *
 * `self` is the document being rendered, and its own name is skipped: the
 * Privacy Policy says "this Privacy Policy" thirty times, and thirty links to
 * the page you are already on is noise that makes the real citations harder to
 * spot.
 */
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
