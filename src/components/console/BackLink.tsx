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
 *
 * ── ⚠⚠ IT DID NOT READ AS A CONTROL (`P1-A1.5-E486`) ────────────────────────
 *
 * > **SCOTT, 2026-09-13, side by side with Medlinq:** *"Back buttons...Medlinq
 * > does it better"*
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`): `text-[13px] ... text-ink-2`
 * rendering `‹ Users`.
 *
 * ⚠⚠ THE WORDING WAS THE BIGGEST OF THE THREE AND THE CHEAPEST TO FIX. `‹ Users`
 * is a noun and a chevron: the reader has to infer BOTH that it is a control and
 * that it goes back. `Back to Users` says both outright, which is what Medlinq's
 * `‹ Back to setup` does.
 *
 * ⚠⚠ AND IT IS COLOURED NOW — `--color-magenta-ink` (`#a61aa5`). `E433` reserves
 * magenta for INTERACTIVE things, and a back link is the most interactive thing
 * on a drill-in page. ⚠ THIS IS THE RULE BEING APPLIED, NOT BENT. It is the same
 * token the name links already use (`E443`), so the page keeps ONE link colour.
 *
 * ⚠ `label` IS THE DESTINATION, NOT THE SENTENCE. Callers pass `Users`; the
 * component writes `Back to Users`. A caller that cannot name a destination is a
 * drill-in that does not know where it came from — a finding, not a formatting
 * problem. ⚠ ALL THREE CALLERS NAME ONE.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      /* ⚠ ONE SIZE UP (13 → 14px) and room beneath before the title. */
      className="mb-1.5 inline-flex items-center gap-1 text-[14px] font-semibold text-magenta-ink transition-colors hover:text-magenta-ink-hover hover:underline"
    >
      <span aria-hidden>‹</span>
      Back to {label}
    </Link>
  );
}
