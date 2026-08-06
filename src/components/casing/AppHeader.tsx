"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useMe } from "@/components/MeProvider";
import { greetingFor } from "@/lib/greeting";
import { getCreditsSummary, type CreditsSummary } from "@/lib/credits";
import { CreditsPill } from "@/components/casing/CreditsPill";

/**
 * The header (WS1-D, decluttered by E207-E210).
 *
 *   left    greeting ("Good Morning, {first}"), then the date and AI-on chips
 *   right   the Community Credits pill (and the bug report)
 *
 * THREE THINGS LEFT THIS HEADER IN E207-E209, and they all left for the same
 * reason: the rail already had them. A bell beside a rail "Notifications", a
 * house beside a rail "Home", and a search pill beside a rail "Search" are not
 * shortcuts — they are a second set of answers to "where do I click", and the
 * walk hit every one of them. The rail keeps all three; the work-request search
 * in the middle of the dashboard keeps its own box, which is a different search
 * over a different thing.
 *
 * E210 — STATUS LEFT, CURRENCY RIGHT. The date and "AI on" are ambient facts
 * that belong with the greeting, and the Credits pill is the one thing here
 * that will become a number people watch, so it gets the corner on its own.
 * That order also means the header no longer ends in a run of grey glyphs.
 *
 * THE PAGE NAME IS GONE, and that is the locked decision rather than an
 * omission. What tells you where you are is the rail's active highlight, which
 * is more precise than a title anyway: it shows the page AND the group it
 * belongs to.
 *
 * THE AVATAR IS IN THE RAIL (WS1-A / E214), bottom-left. Logout has exactly one
 * home and it is not here.
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

      {/* ---- LEFT: ambient status, beside the greeting (E210) -------------- */}
      {dateLabel && (
        <span className="hidden items-center gap-1.5 rounded-full bg-[#f1faff] px-3 py-1.5 text-[13px] font-semibold text-[#1f7ab8] md:inline-flex">
          <CalendarIcon />
          {dateLabel}
        </span>
      )}

      {/* AI on — a STATUS, not a switch: the résumé reader and the Learn test
          generator are live, and this says so. Not a toggle, because nothing
          here can currently be turned off. */}
      <span className="hidden items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        AI on
      </span>

      {/* ---- RIGHT: the currency (E210) ------------------------------------ */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* The bug report stays: nothing in the rail duplicates it. It drops
            below sm, where the row has no space for a glyph nobody taps on a
            phone. */}
        <span className="hidden sm:contents">
          <IconLink href="/support/bug" label="Report a bug">
            <BugIcon />
          </IconLink>
        </span>

        {credits && <CreditsPill summary={credits} />}
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

/* Inline SVGs rather than an icon dependency — two glyphs don't justify one. */
const S = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function CalendarIcon() {
  return (
    <svg {...S} width={14} height={14}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
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
