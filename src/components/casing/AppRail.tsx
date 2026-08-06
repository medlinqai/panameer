"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useMe } from "@/components/MeProvider";
import {
  navForRoles,
  APP_NAV_GROUP_TITLE,
  UTILITY_NAV,
  ADMIN_NAV,
  ADMIN_HOME,
  ADMIN_SETUP,
} from "@/lib/nav";
import { AccountMenu } from "@/components/casing/AccountMenu";
import { CompanyMenu } from "@/components/casing/CompanyMenu";
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

  /*
    ONE IDENTITY BLOCK, BOTH RAILS (WS1-A). The persona menu left the header, so
    the admin needs it here too or a Panameer employee loses their only route to
    My Profile and Sign Out. Same component, same menu; the admin's item list is
    the shorter one `ADMIN_PERSONA_NAV` already defines.

    E214 — IT IS PINNED TO THE BOTTOM now, not stacked in with the navigation.
    Three zones: the org up top, the work in the middle, and you at the bottom
    left. Sitting in the scroll flow it was a fourth nav item competing with the
    utility row directly under it.
  */
  const identityBlock = (
    <div className="mt-3 border-t border-white/10 pt-3">
      <AccountMenu isAdmin={isAdmin} variant="rail" />
    </div>
  );

  const nav = isAdmin ? (
    <>
      <div className="mt-1 space-y-1.5">
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
      {/*
        UTILITY ROW, above everything (WS1-A). Search, Home and Notifications
        are not "transactions" — they are the three things you reach for from
        anywhere, and the deck puts them above the identity block for that
        reason. Icon-only would have been tighter and wrong: this rail is roomy
        on purpose and an unlabelled glyph is a guess.
      */}
      <div className="space-y-1">
        {UTILITY_NAV.map((i) => railLink(i, false))}
      </div>

      {/*
        E206/E211 — the separate "Provider Dashboard" button used to sit here.
        It pointed at /dashboard, which the utility row's "Home" already does,
        so the rail lit two magenta pills at once for one destination. Home in
        the utility row is the single landing entry now.
      */}
      <p className="mt-6 px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/40">
        {APP_NAV_GROUP_TITLE}
      </p>
      {/*
        E216 — PLAIN LINKS, NO FLYOUTS, NO CHEVRONS. The six Transaction items
        each had a hover submenu; those children are their destination pages'
        tab rows now (`PAGE_TABS` in nav.ts). Nothing flies out of the rail, so
        nothing here needs a disclosure affordance.
      */}
      <div className="space-y-1">{items.map((i) => railLink(i, false))}</div>
    </>
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

          {/* ZONE 1 — org context (E214). A popover for company admins, the
              same static chip as before for everyone else. */}
          <CompanyMenu />

          {/* ZONE 2 — the work. Scrolls; the two zones around it do not. */}
          <nav className="mt-3 min-h-0 flex-1 overflow-y-auto">{nav}</nav>

          {/* ZONE 3 — you (E214). Outside the scroll container, so it is always
              reachable however long the navigation gets. */}
          {identityBlock}
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
            <CompanyMenu />
            <nav>{nav}</nav>
            {identityBlock}
          </div>
        )}
      </div>
    </>
  );
}
