/** Shared progress meter — path, course and lesson pages all show the same one. */
export function ProgressBar({
  percent,
  label,
  tone = "magenta",
}: {
  percent: number;
  label?: string;
  tone?: "magenta" | "white";
}) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div>
      <div
        className={
          "h-2 w-full overflow-hidden rounded-full " +
          (tone === "white" ? "bg-white/20" : "bg-black/[0.07]")
        }
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
      >
        <div
          className={
            "h-full rounded-full transition-[width] " +
            (safe === 100 ? "bg-emerald-500" : "bg-magenta")
          }
          // A 0% bar renders as nothing at all, which reads as "broken" rather
          // than "not started"; a sliver says the meter is real and empty.
          style={{ width: `${Math.max(safe, safe > 0 ? 3 : 0)}%` }}
        />
      </div>
      {label && (
        <p
          className={
            "mt-1.5 text-[13px] " + (tone === "white" ? "text-white/75" : "text-ink-2")
          }
        >
          {safe}% — {label}
        </p>
      )}
    </div>
  );
}
