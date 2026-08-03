import type { ReactNode } from "react";

/**
 * A link to a legal document that DOES NOT DESTROY THE PAGE YOU'RE ON (E162).
 *
 * The signup form's Terms / User Agreement / Privacy links were ordinary
 * navigations. Reading the terms you are being asked to accept threw away
 * everything typed into the form, and browser-back returned an empty one —
 * so the safe, diligent user was punished and the fastest path through signup
 * was to not read the terms. That is the opposite of what a consent flow is for.
 *
 * A new tab rather than a modal, deliberately: these are documents people
 * legitimately want to keep open, scroll, print or save, and a modal makes all
 * four awkward. `rel="noopener noreferrer"` because `target="_blank"` without it
 * hands the opened page a handle on this one.
 *
 * Use this for EVERY legal link. The bug was one component doing it wrong while
 * the others happened to be on pages with nothing to lose.
 */
export function LegalLink({
  href,
  children,
  className = "font-semibold text-magenta hover:underline",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
