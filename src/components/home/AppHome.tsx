import Link from "next/link";
import type { StripStep } from "@/lib/live-work";

// RA-E004/E006: shared bits of an app home (Leaders layout) — the strip as the hero picture, red counts.
export const Red = ({ n }: { n: number }) => (n > 0 ? <span className="ml-1.5 inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-state-declined px-1 text-[11px] font-extrabold text-white" data-red-count>{n}</span> : null);
export const RedDot = () => <span aria-label="Needs action" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-state-declined" data-red-dot />;

/** The process strip stacked as the hero picture; each step links to the filtered list. */
export function StripColumn({ steps, href }: { steps: StripStep[]; href: (key: string) => string }) {
  return (
    <ol className="grid gap-1.5" data-strip-column>
      {steps.map((s, i) => (
        <li key={s.key}>
          <Link href={href(s.key)} className={s.count ? "flex items-center gap-3 rounded-[10px] border border-ink/80 bg-white px-3 py-2 hover:border-magenta" : "flex items-center gap-3 rounded-[10px] border border-line bg-white px-3 py-2 hover:border-magenta"} data-strip-step={s.key}>
            <span className={s.count ? "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-bold text-white" : "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[#C9CDDC] text-[12px] font-bold text-ink-3"}>{i + 1}</span>
            <span className={s.count ? "min-w-0 flex-1 text-[13.5px] font-bold" : "min-w-0 flex-1 text-[13.5px] font-semibold text-ink-3"}>{s.label}</span>
            <b className={s.count ? "text-[18px] tabular-nums text-magenta-dark" : "text-[18px] tabular-nums text-[#C9CDDC]"}>{s.count}</b>
          </Link>
        </li>
      ))}
    </ol>
  );
}
