import { LIFECYCLE, LIFECYCLE_RULES, LIFECYCLE_WHO } from "@/lib/user-levels";

// The lifecycle graphic (mockup A): 7 steps in three lanes, their statuses, the gates and the three rules.
export function LifecycleGraphic({ current, done, compact = false }: { current?: number; done?: boolean[]; compact?: boolean }) {
  const lanes: [keyof typeof LIFECYCLE_WHO, number][] = [["you", 3], ["company", 2], ["both", 2]];
  return (
    <div data-lifecycle-graphic>
      <div className="hidden md:grid md:grid-cols-7" aria-hidden>
        {lanes.map(([who, span]) => (
          <span key={who} style={{ gridColumn: `span ${span}`, background: LIFECYCLE_WHO[who].bg, color: LIFECYCLE_WHO[who].fg }} className="px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em]">
            {LIFECYCLE_WHO[who].label}
          </span>
        ))}
      </div>
      <ol className="grid grid-cols-1 gap-2 md:grid-cols-7 md:gap-0">
        {LIFECYCLE.map((s, i) => {
          const isDone = done?.[i];
          const here = current === i;
          return (
            <li
              key={s.key}
              data-lifecycle-step={i + 1}
              data-done={isDone || undefined}
              data-here={here || undefined}
              className={"border border-line p-3 md:border-l-0 md:first:border-l " + (s.gate ? "border-t-2 border-t-ink" : "") + (here ? " outline outline-2 -outline-offset-2 outline-magenta" : "")}
              style={{ background: compact ? undefined : `linear-gradient(${LIFECYCLE_WHO[s.who].bg} 0 6px, transparent 6px)` }}
            >
              <span className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.1em] text-ink-3">
                <span className={"grid h-5 w-5 place-items-center text-[11px] " + (isDone ? "bg-ink text-surface" : "border border-ink text-ink")}>{isDone ? "✓" : i + 1}</span>
                STEP {i + 1}
                {s.gate && <span className="border border-ink px-1 text-[9.5px] text-ink">GATE</span>}
              </span>
              <b className="mt-1.5 block text-[14px] leading-snug">{s.step}</b>
              {!compact && <span className="mt-1 block text-[12.5px] text-ink-2">{s.desc}</span>}
              <span className="mt-1.5 inline-block border border-current px-1.5 text-[10.5px] font-bold" style={{ color: LIFECYCLE_WHO[s.who].fg }}>{s.status}</span>
              {!compact && s.unlocks && <span className="mt-1 block text-[11.5px] text-ink-3">Unlocks {s.unlocks}</span>}
              {here && <span className="mt-1.5 block text-[11px] font-bold tracking-[0.06em] text-magenta-dark">YOU ARE HERE</span>}
            </li>
          );
        })}
      </ol>
      {!compact && (
        <>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
            {(Object.keys(LIFECYCLE_WHO) as (keyof typeof LIFECYCLE_WHO)[]).map((w) => (
              <li key={w} className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-2.5 w-2.5" style={{ background: LIFECYCLE_WHO[w].bg, border: `1px solid ${LIFECYCLE_WHO[w].fg}` }} />
                {w === "you" ? "You do it" : w === "company" ? "Your company's admin does it" : "Both companies"}
              </li>
            ))}
            <li>GATE = you can&apos;t go past it without this</li>
          </ul>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {LIFECYCLE_RULES.map((r) => (
              <div key={r.title} className="border-t border-line pt-2">
                <b className="block text-[13.5px]">{r.title}</b>
                <span className="text-[12.5px] text-ink-2">{r.body}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
