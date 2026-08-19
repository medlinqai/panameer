import type { ReactNode } from "react";

/**
 * One of the four tiles that float over the hero's fade.
 *
 * Four tones rather than a colour prop, so the set stays a set — the same reason
 * the section icons are a fixed map.
 */
const TONES = {
  flame: "bg-[linear-gradient(140deg,#ff7a2f,var(--color-learn-gold))]",
  magenta: "bg-[linear-gradient(140deg,var(--color-magenta),#8b1fa8)]",
  blue: "bg-[linear-gradient(140deg,var(--color-learn-blue),#2c3fa8)]",
  green: "bg-[linear-gradient(140deg,var(--color-learn-green),#0b7a46)]",
} as const;

export function StatTile({
  icon,
  tone,
  value,
  sub,
  label,
  note,
}: {
  icon: ReactNode;
  tone: keyof typeof TONES;
  value: string;
  /** The quiet `/ 522` half of a fraction. */
  sub?: string;
  label: string;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-brand border border-line bg-white p-4 shadow-[0_18px_40px_-22px_rgba(23,30,62,0.4)]">
      <span
        className={`${TONES[tone]} grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] text-white`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <b className="block font-display text-[21px] leading-tight">
          {value}
          {sub && <span className="text-[13px] font-normal text-ink-2"> {sub}</span>}
        </b>
        <span className="mt-0.5 block text-[11px] text-ink-2">
          {label}
          {note && (
            <>
              {" · "}
              <em className="font-semibold not-italic text-learn-green">{note}</em>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
