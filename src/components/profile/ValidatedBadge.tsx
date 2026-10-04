export function ValidatedBadge({
  validatedAt,
  validatedBy,
}: {
  /** ISO date, or null when the row carries no answer date. */
  validatedAt: string | null;
  validatedBy: string | null;
}) {
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
