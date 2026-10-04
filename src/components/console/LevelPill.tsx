import type { UserLevel } from "@/lib/user-levels";

const TINT: Record<UserLevel, string> = {
  Registered: "bg-ink/[0.06] text-ink-2",
  Verified: "bg-amber-50 text-amber-800",
  User: "bg-emerald-50 text-emerald-800",
  Company: "bg-emerald-100 text-emerald-900",
  Payee: "bg-emerald-600 text-white",
};

const LABEL: Record<UserLevel, string> = {
  Registered: "Registered",
  Verified: "Verified",
  User: "L1 · User",
  Company: "L2 · Company",
  Payee: "L3 · Payee",
};

export function LevelPill({
  level,
  blocking = [],
}: {
  level: UserLevel;
  /** What is missing before the next level — named, never "incomplete". */
  blocking?: string[];
}) {
  return (
    <span
      title={blocking.length ? `Next: ${blocking.join(", ")}` : `Reached ${LABEL[level]}`}
      className={
        "inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold " +
        TINT[level]
      }
    >
      {LABEL[level]}
    </span>
  );
}
