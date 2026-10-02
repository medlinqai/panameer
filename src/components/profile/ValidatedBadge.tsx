/**
 * ── ⚠⚠⚠ THE VALIDATED BADGE (`P2-A1.1-E748`, lane 3 WS-C) ──────────────────
 *
 * ⚠ **SCOTT, 2026-10-01: *"a small ✓ Validated badge beside each validated
 * employer and project, on the owner view, the visitor view, and the masked
 * public preview (the badge shows; who validated doesn't)."***
 *
 * ⚠⚠ **"VALIDATED", NEVER "VERIFIED"** — locked in `decisions-01` and restated
 * at the top of the brief. The two words are different promises: Panameer
 * *verifies* an identity itself; a *validation* is somebody else's statement
 * about work, and the badge must not borrow the authority of the other one.
 *
 * ⚠⚠⚠ **IT NAMES NOBODY.** The tooltip says *"Validated by a contact at
 * <domain>"* or *"by a Panameer colleague"* — never a person. The contact
 * answered a favour in one click; publishing their name would be a cost they
 * never agreed to, and it is the thing that would stop the next one answering.
 *
 * ⚠ **SQUARE, QUIET, INK WITH THE ACCENT TICK** — the brief: *"no pill, no
 * colour block."* ⚠⚠ It is a FACT, not a link, so it is ink and not magenta
 * (`E433`), and it is not a button.
 */
export function ValidatedBadge({
  validatedAt,
  validatedBy,
}: {
  /** ISO date, or null when the row carries no answer date. */
  validatedAt: string | null;
  /** A DOMAIN, the literal `"colleague"`, or null. ⚠ Never a person's name. */
  validatedBy: string | null;
}) {
  /*
    ⚠⚠ THE TOOLTIP DEGRADES RATHER THAN INVENTING. A row with no date and no
    source still gets the badge — the validation happened — and simply says less.
    ⚠⚠⚠ A fabricated date beside a real tick would be the worse failure: it
    would make the one trustworthy thing on the card untrustworthy.
  */
  const who =
    validatedBy === "colleague"
      ? "by a Panameer colleague"
      : validatedBy
        ? `by a contact at ${validatedBy}`
        : null;
  const when = validatedAt
    ? new Date(validatedAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;
  const title = ["Validated", who, when ? `on ${when}` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      title={title}
      className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-[3px] border border-line px-1.5 py-[1px] align-middle text-[11px] font-semibold text-ink-2"
    >
      {/* ⚠ The tick is the one accent; `aria-hidden` because the word beside it
          already says what it means. */}
      <span aria-hidden className="text-magenta">
        ✓
      </span>
      Validated
    </span>
  );
}

/**
 * ⚠⚠ OWNER-ONLY. The brief: *"Pending shows only to the owner: 'Validation
 * requested <date>'."*
 * ⚠⚠⚠ **A VISITOR MUST NEVER SEE THIS.** It says somebody was asked and has not
 * answered — which is nobody's business and reads as a doubt about the member
 * rather than as a queue.
 */
export function ValidationPending({ since }: { since?: string | null }) {
  const when = since
    ? new Date(since).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;
  return (
    <span className="ml-2 inline-flex shrink-0 items-center rounded-[3px] border border-dashed border-line px-1.5 py-[1px] align-middle text-[11px] font-medium text-ink-3">
      {when ? `Validation requested ${when}` : "Validation requested"}
    </span>
  );
}
