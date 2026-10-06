import Link from "next/link";
import { Eye, TrendingUp, BadgeCheck, BookOpen, FolderPlus, Users, Search, Tag, Send, MessageSquare, UserPlus, AlertTriangle } from "lucide-react";
import type { Viewer } from "@/lib/access";
import { fiveThings, type Thing } from "@/lib/five-things";
import { lifecycleForUser } from "@/lib/your-path";
import { LifecycleHelp } from "@/components/lifecycle/LifecycleHelp";
import { TurnOnButton, MoreCards } from "@/components/home/FiveThingsClient";

// Dashboard (mockup dashboard_five_things 2026-10-06): greeting + Your Path bar, 5 cards, "Waiting on you" tiles.
const ICON = { eye: Eye, chart: TrendingUp, badge: BadgeCheck, book: BookOpen, folder: FolderPlus, people: Users, search: Search, tag: Tag, send: Send, message: MessageSquare, person: UserPlus, alert: AlertTriangle };
const BTN = "inline-flex min-h-[40px] items-center justify-center bg-ink px-4 text-[13.5px] font-bold text-surface hover:bg-ink-hover";

function Card({ t, i }: { t: Thing; i: number }) {
  const I = ICON[t.icon];
  return (
    <div role="listitem" data-thing={t.key} className={"flex flex-col border bg-surface p-4 " + (i === 0 ? "border-2 border-ink" : "border-line")}>
      <span className="flex items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center bg-bg-soft text-ink"><I className="h-[18px] w-[18px]" aria-hidden /></span>
        <span className="text-[11px] font-bold text-ink-3">{i + 1}</span>
      </span>
      <b className="mt-2.5 block text-[15.5px] leading-snug">{t.title}</b>
      <span className="mt-1 block flex-1 text-[13px] text-ink-2">{t.line}</span>
      {(t.chips.length > 0 || t.time) && (
        <span className="mt-2.5 flex flex-wrap gap-1.5">
          {t.chips.map((c) => (
            <span key={c} className="bg-magenta/10 px-1.5 py-0.5 text-[11px] font-bold text-ink">{c}</span>
          ))}
          {t.time && <span className="border border-line px-1.5 py-0.5 text-[11px] text-ink-2">{t.time}</span>}
        </span>
      )}
      <span className="mt-3">
        {t.toggleVisibility ? <TurnOnButton className={`${BTN} w-full`} /> : <Link href={t.cta.href} className={`${BTN} w-full`}>{t.cta.label}</Link>}
      </span>
    </div>
  );
}

export async function FiveThings({ viewer, firstName }: { viewer: Viewer; firstName: string }) {
  const [{ things, waiting }, path] = await Promise.all([fiveThings(viewer), lifecycleForUser(viewer.userId)]);
  const next = path ? path.steps[path.current] : null;
  return (
    <section data-five-things className="mb-8 font-body text-ink">
      <h1 className="text-[26px] font-extrabold leading-tight sm:text-[30px]">Welcome back{firstName ? `, ${firstName}` : ""}.</h1>
      {path && (
        <div data-path-bar className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border border-line px-4 py-3">
          <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-ink-2">
            YOUR PATH{path.current < 7 ? ` · STEP ${path.current + 1} OF 7` : " · DONE"}
            <LifecycleHelp />
          </span>
          <span className="grid w-[140px] grid-cols-7 gap-1" aria-hidden>
            {path.done.map((d, i) => (
              <span key={i} className={"h-1.5 " + (d ? "bg-magenta" : i === path.current ? "bg-ink" : "bg-line")} />
            ))}
          </span>
          {next && (
            <span className="flex flex-1 items-center justify-between gap-3 text-[13.5px] max-sm:hidden">
              <span>Next: {next.next}</span>
              <Link href={next.href} className="font-bold text-magenta-dark underline underline-offset-2">Go</Link>
            </span>
          )}
        </div>
      )}

      <h2 className="mt-7 text-[17px] font-bold">
        5 things you can do today <span className="text-[12.5px] font-normal text-ink-3">most useful first</span>
      </h2>
      <div role="list" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {things.slice(0, 2).map((t, i) => <Card key={t.key} t={t} i={i} />)}
        <MoreCards count={things.length - 2}>
          {things.slice(2).map((t, i) => <Card key={t.key} t={t} i={i + 2} />)}
        </MoreCards>
      </div>

      <h2 className="mt-8 text-[17px] font-bold">Waiting on you</h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {waiting.map((w) => {
          const I = ICON[w.icon as keyof typeof ICON];
          return (
            <li key={w.key}>
              <Link href={w.href} data-waiting={w.key} className={"flex h-full items-center gap-3 border p-3 hover:bg-surface-hover " + (w.problem ? "border-[#b26b00]" : "border-line")}>
                <I className={"h-5 w-5 shrink-0 " + (w.problem ? "text-[#b26b00]" : "text-ink-2")} aria-hidden />
                <span className="min-w-0">
                  <b className={"block text-[18px] leading-tight " + (w.problem ? "text-[#b26b00]" : "")}>{w.value}</b>
                  <span className="block truncate text-[12px] text-ink-2">{w.label}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
