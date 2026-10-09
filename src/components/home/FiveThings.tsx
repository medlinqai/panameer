import Link from "next/link";
import { Lock, Eye, TrendingUp, BadgeCheck, BookOpen, FolderPlus, Users, Search, Tag, Send, MessageSquare, UserPlus, AlertTriangle } from "lucide-react";
import type { Viewer } from "@/lib/access";
import { fiveThings, type Thing } from "@/lib/five-things";
import { lifecycleForUser } from "@/lib/your-path";
import { LifecycleHelp } from "@/components/lifecycle/LifecycleHelp";
import { RoadGraphic } from "@/components/lifecycle/RoadGraphic";
import { RoadStepper } from "@/components/lifecycle/RoadStepper";
import { TurnOnButton, MoreCards } from "@/components/home/FiveThingsClient";
import { CoverBand } from "@/components/casing/CoverBand";

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

export async function FiveThings({ viewer, firstName, firstVisit = false }: { viewer: Viewer; firstName: string; firstVisit?: boolean }) {
  const [{ things, waiting, hasCompany }, path] = await Promise.all([fiveThings(viewer), lifecycleForUser(viewer.userId)]);
  const next = path ? path.steps[path.current] : null;
  // While on the road (before Validate Company), the cards become one question with four directions.
  const onRoad = !!path && path.steps.length === 9 && path.current < 6;
  const choices = [
    { key: "learn", code: "LRN", tone: ["#272334", "#4b3e6e"] as [string, string], title: "Learn", line: "Free courses and certification tests.", cta: "Start Learning", href: "/learn" },
    { key: "connect", code: "CON", tone: ["#272334", "#6b2f6a"] as [string, string], title: "Connect", line: "Find colleagues and mentors.", cta: "Find People", href: "/connect/community" },
    { key: "services", code: "SVC", tone: ["#1d2a3a", "#36506e"] as [string, string], title: "Sell My Services", line: "Browse open work and get invited to propose.", cta: "Browse Work", href: "/find-work", needsCompany: true },
    { key: "products", code: "PRD", tone: ["#1f2b28", "#3e5f55"] as [string, string], title: "Sell Service Products", line: "List a fixed-price package buyers can order.", cta: "List a Service", href: "/my-services", needsCompany: true },
  ];
  return (
    <section data-five-things className="mb-8 font-body text-ink">
      <h1 className="text-[26px] font-extrabold leading-tight sm:text-[30px]">{firstVisit ? "Welcome" : "Welcome back"}{firstName ? `, ${firstName}` : ""}.</h1>
      {path && path.steps.length === 9 && path.current < 6 && (
        <div data-path-road className="mt-4 border border-line bg-surface px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-[17px] font-bold">How Panameer works <LifecycleHelp /></h2>
            <span className="text-[11px] font-bold tracking-[0.1em] text-ink-2">STEP {path.current + 1} OF {path.steps.length}</span>
          </div>
          <div className="mt-3 hidden overflow-x-auto sm:block"><div className="min-w-[640px]"><RoadGraphic current={path.current} /></div></div>
          <div className="mt-4 sm:hidden"><RoadStepper current={path.current} /></div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[13.5px]">
            <span className="text-ink-2">Connect and Learn are open now. Add your company when you&apos;re ready to sell.</span>
            {next && <Link href={next.href} className={BTN}>Next: {next.next} →</Link>}
          </div>
        </div>
      )}
      {path && !(path.steps.length === 9 && path.current < 6) && (
        <div data-path-bar className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border border-line px-4 py-3">
          <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-ink-2">
            YOUR PATH{path.current < path.steps.length ? ` · STEP ${path.current + 1} OF ${path.steps.length}` : " · DONE"}
            <LifecycleHelp />
          </span>
          <span className={"grid w-[140px] gap-1 " + (path.steps.length === 9 ? "grid-cols-9" : "grid-cols-7")} aria-hidden>
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

      {onRoad ? (
        <>
          <h2 className="mt-7 text-[17px] font-bold">What do you want to do{firstVisit ? " first" : ""}?</h2>
          <div role="list" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {choices.map((c) => {
              const locked = "needsCompany" in c && c.needsCompany && !hasCompany;
              return locked ? (
                <div key={c.key} role="listitem" data-choice={c.key} data-locked className="flex flex-col border border-dashed border-line bg-bg-soft">
                  <CoverBand code={c.code} tone={c.tone} className="h-[84px] opacity-45 grayscale">
                    <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" aria-hidden /> After Step 4</span>
                  </CoverBand>
                  <span className="flex flex-1 flex-col p-5 pt-3">
                  <b className="block text-[18px] leading-snug text-ink-3">{c.title}</b>
                  <span className="mt-1 block flex-1 text-[13.5px] text-ink-3">{c.line}</span>
                  <span className="mt-3 block text-[13px] font-bold text-ink">Add your company first.</span>
                  <Link href="/company?join=1#join" className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center border border-ink px-4 text-[13.5px] font-bold text-ink hover:bg-surface-hover">Add Company →</Link>
                  </span>
                </div>
              ) : (
                <Link key={c.key} role="listitem" href={c.href} data-choice={c.key} className="group flex flex-col border border-line bg-surface hover:border-ink">
                  <CoverBand code={c.code} tone={c.tone} className="h-[84px]" />
                  <span className="flex flex-1 flex-col p-5 pt-3">
                    <b className="block text-[18px] leading-snug">{c.title}</b>
                    <span className="mt-1 block flex-1 text-[13.5px] text-ink-2">{c.line}</span>
                    <span className={`${BTN} mt-4 w-full`}>{c.cta} →</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <>
      <h2 className="mt-7 text-[17px] font-bold">
          5 things you can do today <span className="text-[12.5px] font-normal text-ink-3">most useful first</span>
        </h2>
        <div role="list" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {things.slice(0, 2).map((t, i) => <Card key={t.key} t={t} i={i} />)}
          <MoreCards count={things.length - 2}>
            {things.slice(2).map((t, i) => <Card key={t.key} t={t} i={i + 2} />)}
          </MoreCards>
        </div>
        </>
      )}

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
