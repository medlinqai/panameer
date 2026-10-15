// Step rail: done ✓ · current underlined magenta · upcoming grey. Review sits after the steps, unnumbered.
// LS-E007: with `onPick`, done steps are buttons that jump back (no save, like Back).
export type RailStep = { key: string; label: string };

export function StepRail({ steps, current, review = true, onPick }: { steps: RailStep[]; current: number; review?: boolean; onPick?: (index: number) => void }) {
  const all = review ? [...steps, { key: "review", label: "Review" }] : steps;
  return (
    <nav data-step-rail aria-label="Steps" className="flex border-b border-line">
      {all.map((s, i) => {
        const state = i < current ? "done" : i === current ? "now" : "next";
        const isReview = review && i === all.length - 1;
        const Tag = onPick && state === "done" ? "button" : "div";
        return (
          <Tag
            key={s.key}
            {...(Tag === "button" ? { type: "button" as const, onClick: () => onPick!(i), "aria-label": `Back to ${s.label}` } : {})}
            data-rail-state={state}
            aria-current={state === "now" ? "step" : undefined}
            className={
              "-mb-px flex flex-1 items-center justify-center gap-1.5 border-b-2 pb-2.5 pt-3 text-[11px] font-semibold sm:justify-start sm:text-[13px] " +
              (state === "now" ? "border-magenta text-ink" : state === "done" ? "border-transparent text-ink" : "border-transparent text-[#a3a1b1]") +
              (Tag === "button" ? " cursor-pointer hover:text-magenta-dark focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink" : "")
            }
          >
            {state === "done" && <span aria-hidden className="text-[12px]">✓</span>}
            <span className={state === "now" ? "" : "hidden sm:inline"}>{s.label}</span>
            {state === "next" && <span aria-hidden className="sm:hidden">{isReview ? "Review" : i + 1}</span>}
          </Tag>
        );
      })}
    </nav>
  );
}
