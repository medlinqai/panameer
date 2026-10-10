"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
//   import { useRef, useState, useSyncExternalStore } from "react";
import { useMe } from "@/components/MeProvider";
import { ConfigDrawer } from "@/components/casing/ConfigDrawer";
import { BottomNav } from "@/components/casing/BottomNav";
import { AccountMenu } from "@/components/casing/AccountMenu";
import {
  ACCOUNT_BAND_HREF,
  BAND_CONTROL_HREFS,
  CONFIG_BAND_HREF,
  HOME_BAND_HREF,
} from "@/lib/nav";
import { RailIcon } from "@/components/casing/RailIcon";
import { BAND_LIT, BAND_IDLE, BAND_TILE } from "@/components/casing/band-lit";
import {
  navForRoles,
  railPersona,
  ADMIN_NAV,
  ADMIN_HOME,
  bandActiveHref,
} from "@/lib/nav";
import "./app-band.css";

export function AppBand() {
  const { me } = useMe();
  const pathname = usePathname();

  const { data: session } = useSession();
  const isAdmin = session?.user?.isSystemAdmin === true;


  const persona = railPersona(me, isAdmin);
  const consoleLabel =
    persona === "PANAMEER"
      ? "Platform Console"
      : persona === "SELLER"
        ? "Provider Console"
        : persona === "BUYER"
          ? "Buyer Console"
          : null;

  // [comment, paraphrased: the clock was an external store carried over from

  // Admins keep a way back to the task panel from every app (2026-10-10).
  const items = isAdmin
    ? [{ ...ADMIN_HOME, label: "Admin", requires: undefined }, ...navForRoles(me)]
    : navForRoles(me);

  const ownProviderPath = me?.providerProfile?.id
    ? `/providers/${me.providerProfile.id}`
    : null;
  // — THE CANDIDATE LIST GAINS THE FOUR CONTROLS. `bandActiveHref` can only
  const activeHref = bandActiveHref(
    pathname,
    [...items.map((i) => i.href), ...BAND_CONTROL_HREFS],
    { ownProviderPath }
  );
  const isActive = (href: string) => href === activeHref;

  return (
    <>
    <header className="pm-band border-b border-white/10 bg-rail px-5 py-2.5 sm:px-6">
      {/* ── LEFT: the brand, always left-justified while visible ──────────── */}
      {/* THE LOGO CARRIES NO GROUND, IN ANY STATE */}
      <Link
        href={isAdmin ? ADMIN_HOME.href : "/dashboard"}
        aria-label="Panameer home"
        aria-current={isActive(HOME_BAND_HREF) ? "page" : undefined}
        className="pm-band-brand block px-2 py-1 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/panameer-lockup-white.png"
          alt="Panameer"
          className="pm-band-logo-white h-6 w-auto"
        />
        {/* Light rail (Dynamic Branding) swaps in the ink lockup; see globals.css. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/panameer-lockup-ink.png" alt="" aria-hidden className="pm-band-logo-ink hidden h-6 w-auto" />
        {/* THE CONSOLE LABEL SITS UNDER THE WORDMARK (WS-A 6), as it did in the */}
        {/* THE SLOT KEEPS ITS LINE BOX AND SAYS NOTHING. `" "` holds the */}
        {/* HIDDEN BELOW 930px ( WS-E 3). Scott: *"the mark alone */}
        <span className="pm-band-console mt-0.5 block text-[11px] font-medium tracking-wide text-white/45">
          {consoleLabel ?? " "}
        </span>
      </Link>

      {/* ── CENTRE: the role menu, icon over text ─────────────────────────── */}
      <nav className="pm-band-menu" aria-label="Main menu">
        <div className="pm-band-menu-row">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={
                  `pm-band-item flex flex-col items-center gap-0.5 ${BAND_TILE} px-3 py-1.5 ` +
                  "text-[11.5px] font-medium leading-[14px] whitespace-nowrap transition-colors " +
                  // — ONE RULE: active is a SOLID fill, the translucent
                  (active ? BAND_LIT : BAND_IDLE)
                }
              >
                <RailIcon name={item.icon} />
                <span className="pm-band-label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── RIGHT: the utility cluster, always right-justified ────────────── */}
      <div className="pm-band-right flex items-center gap-1.5">
        {
          // THE DATE CHIP AND THE `AI on` CHIP ARE REMOVED
        }

        {}

        {}
        {}
        {isAdmin && (
          <span className="contents lg:hidden">
            <ConfigDrawer
              groups={ADMIN_NAV}
              label="Configuration"
              active={isActive(CONFIG_BAND_HREF)}
            />
          </span>
        )}

        {}
        {/* Bug icon removed (2026-10-07): Report a Problem is under Support in the avatar menu. */}

        {}
        {}
        {/* Messages and Notifications moved into the account menu (2026-10-07); the avatar carries one count. */}
        <AccountMenu isAdmin={isAdmin} onDark active={isActive(ACCOUNT_BAND_HREF)} />
      </div>

      {}

    </header>

      {}
      <BottomNav items={items} ownProviderPath={ownProviderPath} />
    </>
  );
}

function BandIcon({
  href,
  label,
  children,
  active = false,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={
        "grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors " +
        (active ? BAND_LIT : BAND_IDLE)
      }
    >
      {children}
    </Link>
  );
}

const S = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// function CalendarIcon() {

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HomeIcon() {
  return (
    <svg {...S}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </svg>
  );
}



export function BugIcon() {
  return (
    <svg {...S}>
      <rect x="8" y="6" width="8" height="14" rx="4" />
      <path d="M3 12h5M16 12h5M5 6l3 2M19 6l-3 2M5 18l3-2M19 18l-3-2M9 3l1.5 2M15 3l-1.5 2" />
    </svg>
  );
}

// [comment, paraphrased: the clock was an external store carried over from
