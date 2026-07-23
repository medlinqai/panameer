import type { ReactNode } from "react";

type Tone = "neutral" | "green" | "amber" | "red" | "blue";

const TONES: Record<Tone, string> = {
  neutral:
    "border-black/10 bg-black/5 text-black/70 dark:border-white/15 dark:bg-white/10 dark:text-white/70",
  green:
    "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  amber:
    "border-amber-600/20 bg-amber-600/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
  red: "border-red-600/20 bg-red-600/10 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300",
  blue: "border-blue-600/20 bg-blue-600/10 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300",
};

/** A small status pill (profile approval, published state, etc.). */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium " +
        TONES[tone]
      }
    >
      {children}
    </span>
  );
}
