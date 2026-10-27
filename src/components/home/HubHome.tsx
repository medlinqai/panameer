import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { DashPies } from "@/components/dashboard/DashGlance";
import { BTN, BTN_MAGENTA } from "@/components/hire/HireUI";
import { singular } from "@/components/dashboard/MyProgress";
import { ActionCards, ActionLine, type ActionCard } from "@/components/home/AppNav";
import type { ActionCount } from "@/lib/todo";
import type { AttentionItem } from "@/lib/attention";
import type { Donut } from "@/lib/dashboard/types";

// HT-E007/E008: the Connect and Learn homes follow the dashboard — 1 · At a Glance beside Things You Need to Do, then section 2.
const NUM = "grid h-7 w-7 place-items-center rounded-full bg-ink text-[13px] font-bold text-surface";
export function HubHome({ eyebrow, title, summary, primary, secondary, donuts, viewSwitch, actionGroups, app, actionCount, strip, actions, section2, section2Title, section2Right }: {
  eyebrow: string; title: string; summary: string; primary: { label: string; href: string }; secondary: { label: string; href: string };
  donuts: Donut[]; viewSwitch?: ReactNode; /** NC-E004: Worklist groups for the tiles' action links, and the ?app= they open. */ actionGroups?: AttentionItem[]; app?: string; /** NC-E003: "n Actions Required → Open Worklist" replaces the Things You Need to Do panel. */ actionCount?: ActionCount | null; /** NC-E006 */ strip?: ReactNode;
  /** WK-E002: 2 · What You Can Do. */ actions?: ActionCard[]; section2?: ReactNode; section2Title?: string; section2Right?: ReactNode;
}) {
  const rankNo = actions?.length ? "3" : "2";
  return (
    <section className="mx-auto mb-10 w-full max-w-6xl font-body text-ink" data-app-home={eyebrow}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-bold tracking-[0.12em] text-magenta">{eyebrow}</p>
          <h1 className="mt-1 text-[28px] font-extrabold leading-tight sm:text-[32px]">{title}</h1>
          <p className="mt-1 text-[14px] text-ink-2">{summary}</p>
          <ActionLine count={actionCount ?? null} />
        </div>
        <div className="flex gap-2.5"><Link href={primary.href} className={BTN_MAGENTA}>{primary.label}</Link><Link href={secondary.href} className={BTN}>{secondary.label}</Link></div>
      </div>
      {strip}
      <div className="mt-6">
        <div className="flex flex-wrap items-baseline gap-3 border-b border-ink pb-2"><span className={NUM}>1</span><h2 className="text-[20px] font-extrabold">At a Glance</h2>{viewSwitch}</div>
        <div className="mt-3"><DashPies donuts={donuts} side="home" compact actions={actionGroups} app={app} /></div>
      </div>
      {actions?.length ? <>
        <div className="mt-8 flex items-baseline gap-3 border-b border-ink pb-2"><span className={NUM}>2</span><h2 className="text-[20px] font-extrabold">What You Can Do</h2></div>
        <div className="mt-4"><ActionCards cards={actions} /></div>
      </> : null}
      {section2 && <>
        <div className="mt-8 flex flex-wrap items-baseline gap-3 border-b border-ink pb-2"><span className={NUM}>{rankNo}</span><h2 className="text-[20px] font-extrabold">{section2Title}</h2><span className="ml-auto text-[13px] text-ink-2">{section2Right}</span></div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">{section2}</div>
      </>}
    </section>
  );
}

export type RankRow = { rank: number | null; name: string; photoUrl: string | null; line: string; value: string | number; me?: boolean };
/** Top 3 with the viewer's own row pinned under it. */
export function RankList({ eyebrow, title, rows, me }: { eyebrow: string; title: string; rows: RankRow[]; me: RankRow | null }) {
  const pinned = me && !rows.slice(0, 3).some((r) => r.me) ? me : null;
  const row = (r: RankRow) => (
    <li key={`${r.rank}-${r.name}`} className={`flex items-center gap-2.5 py-2 ${r.me ? "font-bold" : ""}`}>
      <span className="w-7 text-[12.5px] text-ink-3">#{r.rank ?? "—"}</span>
      <Avatar firstName={r.name.split(" ")[0]} lastName={r.name.split(" ").slice(1).join(" ")} photoUrl={r.photoUrl} size={28} />
      <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px]">{r.name}</span><span className="block truncate text-[12px] font-normal text-ink-3">{r.line}</span></span>
      <b className="tabular-nums text-[14px]">{r.value}</b>
    </li>
  );
  return (
    <div className="rounded-[12px] border border-line bg-white p-4" data-rank-list={title}>
      <p className="text-[10.5px] font-bold tracking-[0.12em] text-ink-3">{eyebrow}</p>
      <h3 className="text-[15px] font-extrabold">{title}</h3>
      <ul className="mt-1 divide-y divide-line">{rows.slice(0, 3).map(row)}{pinned && <li className="list-none border-t-2 border-ink" />}{pinned && row(pinned)}</ul>
    </div>
  );
}

/** You vs the group, one line per measure, plus the biggest gap in words. */
export function VsGroup({ title, rows }: { title: string; rows: [string, number, number][] }) {
  const gap = rows.map(([l, you, g]) => ({ l, d: g - you })).filter((x) => x.d > 0).sort((a, b) => b.d - a.d)[0];
  return (
    <div className="rounded-[12px] border border-line bg-white p-4" data-vs-group>
      <p className="text-[10.5px] font-bold tracking-[0.12em] text-ink-3">YOU VS THE GROUP</p>
      <h3 className="text-[15px] font-extrabold">{title}</h3>
      <div className="mt-2 grid grid-cols-[1fr_44px_44px] gap-x-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-3"><span /><span className="text-right">You</span><span className="text-right">Group</span></div>
      {rows.map(([l, you, g]) => <div key={l} className="mt-1 grid grid-cols-[1fr_44px_44px] gap-x-2 text-[13px]"><span className="text-ink-2">{l}</span><b className="text-right tabular-nums">{you}</b><em className="text-right not-italic tabular-nums text-ink-3">{g}</em></div>)}
      {gap && <p className="mt-2 text-[12.5px] text-state-pending">▼ {gap.d} {gap.d === 1 ? singular(gap.l) : gap.l} behind the group</p>}
    </div>
  );
}
