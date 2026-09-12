import Link from "next/link";

/**
 * THE UPPER-LEFT BACK LINK (`P1-A1.5-E460`).
 *
 * **SCOTT, on the Medlinq reference:** *"notice that the sub page has a header in
 * the upper left that allows the user to go back to the prior page."*
 *
 * ⚠ ONE COMPONENT, TWO CALLERS BY DESIGN. `E460`'s user page uses it now and
 * `E455`'s tile drill-ins use it next; the brief asks for the same component in
 * both *"or they will diverge"*. It sits ABOVE the page title, small and muted,
 * so it reads as a way back rather than as a second heading.
 *
 * ⚠ IT IS A REAL `<Link>`, not `router.back()`. Browser history is whatever the
 * person did last — arriving from a bookmark or a refresh would send them
 * somewhere unrelated — while this always means the list this row came from.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-2 transition-colors hover:text-magenta"
    >
      <span aria-hidden>‹</span>
      {label}
    </Link>
  );
}
