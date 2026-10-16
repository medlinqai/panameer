import { BUYER_ROAD, BUYER_ROAD_TITLE, ROAD_TITLE } from "@/lib/user-levels";
import { BuyerThings } from "@/components/home/BuyerThings";
import { prisma } from "@/lib/prisma";
import { sellerRegistration } from "@/lib/seller-registration";
import { menuFor } from "@/lib/menu-hint";
import { MenuClause } from "@/components/home/MenuChip";
import Link from "next/link";
import { Eye, TrendingUp, BadgeCheck, BookOpen, FolderPlus, Users, Search, Tag, Send, MessageSquare, UserPlus, AlertTriangle } from "lucide-react";
import type { Viewer } from "@/lib/access";
import { fiveThings, type Thing } from "@/lib/five-things";
import { lifecycleForUser } from "@/lib/your-path";
import { LifecycleHelp } from "@/components/lifecycle/LifecycleHelp";
import { RoadGraphic } from "@/components/lifecycle/RoadGraphic";
import { RoadStepper } from "@/components/lifecycle/RoadStepper";
import { TurnOnButton, MoreCards } from "@/components/home/FiveThingsClient";

// Dashboard (mockup dashboard_five_things 2026-10-06): greeting + Your Path bar, 5 cards, "Waiting on you" tiles.
const ICON = { eye: Eye, chart: TrendingUp, badge: BadgeCheck, book: BookOpen, folder: FolderPlus, people: Users, search: Search, tag: Tag, send: Send, message: MessageSquare, person: UserPlus, alert: AlertTriangle };
const BTN = "inline-flex min-h-[40px] items-center justify-center bg-ink px-4 text-[13.5px] font-bold text-surface hover:bg-ink-hover";

function Card({ t, i }: { t: Thing; i: number }) {
  const I = ICON[t.icon];
  // DC-E002/E003: name where it lives in the menu; the button says "Go to {menu}".
  const hint = menuFor(t.cta.href, "seller");
  return (
    <div role="listitem" data-thing={t.key} className={"flex flex-col border bg-surface p-4 " + (i === 0 ? "border-2 border-ink" : "border-line")}>
      <span className="flex items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center bg-bg-soft text-ink"><I className="h-[18px] w-[18px]" aria-hidden /></span>
        <span className="text-[11px] font-bold text-ink-3">{i + 1}</span>
      </span>
      <b className="mt-2.5 block text-[15.5px] leading-snug">{t.title}</b>
      <span className="mt-1 block flex-1 text-[13px] text-ink-2">{t.line}<MenuClause hint={hint} /></span>
      {(t.chips.length > 0 || t.time) && (
        <span className="mt-2.5 flex flex-wrap gap-1.5">
          {t.chips.map((c) => (
            <span key={c} className="bg-magenta/10 px-1.5 py-0.5 text-[11px] font-bold text-ink">{c}</span>
          ))}
          {t.time && <span className="border border-line px-1.5 py-0.5 text-[11px] text-ink-2">{t.time}</span>}
        </span>
      )}
      <span className="mt-3">
        {t.toggleVisibility ? <TurnOnButton className={`${BTN} w-full`} /> : <Link href={t.cta.href} className={`${BTN} w-full`}>{hint ? `Go to ${hint.label}` : t.cta.label}</Link>}
      </span>
    </div>
  );
}

