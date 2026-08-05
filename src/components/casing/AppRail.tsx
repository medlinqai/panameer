"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Avatar } from "@/components/Avatar";
import { useMe } from "@/components/MeProvider";
import {
  navForRoles,
  HOME_NAV,
  APP_NAV_GROUP_TITLE,
  ADMIN_NAV,
  ADMIN_HOME,
  ADMIN_SETUP,
} from "@/lib/nav";
import { RailIcon } from "@/components/casing/RailIcon";
import { useSession } from "next-auth/react";

/**
 * The dark rail (MASTER WS9/WS11, ref E151 + Medlinq Sidebar).
 *
 * Structure is Medlinq's — brand mark, company chip, a highlighted home entry,
 * an "Applications" group, and a signed-in card pinned to the bottom — on
 * Panameer's palette: #140c29 rail, #d127d0 active pill, both measured off the
 * mockup.
 *
 * ITEMS COME FROM nav.ts, not from a list here. That rule survived the reskin
 * deliberately: the old rail and the public top nav already share one
 * definition, and hard-coding the mockup's eight labels would have re-created
 * exactly the drift that single definition exists to prevent.
 *
 * THE BOTTOM CARD KEEPS ITS OWN SIGN OUT (E153, as Medlinq has it) even though
 * the header avatar menu is "the only logout" (E152). Those aren't in conflict:
 * E138 was that logout was UNREACHABLE, and the header menu is the canonical
 * home for it. This card is the same action where Medlinq's users already reach
 * for it, and a second door to sign-out has never confused anybody.
 */
