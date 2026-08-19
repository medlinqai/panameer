import { ShotCard, Check } from "@/components/learn/public/shared";

/**
 * SECTION 1 — a path is a sequence, so the graphic is a sequence with a state per step.
 *
 * ⚠ THE FOURTH ROW SHOWS ITS NUMBER, THE FIRST TWO SHOW A CHECK, THE THIRD A RING. Three
 * states, three glyphs — a single style with only colour varying would make "in progress" and
 * "next" indistinguishable to anyone who cannot separate a magenta ring from a grey disc.
 */
const STEPS = [
  { title: "Procure-to-Pay foundations", meta: "6 lessons · 2h", state: "done", label: "Done" },
  { title: "Oracle Fusion Self-Service Procurement", meta: "9 lessons · 3h", state: "done", label: "Done" },
  { title: "Contract & supplier lifecycle", meta: "7 lessons · 2.5h", state: "now", label: "In progress" },
  { title: "AI agents in P2P", meta: "5 lessons · 2h", state: "next", label: "Next" },
] as const;

export function PathProgressShot() {
  return (
    <ShotCard>
      <ul className="m-0 list-none p-0">
        {STEPS.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[30px_1fr_auto] items-center gap-3 py-3">
            {s.state === "done" ? (
              <span aria-hidden className="grid h-[26px] w-[26px] place-items-center rounded-full bg-magenta text-white">
                <Check />
              </span>
            ) : s.state === "now" ? (
              <span aria-hidden className="h-[26px] w-[26px] rounded-full border-[2.5px] border-magenta" />
            ) : (
              <span aria-hidden className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#e6e9ef] font-display text-[11.5px] font-bold leading-none text-[#7b8496]">
                {i + 1}
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold leading-[1.3] text-ink">{s.title}</span>
              <span className="mt-[2px] block text-[11px] text-ink-2">{s.meta}</span>
            </span>
            <span
              className={
                "whitespace-nowrap text-[11px] font-semibold " +
                (s.state === "done" ? "text-[#137a51]" : s.state === "now" ? "text-magenta-dark" : "text-ink-2")
              }
            >
              {s.label}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-line pt-4">
        <div aria-hidden className="h-[6px] overflow-hidden rounded-full bg-[#eef0f6]">
          <span className="block h-full rounded-full bg-magenta" style={{ width: "58%" }} />
        </div>
        <p className="mt-2.5 text-[11.5px] text-ink-2">
          58% complete · certificate at the end of the path
        </p>
      </div>
    </ShotCard>
  );
}
