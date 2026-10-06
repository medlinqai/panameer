import Link from "next/link";

export type CtaVariant = "assessment" | "experts";

const CTA = {
  assessment: {
    href: `/login?callbackUrl=${encodeURIComponent("/#assessment")}`,
    label: "Start the free assessment",
  },
  experts: {
    href: "/talent",
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
          "inline-flex items-center gap-2 px-[26px] py-3 font-display text-[15px] font-bold transition-colors " +
          // The assessment is the primary action everywhere it appears, so it is
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
