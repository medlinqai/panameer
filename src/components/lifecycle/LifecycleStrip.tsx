import { LIFECYCLE } from "@/lib/user-levels";

// Brand neutrals (Panameer brand guide): done = secondary, now = ink, ahead = borders/disabled.
const DONE = "#5C6485";
const AHEAD_RING = "#C9CDDC";
const AHEAD_NUM = "#8A90A8";
const TRACK = "#E8EAF1";

// The 7-step strip: numbered circles, ✓ when done, "You are here" on the current step.
export function LifecycleStrip({ current, intro = "you", hereLabel = "You are here" }: { current: number; intro?: "you" | "they" | false; hereLabel?: string }) {
  const n = Math.min(Math.max(current, 0), 7);
  const pct = n === 0 ? 0 : (Math.min(n, 6) / 6) * 100;
  return (
    <div data-lifecycle-strip>
      {intro && (
        <p className="mb-4 text-[14.5px] text-ink-2">
          There are <b className="text-ink">seven steps</b> from creating an account to getting paid.{" "}
          {n < 7 ? (
            <>
              {intro === "you" ? "You're" : "They're"} on <b className="text-ink">step {n + 1}</b>.
            </>
          ) : (
            <>Every step is done.</>
          )}
        </p>
      )}
      <ol className="relative grid grid-cols-1 gap-3 sm:grid-cols-7 sm:gap-0" aria-label="Lifecycle">
        <span aria-hidden className="absolute left-[7%] right-[7%] top-[21px] hidden h-[3px] sm:block" style={{ background: TRACK }} />
        <span aria-hidden className="absolute left-[7%] top-[21px] hidden h-[3px] sm:block" style={{ background: DONE, width: `${pct * 0.86}%` }} />
        {LIFECYCLE.map((s, i) => {
          const done = i < n;
          const here = i === n;
          return (
            <li key={s.key} data-step={i + 1} data-done={done || undefined} data-here={here || undefined} className="relative flex items-center gap-3 sm:block sm:text-center">
              <span
                className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-[16px] font-extrabold sm:mx-auto"
                style={
                  done
                    ? { background: DONE, color: "#fff", border: `3px solid ${DONE}` }
                    : here
                      ? { background: "var(--color-ink)", color: "#fff", border: "3px solid var(--color-ink)", boxShadow: "0 0 0 5px rgba(39,35,52,.12)" }
                      : { background: "#fff", color: AHEAD_NUM, border: `3px solid ${AHEAD_RING}` }
                }
              >
                {done ? "✓" : i + 1}
              </span>
              <span className="block">
                <b className={"block text-[13px] sm:mt-2 " + (done || here ? "text-ink" : "text-ink-2")}>{s.step}</b>
                <span className="block text-[10.5px] font-bold uppercase tracking-[0.08em]" style={{ color: done ? DONE : AHEAD_NUM }}>{s.status}</span>
                {here && <span className="mt-1.5 inline-block bg-magenta px-2 py-0.5 text-[10.5px] font-bold text-white">{hereLabel}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
