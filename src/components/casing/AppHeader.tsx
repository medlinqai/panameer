"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useMe } from "@/components/MeProvider";
import { greetingFor } from "@/lib/greeting";
import { getCreditsSummary, type CreditsSummary } from "@/lib/credits";
import { CreditsPill } from "@/components/casing/CreditsPill";

/**
 * The header (E210, revised) — greeting, and Community Credits. That is all.
 *
 *   left    greeting ("Good Morning, {first}")
 *   right   the Community Credits pill, then the bug report
 *
 * FIVE THINGS HAVE LEFT THIS HEADER over two passes, and the same argument
 * removed all of them: nothing belongs here that another surface already owns
 * or that nobody acts on. E207-E209 took the bell, the house and the search
 * pill, because the rail has Notifications, Home and Search — a second set of
 * answers to "where do I click" is not a shortcut.
 *
 * E210 REVISED takes the date and the "AI on" chip. The first pass moved them
 * left beside the greeting; the decks say the middle is empty, and they are
 * right. Neither was actionable: the date is on every clock the person owns,
 * and "AI on" is a status nobody can change and nothing depends on. Two chips
 * of ambient decoration in the one strip that spans every page.
 *
 * What is left is the greeting and the one number people will watch week to
 * week. The bug report sits to the RIGHT of the pill — last, because it is the
 * rarest thing here and the pill is what the eye should land on.
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

      {/* ---- RIGHT: the currency, then the bug report (E210 revised) ------- */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {credits && <CreditsPill summary={credits} />}

        {/* Last, and the only icon left. Nothing in the rail duplicates it, and
            it drops below sm where the row has no room for a glyph nobody taps
            on a phone. */}
        <span className="hidden sm:contents">
          <IconLink href="/support/bug" label="Report a bug">
            <BugIcon />
          </IconLink>
        </span>
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

/* One inline SVG rather than an icon dependency. */
const S = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

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
