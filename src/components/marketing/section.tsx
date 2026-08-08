import type { ReactNode } from "react";

/** Shared marketing typography bits, matching the mockup. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-magenta">
      {children}
    </p>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-[28px] font-extrabold tracking-[-0.8px] sm:text-[36px]">
      {children}
    </h2>
  );
}

/**
 * The section sub-head.
 *
 * E016.2 — WIDENED FROM 640px. The same premature-wrap complaint the hero got
 * applies here, and the HowItWorks descriptor is the one Scott named: "Experts
 * across the full enterprise stack — matched to exactly what you need done."
 * broke after "you" at 640px, turning one sentence into three lines with two
 * words on the last. 780px is still a readable measure (~85 characters) and
 * takes every current Lead on this page to two lines or fewer.
 */
export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mb-[34px] max-w-[780px] text-[18px] text-ink-2">{children}</p>
  );
}
