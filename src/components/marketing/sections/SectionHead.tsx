import type { ReactNode } from "react";

/**
 * Eyebrow / headline / lead, in the mockups' proportions.
 *
 * Every section on both pages opens with this trio, so it is one component
 * rather than eight copies of three elements — the shared marketing `Eyebrow`
 * and `H2` predate these pages and use the old scale (36px cap, 780px lead),
 * where the mockups want 36px headlines and a 640px lead on a 1120px grid.
 *
 * `tone="dark"` is for the two ink-backed sections, which invert the eyebrow to
 * pink and the headline to white rather than defining their own type.
 */
export function SectionHead({
  eyebrow,
  headline,
  lead,
  tone = "light",
}: {
  eyebrow: string;
  headline: ReactNode;
  lead?: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <>
      <p
        className={
          "mb-3 font-display text-[12px] font-semibold uppercase tracking-[0.16em] " +
          (tone === "dark" ? "text-[#f0a6ef]" : "text-magenta")
        }
      >
        {eyebrow}
      </p>
      <h2
        className={
          "text-[30px] font-semibold leading-[1.1] sm:text-[36px] " +
          (tone === "dark" ? "text-white" : "text-ink")
        }
      >
        {headline}
      </h2>
      {lead && (
        <p
          className={
            "mt-3.5 max-w-[660px] text-[18px] " +
            (tone === "dark" ? "text-[#c7c4de]" : "text-[#3a4266]")
          }
        >
          {lead}
        </p>
      )}
    </>
  );
}
