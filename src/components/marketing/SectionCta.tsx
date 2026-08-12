import Link from "next/link";

/**
 * THE TWO EXITS (brief_home_polish_method WS-2).
 *
 * Every section on the home ends in exactly one of two actions — start the
 * assessment, or meet the experts. No section is a dead end, and no section
 * offers a third choice.
 *
 * ── WHY THIS IS A COMPONENT AND NOT A CONVENTION ─────────────────────────────
 *
 * "Every section must end in one of two CTAs" is the kind of rule that holds
 * for exactly as long as somebody is checking. Making the variant a union of
 * two strings means a third exit cannot be added without editing this file and
 * seeing why it is a union — which is the moment to reconsider. The rule
 * enforces itself instead of being remembered.
 *
 * ── THE TWO, AND WHY THOSE TWO ───────────────────────────────────────────────
 *
 *   assessment  the goal. Free, no decision required, and it is the method
 *               demonstrated rather than described — which is the whole
 *               argument for a firm that sells its method.
 *   experts     the resourcing close. The home's job is to hand a warmed-up
 *               buyer to Hire Talent; a value block that ends on its own
 *               argument has warmed somebody up for nobody.
 *
 * A THIRD would be one of "book a call", "see pricing", "read the guide" — each
 * defensible on its own and collectively the reason funnel pages leak.
 */
export type CtaVariant = "assessment" | "experts";

const CTA = {
  assessment: {
    href: `/login?callbackUrl=${encodeURIComponent("/#assessment")}`,
    label: "Start the free assessment",
  },
  experts: {
    href: "/hire-talent",
    label: "Meet our experts",
  },
} as const;

export function SectionCta({
  variant,
  /** An optional sentence above the link — the section's own hand-off line. */
  lead,
  className = "",
}: {
  variant: CtaVariant;
  lead?: string;
  className?: string;
}) {
  const cta = CTA[variant];

  return (
    <div className={"mt-8 " + className}>
      {lead && (
        <p className="mb-3 max-w-[640px] text-[17px] font-semibold text-ink">
          {lead}
        </p>
      )}
      <Link
        href={cta.href}
        className={
          "inline-flex items-center gap-2 rounded-full px-[26px] py-3 font-display text-[15px] font-bold transition-colors " +
          /*
            The assessment is the primary action everywhere it appears, so it is
            always the filled button and "meet our experts" is always the
            outline. Consistent weighting across the page means a reader learns
            the hierarchy once rather than re-reading it per section.
          */
          (variant === "assessment"
            ? "bg-magenta text-white shadow-[0_12px_28px_rgba(215,44,214,0.25)] hover:bg-magenta-dark"
            : "border-[1.5px] border-line text-ink hover:border-magenta hover:text-magenta")
        }
      >
        {cta.label}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