export async function FiveThings({ viewer, firstName, firstVisit = false }: { viewer: Viewer; firstName: string; firstVisit?: boolean }) {
  const path = await lifecycleForUser(viewer.userId);
  // BD-E002/E005: a buyer's dashboard = greeting · their road · the five cards. Nothing else.
  if (path?.road === "buyer") {
    return (
      <section data-five-things data-buyer-dashboard className="mb-8 font-body text-ink">
        <h1 className="text-[28px] font-extrabold leading-tight sm:text-[32px]">Welcome{firstName ? `, ${firstName}` : ""}.</h1>
        <div data-path-road className="mt-5 rounded-[14px] border border-line bg-surface px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-[17px] font-bold">{BUYER_ROAD_TITLE} <LifecycleHelp /></h2>
            <span className="text-[11px] font-bold tracking-[0.1em] text-ink-2">STEP {path.current + 1} OF {path.steps.length}</span>
          </div>
          <div className="mt-2 hidden overflow-x-auto sm:block"><div className="min-w-[560px]"><RoadGraphic current={path.current} road={BUYER_ROAD} label="Buyer road" waiting={path.waiting} /></div></div>
          <div className="mt-4 sm:hidden"><RoadStepper current={path.current} road={BUYER_ROAD} waiting={path.waiting} /></div>
          {/* DC-E001: the road is a picture of the journey — the cards below are the way in. */}
          {path.waiting && <p className="mt-3 text-[13.5px] text-ink-2">Your company&apos;s admin has your request. Everything below is open while you wait.</p>}
        </div>
        {/* Scott 10-16: the seller is told "Not live yet"; the buyer is told they're live and ready. Same card shape. */}
        {!path.waiting && (
          <Link href="/shop" data-buyer-live className="group mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border-2 border-ink bg-surface p-5 transition-colors hover:border-magenta-dark sm:p-6">
            <span className="min-w-0">
              <span className="inline-block bg-magenta px-2 py-0.5 text-[11.5px] font-bold text-white">Live</span>
              <b className="mt-2 block text-[20px] font-extrabold leading-snug">You&apos;re live and ready to buy</b>
              <span className="mt-1 block text-[14px] text-ink-2">Shop services and products, or post a job and let sellers come to you.</span>
            </span>
            <span className="inline-flex min-h-[44px] items-center bg-ink px-6 text-[14.5px] font-bold text-surface group-hover:bg-magenta-dark">Start Shopping</span>
          </Link>
        )}
        <h2 className="mt-9 text-[19px] font-extrabold">What do you want to do{firstVisit ? " first" : ""}?</h2>
        <BuyerThings />
      </section>
    );
  }
  const { things } = await fiveThings(viewer);
  // SO-E004: a registered seller who isn't live yet gets one wide Get Found card above the cards.
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  const reg = me ? await sellerRegistration(me.id) : null;
  // While on the provider road (before Request Payment), the cards become one question with four directions.
  const onRoad = !!path && path.road === "provider" && path.current < 6;
  return (
    <section data-five-things className="mb-8 font-body text-ink">
      <h1 className="text-[26px] font-extrabold leading-tight sm:text-[30px]">Welcome{firstName ? `, ${firstName}` : ""}.</h1>
      {onRoad && (
        <div data-path-road className="mt-5 rounded-[14px] border border-line bg-surface px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-[17px] font-bold">{ROAD_TITLE} <LifecycleHelp /></h2>
            <span className="text-[11px] font-bold tracking-[0.1em] text-ink-2">STEP {path.current + 1} OF {path.steps.length}</span>
          </div>
          <div className="mt-3 hidden overflow-x-auto sm:block"><div className="min-w-[640px]"><RoadGraphic current={path.current} waiting={path.waiting} /></div></div>
          <div className="mt-4 sm:hidden"><RoadStepper current={path.current} waiting={path.waiting} /></div>
          <p className="mt-2 text-[13.5px] text-ink-2">Learn, Connect and Build Your Catalog are open now.</p>
        </div>
      )}
      {path && !onRoad && (
        <div data-path-bar className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border border-line px-4 py-3">
          <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-ink-2">
            YOUR PATH{path.current < path.steps.length ? ` · STEP ${path.current + 1} OF ${path.steps.length}` : " · DONE"}
            <LifecycleHelp />
          </span>
          <span className={"grid w-[140px] gap-1 " + (path.steps.length === 8 ? "grid-cols-8" : "grid-cols-7")} aria-hidden>
            {path.done.map((d, i) => (
              <span key={i} className={"h-1.5 " + (d ? "bg-magenta" : i === path.current ? "bg-ink" : "bg-line")} />
            ))}
          </span>

        </div>
      )}

      {reg && !reg.live && (
        <Link href={reg.registered ? "/join/provider" : reg.step ? "/join/provider/register" : "/join/provider/start"} data-get-found className="group mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border-2 border-ink bg-surface p-5 transition-colors hover:border-magenta-dark sm:p-6">
          <span className="min-w-0">
            <span className="inline-block border border-magenta px-2 py-0.5 text-[11.5px] font-bold text-magenta-dark">Not live yet</span>
            <b className="mt-2 block text-[20px] font-extrabold leading-snug">{reg.registered ? "Get found by buyers — 2 steps, about 10 minutes" : "Finish signing up — about 3 minutes"}</b>
            <span className="mt-1 block text-[14px] text-ink-2">{reg.registered ? "Your profile, then your rates. Go live and buyers can find you and hire you." : "Who you are, your company and its addresses. Then get found by buyers."}</span>
          </span>
          <span className="inline-flex min-h-[44px] items-center bg-ink px-6 text-[14.5px] font-bold text-surface group-hover:bg-magenta-dark">{reg.registered ? "Start" : "Continue"}</span>
        </Link>
      )}
      {onRoad ? (
        <>
          <h2 className="mt-9 text-[19px] font-extrabold">What do you want to do{firstVisit ? " first" : ""}?</h2>
          <BuyerThings seller />
        </>
      ) : (
        <>
      <h2 className="mt-7 text-[17px] font-bold">
          Things You Can Do Today <span className="text-[12.5px] font-normal text-ink-3">most useful first</span>
        </h2>
        {(
        <div role="list" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {things.slice(0, 2).map((t, i) => <Card key={t.key} t={t} i={i} />)}
          <MoreCards count={things.length - 2}>
            {things.slice(2).map((t, i) => <Card key={t.key} t={t} i={i + 2} />)}
          </MoreCards>
        </div>
        )}
        </>
      )}

      {/* Scott 10-15: like the buyer dashboard — greeting, road, cards. No Waiting on You below. */}
    </section>
  );
}
