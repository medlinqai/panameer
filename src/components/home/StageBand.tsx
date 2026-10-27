import { PathBand, type BandStep } from "@/components/hire/HireUI";
import type { AttentionItem } from "@/lib/attention";
import { countActions } from "@/lib/tile-actions";

// WA-E002: a flow's strip on its tile page — each step's count (ink) filters the list; "n Actions →" opens the Worklist for that step.
export type StageStep = { key: string; label: string; n: number; href: string; groups?: string[] };
export function StageBand({ steps, actions, label, current }: { steps: StageStep[]; actions: AttentionItem[]; label: string; current?: string }) {
  const lastBusy = Math.max(-1, ...steps.map((s, i) => (s.n ? i : -1)));
  const band: BandStep[] = steps.map((s, i) => {
    const a = s.groups?.length ? countActions(actions, `/worklist?group=${encodeURIComponent(s.groups.join(","))}`, (g) => s.groups!.includes(g.title ?? g.what)) : null;
    return {
      key: s.key, label: s.label, href: s.href,
      top: <span className={`text-[22px] font-extrabold ${s.n ? "text-ink" : "text-state-border"}`}>{s.n}</span>,
      bar: i <= lastBusy ? "done" : "todo", current: current ? s.key === current : i === lastBusy, muted: !s.n,
      actions: a ?? undefined,
    };
  });
  return <PathBand steps={band} label={label} />;
}
