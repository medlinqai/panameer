"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSyncExternalStore } from "react";
import { useMe } from "@/components/MeProvider";
import { AccountMenu } from "@/components/casing/AccountMenu";
import { HOME_NAV, NOTIFICATIONS_NAV, SEARCH_NAV, pageTitleFor } from "@/lib/nav";
import { greetingFor } from "@/lib/greeting";
// import { getCreditsSummary, type CreditsSummary } from "@/lib/credits";
// import { CreditsPill } from "@/components/casing/CreditsPill";

export function AppHeader() {
  const { me } = useMe();
  /* `P1-ALL` — unread AND delivered; absent at zero, never a 0 badge. */
  const unreadCount = me?.notificationsUnread ?? 0;
  const pathname = usePathname();

  const { data: session } = useSession();
  const isAdmin = session?.user?.isSystemAdmin === true;

  const now = useSyncExternalStore(subscribeNothing, clientNow, serverNow);
  const greeting = now ? greetingFor(now) : null;
  const isConsole = pathname === "/admin" || pathname.startsWith("/admin/");
  const consoleTitle = isConsole
    ? (pageTitleFor(pathname) ?? "Panameer Dashboard")
    : null;
  const dateLabel = now
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(now)
    : null;

  const first = me?.person?.firstName ?? "";

  // const [credits, setCredits] = useState<CreditsSummary | null>(null)

  return (
    <header className="flex items-center gap-3 border-b border-line bg-white px-5 py-3 sm:px-8">
      {}
      {}
      {}
      <p className="min-w-0 flex-1 truncate text-[16px] font-bold sm:flex-none sm:shrink">
        {isConsole
          ? consoleTitle
          : greeting
            ? `${greeting}, ${first || "there"}`
            : "\u00a0"}
      </p>

      {/* CENTRE: Search ------------------------------------------------- */}
      <Link
        href={SEARCH_NAV.href}
        className="mx-auto hidden h-9 min-w-[170px] max-w-[420px] flex-1 items-center gap-2 border border-line bg-canvas px-3.5 text-[14px] text-ink-2 transition-colors hover:border-[#d9d4e2] hover:text-ink sm:flex"
      >
        <SearchIcon />
        <span className="truncate">{SEARCH_NAV.label}</span>
      </Link>

      {/* ---- RIGHT (spec order): Credits · date · AI on · Home · Bug ·
              Notifications · Profile ------------------------------------- */}
      {/* THE BREAKPOINTS ON THE THREE AMBIENT PILLS ARE DERIVED, NOT PICKED */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {/* THE PILL DROPS BELOW xl, and it is the right thing to drop. Something */}
        {/* COMMUNITY CREDITS CHIP PARKED 2026-09-03 , amendment */}
        {/* {credits && ( */}

        {/* DAY/DATE — ambient, so it is the first thing to go as the row narrows. */}
        {/* THE DATE CHIP JOINS THE NEUTRAL RAMP */}
        {dateLabel && (
          <span className="hidden items-center gap-1.5 rounded-full border border-magenta/20 bg-magenta/8 px-3 py-1.5 text-[13px] font-semibold text-magenta-ink 2xl:inline-flex">
            <CalendarIcon />
            {dateLabel}
          </span>
        )}

        {/* backend, nothing reads it (Scott, 2026-08-13 — locked spec). It is */}
        {/* `E445b` — the same ribbon wash as the date chip beside it. */}
        <span className="hidden items-center gap-1.5 rounded-full border border-magenta/20 bg-magenta/8 px-3 py-1.5 text-[12.5px] font-semibold text-magenta-ink 2xl:inline-flex">
          {/* THE GREEN COMES BACK */}
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          AI on
        </span>

        {/* Search as an ICON below sm, where the centre pill has no room. All */}
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
          // EXACT match, not startsWith. "/dashboard" is a prefix of nothing
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

        {/* THE BADGE SHIPS WITH THE FEED, IN ONE CHANGE (`P1-ALL`, 2026-09-01). */}
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

// The clock, as an external store.
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
