
export type StepState = "current" | "done" | "upcoming" | "unavailable";

export function StepDisc({ n, state }: { n: number; state: StepState }) {
  return (
    <span
      aria-hidden
      className={
        "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[12px] font-bold " +
        (state === "current"
          ? "bg-magenta text-white"
          : state === "done"
            ? "bg-emerald-600 text-white"
            : state === "unavailable"
              ? 
                "bg-transparent text-ink-2 ring-1 ring-inset ring-line"
              : "bg-ink-2/12 text-ink-2")
      }
    >
      {}
      {state === "done" ? "✓" : state === "unavailable" ? "—" : n}
    </span>
  );
}

export function StepConnector() {
  return <span aria-hidden className="h-px w-3 shrink-0 bg-line sm:w-4" />;
}
