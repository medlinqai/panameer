"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useMe } from "@/components/MeProvider";
import { AccountMenu } from "@/components/casing/AccountMenu";
import { HOME_NAV, NOTIFICATIONS_NAV, SEARCH_NAV } from "@/lib/nav";
import { greetingFor } from "@/lib/greeting";
import { getCreditsSummary, type CreditsSummary } from "@/lib/credits";
import { CreditsPill } from "@/components/casing/CreditsPill";

/**
 * The header — greeting, Search, and the universal controls.
 *
 *   left    greeting ("Good Morning, {first}")
 *   centre  Search
 *   right   Credits · Home · Notifications · Profile · bug report
 *
 * ⚠ THIS REVERSES E207, E208, E209 AND E214, deliberately and at Scott's
 * instruction. It is not a bug fix and it is not a regression: those four
 * decisions moved the search pill, Home, the bell and the account menu into the
 * rail on the argument that "the rail already answers where-do-I-click", and
 * the call now is that the rail is for the six role TRANSACTIONS and the four
 * universal controls belong up here. Both layouts are defensible; this is the
 * one chosen. The error log should be annotated rather than the entries deleted
 * — the reasoning in them is still sound, it just lost.
 *
 * E210 IS NOT REVERSED. The date and the "AI on" chip stay gone, and the
 * distinction matters: E207-E209 moved things that were ACTIONABLE to a
 * different home, while E210 removed two chips nobody could act on — the date
 * is on every clock the person owns, and "AI on" is a status nobody can change.
 * Restoring the four does not restore those.
 *
 * THE PAGE NAME IS STILL GONE, also unchanged. Location is shown by the rail's
 * active highlight, which is more precise than a title: it names the page and
 * the group it belongs to.
 */
export function AppHeader() {
  const { me } = useMe();
  const pathname = usePathname();

  /*
    ADMIN vs PROVIDER for the account menu's own item list. Read from the
    session rather than /api/me for the same reason AppRail reads it there:
    `Me` carries ACTOR flags and the admin bit is deliberately not one of them.
  */
  const { data: session } = useSession();
  const isAdmin = session?.user?.isSystemAdmin === true;

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
      {/*
        THE GREETING SHRINKS FIRST. It was `shrink-0`, which at 375px pushed the
        four controls off the right edge — the row measured 482px against a
        360px viewport and Home, Notifications and the avatar were simply not
        reachable. It is the one thing here that is decoration rather than a
        control, so it is the one thing allowed to truncate.
      */}
      <p className="min-w-0 flex-1 truncate text-[16px] font-bold sm:flex-none sm:shrink">
        {greeting ? `${greeting}, ${first || "there"}` : "\u00a0"}
      </p>

      {/*
        ---- CENTRE: Search -------------------------------------------------

        A LINK SHAPED LIKE A SEARCH FIELD, not a search field. `/search` is
        still a Coming-Soon stub, so a real input here would take a query and
        throw it away — the reference's centre affordance without the lie. When
        the page gains a backend this becomes an input and nothing else moves.

        Below sm it becomes an icon on the right (see below) — the pill needs
        width this row does not have at 375px, but Search is one of the four
        controls this brief exists to make reachable, so it does not simply
        vanish.
      */}
      <Link
        href={SEARCH_NAV.href}
        className="mx-auto hidden h-9 min-w-0 max-w-[420px] flex-1 items-center gap-2 rounded-full border border-line bg-canvas px-3.5 text-[14px] text-ink-2 transition-colors hover:border-[#d9d4e2] hover:text-ink sm:flex"
      >
        <SearchIcon />
        <span className="truncate">{SEARCH_NAV.label}</span>
      </Link>

      {/* ---- RIGHT: currency · Home · Notifications · Profile · bug -------- */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {/*
          THE PILL DROPS BELOW sm, and it is the right thing to drop. Something
          had to — at 375px the greeting, a 150px pill and four controls
          measured 482px against a 360px viewport, and the three controls on the
          right were pushed clean off the screen. Everything else in this row is
          a way to GO somewhere; the pill is a number you read. It returns at sm.
        */}
        {credits && (
          <span className="hidden sm:contents">
            <CreditsPill summary={credits} />
          </span>
        )}

        {/*
          Search as an ICON below sm, where the centre pill has no room. All
          four universal controls stay reachable at 375px — hiding one of them
          would undo the point of moving them here.
        */}
        <span className="sm:hidden">
          <IconLink
            href={SEARCH_NAV.href}
            label={SEARCH_NAV.label}
            active={pathname.startsWith(SEARCH_NAV.href)}
          >
            <SearchIcon />
          </IconLink>
        </span>

        <IconLink
          href={HOME_NAV.href}
          label={HOME_NAV.label}
          /*
            EXACT match, not startsWith. "/dashboard" is a prefix of nothing
            today, but the rail learned this the hard way with "/admin" lighting
            fifteen pages at once, and the cheap version of that lesson is to
            write the exact test the first time.
          */
          active={pathname === HOME_NAV.href}
        >
          <HomeIcon />
        </IconLink>

        {/*
          NO COUNT ON THE BELL, deliberately — the brief asks for one and there
          is nothing to count. The notifications backend is not built; the page
          renders an empty state and its own comment says the bell carries no
          badge "because a '0' badge asserts something we haven't checked and a
          fake number is worse than none". That still holds. The badge goes in
          with the feed, in one change, when there is a number behind it.
        */}
        <IconLink
          href={NOTIFICATIONS_NAV.href}
          label={NOTIFICATIONS_NAV.label}
          active={pathname.startsWith(NOTIFICATIONS_NAV.href)}
        >
          <BellIcon />
        </IconLink>

        {/* E214 reversed — the account menu and logout live here again. */}
        <AccountMenu isAdmin={isAdmin} />

        {/* Last, because it is the rarest thing here. Drops below sm where the
            row has no room for a glyph nobody taps on a phone. */}
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
  active = false,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  /** Current page. Marks `aria-current` as well as tinting — the highlight has
   *  to survive for someone who cannot see the tint. */
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={
        "grid h-9 w-9 place-items-center rounded-full transition-colors " +
        (active
          ? "bg-magenta/10 text-magenta"
          : "text-ink-2 hover:bg-black/[0.04] hover:text-ink")
      }
    >
      {children}
    </Link>
  );
}

/* One inline SVG rather than an icon dependency. */
const S = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function SearchIcon() {
  return (
    <svg {...S} className="shrink-0">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg {...S}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg {...S}>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M13.7 20a2 2 0 0 1-3.4 0" />
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
