"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { useMe } from "@/components/MeProvider";
import { greetingFor } from "@/lib/greeting";
import { getCreditsSummary, type CreditsSummary } from "@/lib/credits";
import { CreditsPill, HeaderSearch } from "@/components/casing/CreditsPill";

/**
 * The header (WS1-D) — greeting · search · Community Credits.
 *
 *   left    greeting ("Good Morning, {first}")
 *   centre  search box → /search
 *   right   the Community Credits pill
 *
 * THE PAGE NAME IS GONE, and that is the locked decision rather than an
 * omission. E015 had the header show the greeting on home and the page name
 * everywhere else — one or the other, never both. The Credits pill now owns the
 * top-right slot, so keeping the page name as well would put three competing
 * labels across one row. What tells you where you are is the rail's active
 * highlight, which is more precise than a title anyway: it shows the page AND
 * the group it belongs to.
 *
 * THE AVATAR MOVED TO THE RAIL (WS1-A). Logout still has exactly one home; it
 * is the identity block now rather than a round avatar in a row of icons.
 */
export function AppHeader() {
  const { me } = useMe();

  /*
    THE CLOCK IS AN EXTERNAL STORE, read through `useSyncExternalStore` rather
    than copied into state by an effect. The greeting and the date depend on the
    viewer's wall clock, which the server does not share — for a product with
    providers in Sydney and buyers in Chicago the two disagree most of the day —
    so the server snapshot is null and the client snapshot is the real time.
    Same answer the effect gave, without setting state during mount.
  */
  const now = useSyncExternalStore(subscribeNothing, clientNow, serverNow);
  const greeting = now ? greetingFor(now) : null;
  const dateLabel = now
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(now)
    : null;

  const { data: session } = useSession();
  const isAdmin = session?.user?.isSystemAdmin === true;

  const first = me?.person.firstName ?? "";

  /*
    THE PILL READS ONE SEAM (`getCreditsSummary`). In PHASE 1 that returns
    zeroes and `pending: true`; PHASE 3 puts the real ledger behind the same
    function and nothing in this component changes. Fetched here rather than
    passed from a server layout because the header is already a client component
    and the shell has no other reason to become async.
  */
  const [credits, setCredits] = useState<CreditsSummary | null>(null);
  useEffect(() => {
    let alive = true;
    getCreditsSummary(me?.person.id ?? null).then((c) => alive && setCredits(c));
    return () => {
      alive = false;
    };
  }, [me?.person.id]);

  return (
    <header className="flex items-center gap-3 border-b border-line bg-white px-5 py-3 sm:px-8">
      {/*
        GREETING ONLY. No page name — see the note above; the rail's active
        highlight carries location, and the top-right slot is Credits now.
      */}
      <p className="min-w-0 shrink-0 truncate text-[16px] font-bold">
        {greeting ? `${greeting}, ${first || "there"}` : "\u00a0"}
      </p>

      <HeaderSearch />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {credits && <CreditsPill summary={credits} />}

        {/* Element 3 — the day/date chip, ported from Medlinq HeaderDateChip. */}
        {dateLabel && (
          <span className="hidden items-center gap-1.5 rounded-full bg-[#f1faff] px-3 py-1.5 text-[13px] font-semibold text-[#1f7ab8] md:inline-flex">
            <CalendarIcon />
            {dateLabel}
          </span>
        )}

        {/* Element 4 — AI on. A STATUS, not a switch: the résumé reader and the
            Learn test generator are live, and this says so. It is not a toggle
            because nothing here can currently be turned off. */}
        <span className="hidden items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          AI on
        </span>

        {/*
          Home and bug-report drop below sm. At 375 the full cluster — four
          icons, a gear and an avatar — could not shrink past the viewport and
          pushed every casing page into a horizontal scroll. Home is one tap
          away in the rail drawer and the bug report is not a phone-first
          action; the bell and the avatar (which owns logout) stay at every
          width.
        */}
        <span className="hidden sm:contents">
          <IconLink href={isAdmin ? "/admin" : "/dashboard"} label="Home">
            <HomeIcon />
          </IconLink>
          <IconLink href="/support/bug" label="Report a bug">
            <BugIcon />
          </IconLink>
        </span>

        {/* Element 7 — notifications. The count is deliberately absent rather
            than zero: there is no feed behind this yet, and a "0" badge asserts
            something we haven't checked. */}
        <IconLink href="/notifications" label="Notifications">
          <BellIcon />
        </IconLink>

        {/*
          The persona menu MOVED TO THE RAIL's identity block (WS1-A). The deck
          puts who-you-are in the rail and gives the header's top-right slot to
          Community Credits; leaving an avatar here as well would be two doors
          to one menu.
        */}
      </div>
    </header>
  );
}

function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-black/[0.04] hover:text-ink"
    >
      {children}
    </Link>
  );
}

/* Inline SVGs rather than an icon dependency — four glyphs don't justify one. */
const S = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function CalendarIcon() {
  return (
    <svg {...S} width={14} height={14}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg {...S}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function BugIcon() {
  return (
    <svg {...S}>
      <rect x="8" y="6" width="8" height="14" rx="4" />
      <path d="M3 12h5M16 12h5M5 6l3 2M19 6l-3 2M5 18l3-2M19 18l-3-2M9 3l1.5 2M15 3l-1.5 2" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg {...S}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

/*
  The clock, as an external store.

  Nothing to subscribe to — the header does not tick — so `subscribe` returns a
  no-op unsubscribe. The value that matters is the pair of snapshots: null on
  the server (which renders no greeting) and a real Date on the client. That is
  what keeps the greeting out of the server's markup without an effect writing
  state on mount.
*/
function subscribeNothing() {
  return () => {};
}
let cachedNow: Date | null = null;
function clientNow(): Date {
  // Cached so the snapshot is referentially stable — returning a fresh Date on
  // every call makes React think the store changed and re-render forever.
  if (!cachedNow) cachedNow = new Date();
  return cachedNow;
}
function serverNow(): null {
  return null;
}
