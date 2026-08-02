"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Avatar } from "@/components/Avatar";
import { usePathname } from "next/navigation";
import { useMe } from "@/components/MeProvider";
import { pageTitleFor } from "@/lib/nav";
import { greetingFor } from "@/lib/greeting";
import { membershipBadge } from "@/lib/membership";

/**
 * The header — all eight elements from E151 (MASTER WS10).
 *
 *   left   greeting ("Good morning, {name}")
 *   right  date chip · AI on · Home · bug report · notifications · avatar menu
 *
 * (The Panameer logo, element 1, lives at the top of the dark rail, which is
 * where the mockup puts it.)
 *
 * THE AVATAR MENU IS THE ONLY LOGOUT (E152, resolving E138). The old rail
 * drop-up is gone with the old rail. Putting it upper-right is also where every
 * other product on earth puts it, which is worth more than any argument for a
 * bespoke position.
 */
export function AppHeader() {
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [dateLabel, setDateLabel] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  /*
    Greeting and date are computed AFTER mount, from the viewer's clock. Doing
    it during render would hydrate-mismatch whenever the server and the browser
    disagree about the hour — which, for a product with providers in Sydney and
    buyers in Chicago, is most of the day.
  */
  useEffect(() => {
    const now = new Date();
    setGreeting(greetingFor(now));
    setDateLabel(
      new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(now)
    );
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /*
    THE HEADER RULE (E015): home shows the greeting, every other page shows
    its own name. Scott's correction to the earlier mockups, which greeted
    you again on every sub-page — a greeting is an arrival, and repeating it
    on Packages tells you nothing about where you are.

    DERIVED from the nav definitions rather than passed per page: a title
    prop is one more thing to forget on the next page, and it would let the
    rail and the header disagree about what a page is called.
  */
  const { data: session } = useSession();
  const isAdmin = session?.user?.isSystemAdmin === true;
  const pathname = usePathname();
  const pageTitle = pageTitleFor(pathname);

  const first = me?.person.firstName ?? "";
  const last = me?.person.lastName ?? "";
  /*
    E003 — the account menu read "RECRUITER BASIC" for the Panameer Admin,
    because membershipBadge derives from actor flags and the seed had set the
    coordinator flag on staff. WS7 clears those flags, but the badge still needs
    a word for someone who is none of the marketplace actors: an admin is
    Panameer staff, not a tier of customer, so they are labelled as such rather
    than falling through to nothing.
  */
  const badge = isAdmin ? "Panameer Admin" : membershipBadge(me);

  return (
    <header className="flex items-center gap-3 border-b border-line bg-white px-5 py-3 sm:px-8">
      <p className="min-w-0 flex-1 truncate text-[16px] font-bold">
        {pageTitle ?? (greeting ? `${greeting}, ${first || "there"}` : " ")}
      </p>

      <div className="ml-auto flex shrink-0 items-center gap-2">
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

        {/* Element 8 — settings + avatar = the account menu. */}
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Account menu"
            className="flex items-center gap-1.5 rounded-full p-0.5 transition-colors hover:bg-black/[0.04]"
          >
            <GearIcon />
            <Avatar
              firstName={first}
              lastName={last}
              photoUrl={me?.person.photoUrl}
              size={32}
            />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-[14px] border border-line bg-white shadow-brand"
            >
              <div className="border-b border-line px-4 py-3">
                <p className="text-[12px] font-bold uppercase tracking-wide text-ink-2">
                  {badge ?? "Account"}
                </p>
                <p className="truncate text-[15px] font-bold">
                  {`${first} ${last}`.trim() || "Signed in"}
                </p>
              </div>

              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-[14.5px] hover:bg-black/[0.04]"
              >
                My Profile
              </Link>

              <button
                role="menuitem"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="block w-full px-4 py-2.5 text-left text-[14.5px] font-semibold text-red-600 hover:bg-black/[0.04]"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
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

/* Inline SVGs rather than an icon dependency — six glyphs don't justify one. */
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
function GearIcon() {
  return (
    <span className="hidden text-ink-2 sm:block">
      <svg {...S}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    </span>
  );
}
