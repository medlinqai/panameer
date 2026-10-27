import Link from "next/link";
import { Award, BookOpen, Briefcase, Calculator, Columns3, Eye, GraduationCap, ListChecks, MessagesSquare, Package, PenLine, PlayCircle, ReceiptText, Search, Send, ShoppingCart, Star, Tag, Trophy, UserPlus, Users, type LucideIcon } from "lucide-react";

// WK-E003: no second row of tabs — "← {App}" at the top, stage chips across a list, "Also in {App}" at the bottom.
export function AppCrumb({ app, href, page }: { app: string; href: string; page?: string }) {
  return (
    <p className="mb-3 text-[13px] font-semibold text-ink-2" data-app-crumb>
      <Link href={href} className="hover:text-ink">← {app}</Link>{page && <span className="text-ink-3"> › {page}</span>}
    </p>
  );
}

export function StageChips({ stages, current, base, param = "stage" }: { stages: [string, string, number | null][]; current: string; base: string; param?: string }) {
  const sep = base.includes("?") ? "&" : "?";
  return (
    <nav aria-label="Stages" className="mb-4 flex flex-wrap gap-1.5 text-[12.5px]" data-stage-chips>
      {stages.map(([k, l, n]) => (
        <Link key={k} href={k === "all" ? base : `${base}${sep}${param}=${encodeURIComponent(k)}`} aria-current={current === k ? "page" : undefined}
          className={current === k ? "rounded-full border border-ink bg-ink px-3 py-1 font-semibold text-surface" : "rounded-full border border-line px-3 py-1 font-semibold hover:border-ink"}>
          {l}{n != null && <span className="ml-1.5 tabular-nums opacity-70">{n}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function AlsoIn({ app, links }: { app: string; links: [string, string][] }) {
  return (
    <p className="mt-8 border-t border-line pt-4 text-[13px] text-ink-2" data-also-in>
      Also in {app}: {links.map(([l, h], i) => <span key={h}>{i > 0 && " · "}<Link href={h} className="font-semibold text-ink hover:underline">{l}</Link></span>)}
    </p>
  );
}

/** What You Can Do — WK-E009: monochrome icon tiles, 2–3 words, no descriptions; they fill their row. */
const COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4", 5: "grid-cols-3 sm:grid-cols-5", 6: "grid-cols-3 sm:grid-cols-6", 7: "grid-cols-3 sm:grid-cols-7", 8: "grid-cols-2 sm:grid-cols-4", 9: "grid-cols-3", 10: "grid-cols-2 sm:grid-cols-5", 11: "grid-cols-3 sm:grid-cols-6", 12: "grid-cols-3 sm:grid-cols-6" };
const ICON: Record<string, LucideIcon> = { search: Search, send: Send, tag: Tag, package: Package, award: Award, userPlus: UserPlus, users: Users, star: Star, group: MessagesSquare, trophy: Trophy, book: BookOpen, play: PlayCircle, teach: GraduationCap, pen: PenLine, eye: Eye, briefcase: Briefcase, compare: Columns3, list: ListChecks, cart: ShoppingCart, receipt: ReceiptText, calc: Calculator };
export type ActionCard = { label: string; href: string; icon: keyof typeof ICON; /** WA-E003: a variable card — something to do now (gold; red when overdue). */ count?: number; overdue?: boolean };
export function ActionCards({ cards }: { cards: ActionCard[] }) {
  return (
    <div className={`grid gap-3 ${COLS[cards.length] ?? "grid-cols-3"}`} data-action-cards>
      {cards.map((c) => { const I = ICON[c.icon] ?? Briefcase; return (
        <Link key={c.label} href={c.href} className={`relative flex flex-col items-center gap-2 rounded-[12px] border px-3 py-4 text-center text-ink hover:border-ink ${c.count ? (c.overdue ? "border-state-declined bg-state-declined-bg" : "border-state-pending bg-state-pending-bg") : "border-line bg-white"}`} data-action-card={c.label}>
          {c.count ? <span className={`absolute right-2 top-2 rounded-full px-1.5 text-[11px] font-bold text-surface ${c.overdue ? "bg-state-declined" : "bg-state-pending"}`} data-action-count>{c.count}</span> : null}
          <I className="h-6 w-6" strokeWidth={1.7} aria-hidden />
          <b className="text-[13.5px] leading-tight">{c.label}</b>
        </Link>
      ); })}
    </div>
  );
}

/** WK-E006: the bar that replaces an app's tab row — the app name on its home; "← {App} › {Page}" and "Also in {App}" inside. */
export function AppBar({ app, home, current, pages, right }: { app: string; home: string; current: string | null; pages: [string, string, string][]; right?: React.ReactNode }) {
  const here = pages.find(([k]) => k === current);
  const others = pages.filter(([k]) => k !== current);
  return (
    <div className="mx-auto mb-2 flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 border-b border-state-border px-4 py-3 sm:px-2" data-app-bar={app}>
      {here ? (
        <p className="text-[13px] font-semibold text-ink-2" data-app-crumb>
          <Link href={home} className="hover:text-ink">← {app}</Link><span className="text-ink-3"> › {here[1]}</span>
          <span className="ml-3 font-normal" data-also-in>Also in {app}: {others.map(([k, l, h], i) => <span key={k}>{i > 0 && " · "}<Link href={h} className="font-semibold text-ink hover:underline">{l}</Link></span>)}</span>
        </p>
      ) : <p className="text-[12px] font-extrabold tracking-[0.12em]">{app.toUpperCase()}</p>}
      {right}
    </div>
  );
}

/** NC-E003: one line under every home header — gold when there are actions, red Overdue when any is due within 24 h. */
export function ActionLine({ count }: { count: { n: number; overdue: number; href: string } | null }) {
  if (!count || !count.n) return null;
  return (
    <Link href={count.href} className="mt-2 inline-flex flex-wrap items-center gap-x-2 rounded-full bg-state-pending-bg px-3 py-1 text-[13.5px] font-bold text-state-pending hover:underline" data-action-line>
      {count.n} Action{count.n === 1 ? "" : "s"} Required
      {count.overdue > 0 && <span className="text-state-declined">· {count.overdue} Overdue</span>}
      <span className="text-ink">→ Open Worklist</span>
    </Link>
  );
}
