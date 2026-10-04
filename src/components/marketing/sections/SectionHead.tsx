import type { ReactNode } from "react";

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
          "mt-3.5 max-w-[660px] text-balance text-[18px] " +
            (tone === "dark" ? "text-[#c7c4de]" : "text-[#3a4266]")
          }
        >
          {lead}
        </p>
      )}
    </>
  );
}