export function AppRail() {
  const { me } = useMe();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /*
    ADMIN vs PROVIDER rail. `isSystemAdmin` lives on the session rather than on
    /api/me — `Me` carries ACTOR flags (provider/buyer/coordinator) and the
    admin bit is deliberately not one of them, so it is read from the session
    the same way the Platform Console link already does.
  */
  const { data: session } = useSession();
  const isAdmin = session?.user?.isSystemAdmin === true;

  const items = navForRoles(me);
  const consoleLabel = isAdmin ? "Platform Console" : "Provider Console";
  /*
    HOME ROUTES MATCH EXACTLY. "/admin" is a prefix of every admin page, so a
    startsWith test lit up Panameer Dashboard on all fifteen of them — two
    magenta pills at once, which the reference explicitly has only one of.
    Caught by querying for aria-current and getting two matches.
  */
  const EXACT = new Set(["/dashboard", "/admin"]);
  const isActive = (href: string) =>
    EXACT.has(href) ? pathname === href : pathname.startsWith(href);

  const first = me?.person.firstName ?? "";
  const last = me?.person.lastName ?? "";
  const company = me?.company?.name;

  /*
    HARD REQUIREMENT (WS1): labels never wrap.

    `whitespace-nowrap` alone isn't enough — a flex child defaults to
    min-width:auto and will happily overflow its container instead of forcing
    it wider, so "Roles>Domains>Skills" would clip rather than wrap. The rail is
    sized to the longest label at this font size (see the aside width) and the
    icon gutter is tightened before the text, which is the order the brief asks
    for.

    All 15 items + 2 buttons + 3 group headers fit a 768px viewport without
    scrolling at these metrics, so the collapsible-group fallback is not needed.
  */
  /*
    TWO DENSITIES, ONE RAIL (E191).

    The app rail carries nine items and Scott's image-1 spacing; the admin rail
    carries fifteen plus two buttons and three group headers, and the comment
    above is the reason it must stay tight — that budget is what keeps "Platform
    Admins" on screen at 768px without scrolling. Giving both the roomier metrics
    would have bought the provider the design and cost the admin the property the
    density was measured for, so density is a parameter rather than a re-tune.

    At 9 items × 36px + 8px gaps the app rail comes to ~316px of nav, which
    clears 768px with the brand, company chip and signed-in card in place.
  */
  const link = (active: boolean, dense: boolean) =>
    "flex items-center gap-2 whitespace-nowrap rounded-[8px] px-2.5 " +
    (dense ? "py-[3px] " : "py-[7px] ") +
    "text-[15px] font-medium leading-[22px] transition-colors " +
    (active
      ? "bg-magenta text-white"
      : "text-white/80 hover:bg-white/10 hover:text-white");

  const railLink = (
    item: { label: string; href: string; icon?: string },
    dense = true
  ) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={link(isActive(item.href), dense)}
    >
      <RailIcon name={item.icon} />
      <span className="truncate">{item.label}</span>
    </Link>
  );

  /*
    The two top buttons are OUTLINED with a faint fill, not solid — the
    reference shows them as affordances that sit above the navigation rather
    than as a third and fourth nav item competing with it. Only the active page
    gets solid magenta, so exactly one thing in the rail is ever filled.
  */
  const adminButton = (item: { label: string; href: string; icon?: string }) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={
        "flex items-center gap-2 whitespace-nowrap rounded-[8px] border px-2.5 py-[5px] " +
        "text-[15px] font-medium leading-[22px] transition-colors " +
        (isActive(item.href)
          ? "border-magenta bg-magenta text-white"
          : "border-white/15 bg-white/[0.06] text-white/90 hover:bg-white/[0.12] hover:text-white")
      }
    >
      <RailIcon name={item.icon} />
      <span className="truncate">{item.label}</span>
    </Link>
  );

  const nav = isAdmin ? (
    <>
      <div className="space-y-1.5">
        {adminButton(ADMIN_SETUP)}
        {adminButton(ADMIN_HOME)}
      </div>

      {ADMIN_NAV.map((group) => (
        <div key={group.title ?? "x"} className="mt-2">
          {group.title && (
            <p className="px-2.5 pb-0.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white/40">
              {group.title}
            </p>
          )}
          <div className="space-y-px">{group.items.map((i) => railLink(i))}</div>
        </div>
      ))}
    </>
  ) : (
    <>
      {railLink(HOME_NAV, false)}
      <p className="mt-6 px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/40">
        {APP_NAV_GROUP_TITLE}
      </p>
      <div className="space-y-1">{items.map((i) => railLink(i, false))}</div>
    </>
  );

  /*
    COMPACT (WS1). The three-line card cost 99px, and the admin rail is the one
    place that budget decides whether "Platform Admins" is on screen at 768px.
    Name and Sign Out sit on one row; the "Signed in As" caption goes, because
    an avatar beside a name in the bottom-left of a rail is not ambiguous. The
    header avatar menu still carries the full identity.
  */
  const signedInCard = me && (
    <div className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.07] px-2.5 py-1.5">
      <Avatar firstName={first} lastName={last} photoUrl={me.person.photoUrl} size={26} />
      <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-white">
        {`${first} ${last}`.trim() || "Signed in"}
      </p>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="shrink-0 text-[11px] text-white/45 hover:text-white hover:underline"
      >
        Sign Out
      </button>
    </div>
  );

  const brand = (
    <Link
      href={isAdmin ? ADMIN_HOME.href : "/dashboard"}
      aria-label="Panameer home"
      className="block px-1"
    >
      {/*
        E002 CLOSED — the new looped-P wordmark, on-dark variant (white
        letters), from 4. Logo. The old thin lowercase mark is gone.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/panameer-new-on-dark.png"
        alt="Panameer"
        className="h-7 w-auto"
      />
      <span className="mt-1 block text-[11.5px] font-medium tracking-wide text-white/45">
        {consoleLabel}
      </span>
    </Link>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-[248px] shrink-0 bg-rail lg:block">
        <div className="sticky top-0 flex h-screen flex-col px-3 py-4">
          {brand}

          {company && (
            <div className="mt-3 flex items-center gap-2.5 px-1">
              {me?.company?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={me.company.logoUrl}
                  alt=""
                  className="h-8 w-8 rounded-[7px] object-cover"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-[7px] bg-white/10 text-[12px] font-bold text-white/70">
                  {company.slice(0, 2).toUpperCase()}
                </span>
              )}
              <p className="min-w-0 truncate text-[15px] font-bold text-white">
                {company}
              </p>
            </div>
          )}

          <nav className="mt-3 flex-1 overflow-y-auto">{nav}</nav>
          <div className="pt-2">{signedInCard}</div>
        </div>
      </aside>

      {/* Mobile: a drawer, since 224px of rail has nowhere to live at 375px. */}
      <div className="lg:hidden">
        <div className="flex items-center gap-3 bg-rail px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            className="rounded-lg p-2 text-white/80 hover:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          {brand}
        </div>
        {open && (
          <div className="bg-rail px-4 pb-4">
            <nav>{nav}</nav>
            <div className="pt-4">{signedInCard}</div>
          </div>
        )}
      </div>
    </>
  );
}
