"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
/* ⚠ `useEffect` AND `useState` WENT WITH THE CREDITS SEAM (`P1-ALL-E375`). The
   parked `getCreditsSummary` effect was their ONLY consumer in this component,
   so leaving them imported is an unused-var warning — and the lint baseline is
   43 with 0 new allowed. ⚠ `useSyncExternalStore` IS NOT CREDITS WORK and stays.
   ⚠ THE `"use client"` DIRECTIVE STAYS TOO: `usePathname`, `useSession`,
   `useMe` and `useSyncExternalStore` all still need it. */
import { useSyncExternalStore } from "react";
import { useMe } from "@/components/MeProvider";
import { AccountMenu } from "@/components/casing/AccountMenu";
import { HOME_NAV, NOTIFICATIONS_NAV, SEARCH_NAV } from "@/lib/nav";
import { greetingFor } from "@/lib/greeting";
/* ⚠⚠ COMMUNITY CREDITS PARKED 2026-09-03 (`P1-ALL-E375`, amendment A2). Scott:
   *"just comment it out... it is just too much rn. we NEED to move faster. that
   has no real value."* Parked DELIBERATELY, NOT ABANDONED — no ledger, no
   scheduling, and a standing Friday commitment nobody wants. Decision and the
   full call-site list: `src/lib/credits.ts`. ⚠ THE IMPORTS HAD TO GO IN THE SAME
   PASS: `lib/credits.ts` is commented out, so leaving these would break the
   build — that is why this is one commit and not several. */
// import { getCreditsSummary, type CreditsSummary } from "@/lib/credits";
// import { CreditsPill } from "@/components/casing/CreditsPill";

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
  /* `P1-ALL` — unread AND delivered; absent at zero, never a 0 badge. */
  const unreadCount = me?.notificationsUnread ?? 0;
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
  /*
    DAY/DATE, RESTORED (CASING_SPEC_LOCKED 2026-08-13). E210-revised removed it
    as ambient decoration; Scott wants it back, in the right cluster this time
    rather than beside the greeting. Same `Intl.DateTimeFormat` as 4b7e0ef, and
    still derived from the same client-side clock store — the server does not
    share the viewer's timezone, so a server-rendered date would be wrong for
    half the users half the time.
  */
  /*
    SHORT FORM ("Wed, Aug 12"), not 4b7e0ef's "Wednesday, August 12".

    Measured: the long form is 195px, and the right cluster with the Credits
    pill already runs to 855px of an 1177px header at 1440. With the long date
    the centre Search collapsed to 62px — an icon and a sliver, which reads as
    broken rather than as a field. The short form gives ~75px back and Search
    gets a usable width at every size the spec cares about.

    Still day AND date, which is what the spec asks for.
  */
  const dateLabel = now
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(now)
    : null;

  const first = me?.person?.firstName ?? "";

  /*
    THE PILL READS ONE SEAM (`getCreditsSummary`). In PHASE 1 that returns
    zeroes and `pending: true`; PHASE 3 puts the real ledger behind the same
    function and nothing in this component changes. Fetched here rather than
    passed from a server layout because the header is already a client component
    and the shell has no other reason to become async.
  */
/* ⚠⚠ COMMUNITY CREDITS PARKED 2026-09-03 (`P1-ALL-E375`, amendment A2). Scott:
   *"just comment it out... it is just too much rn. we NEED to move faster. that
   has no real value."* Parked DELIBERATELY, NOT ABANDONED — no ledger, no
   scheduling, and a standing Friday commitment nobody wants. Decision and the
   full call-site list: `src/lib/credits.ts`. ⚠ THE SEAM READ IS PARKED WITH IT,
   not just the render — a fetch nobody displays is a request for nothing. */
  // const [credits, setCredits] = useState<CreditsSummary | null>(null);
  // useEffect(() => {
  //   let alive = true;
  //   getCreditsSummary(me?.person?.id ?? null).then((c) => alive && setCredits(c));
  //   return () => {
  //     alive = false;
  //   };
  // }, [me?.person?.id]);

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
        className="mx-auto hidden h-9 min-w-[170px] max-w-[420px] flex-1 items-center gap-2 rounded-full border border-line bg-canvas px-3.5 text-[14px] text-ink-2 transition-colors hover:border-[#d9d4e2] hover:text-ink sm:flex"
      >
        <SearchIcon />
        <span className="truncate">{SEARCH_NAV.label}</span>
      </Link>

      {/* ---- RIGHT (spec order): Credits · date · AI on · Home · Bug ·
              Notifications · Profile ------------------------------------- */}
      {/*
        ── ⚠ THE BREAKPOINTS ON THE THREE AMBIENT PILLS ARE DERIVED, NOT PICKED
             (P1-ALL-E001) ──────────────────────────────────────────────────

        This row overflowed EVERY authenticated page between 760 and 1180, and
        the defect was being filed against whatever page was being walked.

        ⚠ THE 248px NOBODY COULD ACCOUNT FOR IS THE RAIL, NOT THE HEADER.
        `documentElement.scrollWidth` measured 1259 at viewports of both 1100 and
        1180 — wider than the header's own 1011 min-content, which looked like
        something being sized from the viewport. It is not. `AppShell` is
        `flex-col lg:flex-row`, and `AppRail`'s desktop column is
        `hidden w-[248px] shrink-0 lg:block`. At lg the rail becomes a SIBLING
        COLUMN of fixed width that cannot shrink, so the document's min-content
        is rail + header: 248 + 1011 = 1259. Below lg the rail is a stacked top
        bar and contributes nothing, which is why the number steps by breakpoint
        (771 · 1011 · 1259) instead of scaling with the window.

        ⚠ AND 1011 IS NOT THE HEADER'S REAL MINIMUM EITHER. Chromium's
        `scrollWidth` omits the end padding once content overflows, so the true
        figure is 1011 + 32 = 1043.

        MEASURED WIDTHS (Chromium, 2026-08-19, /dashboard signed in):

          CreditsPill      411px   (301 below md — "Coming soon" is md:inline)
          day/date pill    125px
          "AI on"           69px
          each icon link    36px   x4 (Search-icon below sm, Home, Bug, Bell)
          AccountMenu       36px
          gap between       6px

        THE ARITHMETIC. Required header width R = 64 (px-8 both sides) + 24 (two
        12px gaps) + 170 (the search pill's floor) + G, and the available width A
        is the viewport minus 248 at lg and above:

          G = 4 icons                          162   R =  420
          G + "AI on"                          231   R =  489
          G + AI + credits(301)                544   R =  802
          G + AI + credits(411)                654   R =  912
          G + AI + credits + date              785   R = 1043

        The rail is what creates the trap: at 1023 the header has 1023px and the
        old set (R = 1043) nearly fits; at 1024 it has 776 and the same set needs
        1043. So every threshold that lands between 1024 and 1043 + 248 = 1291 has
        to be pushed to the next NAMED breakpoint above it.

          credits  → xl  (1280): A = 1032, R = 912 ✓   (lg would be A = 776 ✗)
          AI on    → 2xl (1536): A = 1288, R = 1043 ✓
          date     → 2xl (1536): same row, same budget ✓

        ⚠ NAMED VARIANTS ONLY. `pitfalls.md` 2026-08-19: `sm:` beat
        `min-[1100px]:` because both media queries match and source order decides.
        Named breakpoints are ordered by definition. `check:app-shell` fails the
        build on an arbitrary variant competing with a named one.

        ⚠ THE ORDER THEY DISAPPEAR IN IS THE SPEC'S: date → "AI on" → credits.
        Credits outlives both, which is why it sits a whole breakpoint lower. The
        date and "AI on" now go together at 2xl rather than in two steps — there
        is no named breakpoint between them and 1291, and inventing one to
        preserve a two-step sequence would be a design-system change to satisfy a
        sequence nobody watches.

        ⚠ WHAT DID NOT CHANGE, AND WHY. `shrink-0` on this container stays: it is
        what stops the controls being squeezed into each other, and dropping
        ambient items is strictly better than shrinking controls people tap. The
        search pill's `min-w-[170px]` floor also stays — collapsing it to its icon
        form across a wider band would buy ~134px and is a DESIGN change, so it is
        proposed in the report rather than shipped here.
      */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {/*
          THE PILL DROPS BELOW xl, and it is the right thing to drop. Something
          had to — at 375px the greeting, a 150px pill and four controls
          measured 482px against a 360px viewport, and the three controls on the
          right were pushed clean off the screen. Everything else in this row is
          a way to GO somewhere; the pill is a number you read.

          ⚠ IT USED TO RETURN AT sm (640) AND NOW RETURNS AT xl (1280). At 411px
          it is by far the widest thing in this row — wider than the four icon
          links, the date and "AI on" put together — and at sm it made the row
          802px wide against a 640px viewport. It is still the LAST of the three
          ambient items to go, per the spec's ranking; it just needs a viewport
          that can hold it.
        */}
        {/* ⚠⚠ COMMUNITY CREDITS CHIP PARKED 2026-09-03 (`P1-ALL-E375`, amendment
            A2). Scott: *"just comment it out... that has no real value."* Parked
            deliberately, not abandoned — no ledger, no scheduling, no mentor
            asking for the Friday commitment. See `src/lib/credits.ts`.
            ⚠ THE BREAKPOINT LADDER ABOVE IS PARKED, NOT DELETED, AND STAYS
            ACCURATE FOR THE DAY THIS RETURNS: it was solved in a browser against
            a 411px chip (301px below `md`), and re-deriving it would mean
            re-measuring rather than reading. ⚠ THE ROW IS NOW ONE ITEM SHORTER,
            so the `xl` breakpoint this chip forced is no longer load-bearing —
            REPORTED at `E375`, not re-tuned, because retuning it would be
            inventing pixel figures nobody measured. */}
        {/* {credits && (
          <span className="hidden xl:contents">
            <CreditsPill summary={credits} />
          </span>
        )} */}

        {/*
          DAY/DATE — ambient, so it is the first thing to go as the row narrows.
          Restored from 4b7e0ef per the locked spec.

          ⚠ md (768) → 2xl (1536). At md it was visible in the exact band where
          the rail also appears and nothing could shrink, and its 125px was the
          difference between 912 and 1043 required against 776 available.
        */}
        {dateLabel && (
          <span className="hidden items-center gap-1.5 rounded-full bg-[#f1faff] px-3 py-1.5 text-[13px] font-semibold text-[#1f7ab8] 2xl:inline-flex">
            <CalendarIcon />
            {dateLabel}
          </span>
        )}

        {/*
          ⚠ "AI on" IS DECORATION. A static marketing chip: no toggle, no
          backend, nothing reads it (Scott, 2026-08-13 — locked spec). It is
          styled as a status rather than a control precisely so nobody tries to
          click it, and it carries no aria-live or role — announcing a state
          that never changes would be noise to a screen reader.

          ⚠ sm (640) → 2xl (1536). It is only 69px, so it is not what broke the
          row — but it is the item the spec ranks SECOND to go, and leaving it at
          sm would have inverted the ranking against credits at xl. It costs
          nothing to a walk and it is the cheapest thing on the row to lose.
        */}
        <span className="hidden items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 2xl:inline-flex">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          AI on
        </span>

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

        {/* Bug sits before Notifications per the locked spec's order. Still
            drops below sm — a glyph nobody taps on a phone. */}
        <span className="hidden sm:contents">
          <IconLink href="/support/bug" label="Report a bug">
            <BugIcon />
          </IconLink>
        </span>

        {/*
          ⚠⚠ THE BADGE SHIPS WITH THE FEED, IN ONE CHANGE (`P1-ALL`, 2026-09-01).
        
          ⚠ SUPERSEDED, quoted, and it was a PROMISE rather than a limitation: *"NO
          COUNT ON THE BELL, deliberately. The notifications backend is not built;
          the page renders an empty state… because a '0' badge asserts something we
          haven't checked and a fake number is worse than none. The badge ships with
          the feed, in one change, when there is a number behind it."*
          THERE IS NOW A NUMBER BEHIND IT, so the comment is redeemed rather than
          left lying next to a badge it says should not exist.
        
          ⚠ IT COUNTS UNREAD **AND DELIVERED** rows only — a `DIGEST` or `SILENT`
          row exists but was never sent, and badging one would point the user at
          something they cannot open.
          ⚠ AND IT STILL RENDERS NOTHING AT ZERO. The original objection was to a
          "0" badge, and that objection survives: absent, not zero.
        */}
        <IconLink
          href={NOTIFICATIONS_NAV.href}
          label={NOTIFICATIONS_NAV.label}
          active={pathname.startsWith(NOTIFICATIONS_NAV.href)}
        >
          <span className="relative inline-flex">
            <BellIcon />
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} unread notifications`}
                className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-magenta px-1 text-[10px] font-bold text-white"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
        </IconLink>

        {/* The account menu — the ONE home for Sign Out (locked spec). */}
        <AccountMenu isAdmin={isAdmin} />
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

function CalendarIcon() {
  return (
    <svg {...S} width={15} height={15}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
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
