"use client";

import Link from "next/link";
import { NotificationBell } from "@/components/casing/NotificationBell";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
//   import { useRef, useState, useSyncExternalStore } from "react";
import { useRef, useState } from "react";
import { useMe } from "@/components/MeProvider";
import { ConfigDrawer } from "@/components/casing/ConfigDrawer";
import { BottomNav } from "@/components/casing/BottomNav";
import { AccountMenu } from "@/components/casing/AccountMenu";
import {
  ACCOUNT_BAND_HREF,
  BAND_CONTROL_HREFS,
  MESSAGES_BAND_HREF,
  BELL_BAND_HREF,
  CONFIG_BAND_HREF,
  HOME_BAND_HREF,
} from "@/lib/nav";
import { RailIcon } from "@/components/casing/RailIcon";
import { BAND_LIT, BAND_IDLE, BAND_TILE } from "@/components/casing/band-lit";
import { MessagesDrawer } from "@/components/casing/MessagesDrawer";
import {
  navForRoles,
  railPersona,
  ADMIN_NAV,
  ADMIN_HOME,
  NOTIFICATIONS_NAV,
  bandActiveHref,
} from "@/lib/nav";
import "./app-band.css";

export function AppBand() {
  const { me } = useMe();
  const pathname = usePathname();

  const { data: session } = useSession();
  const isAdmin = session?.user?.isSystemAdmin === true;

  const unreadCount = me?.notificationsUnread ?? 0;

  const [messagesOpen, setMessagesOpen] = useState(false);
  const messagesButtonRef = useRef<HTMLButtonElement>(null);

  const persona = railPersona(me, isAdmin);
  const consoleLabel =
    persona === "PANAMEER"
      ? "Platform Console"
      : persona === "SELLER"
        ? "Provider Console"
        : persona === "BUYER"
          ? "Buyer Console"
          : null;

  //
  //
  //   [comment, paraphrased: the clock was an external store carried over from
  //    `AppHeader` unchanged, because the viewer's wall clock is not the
  //    server's — providers in Sydney, buyers in Chicago — so the server
  //    snapshot was null and the client snapshot real, giving the same answer
  //    an effect would without setting state during mount]
  //   const now = useSyncExternalStore(subscribeNothing, clientNow, serverNow);
  //   const dateLabel = now
  //     ? new Intl.DateTimeFormat(undefined, {
  //         weekday: "short", month: "short", day: "numeric",
  //       }).format(now)
  //     : null;
  //
  // of the same clock and its own `CalendarIcon`; that file is dead code kept
  // removal cannot reach it. MEASURED with comments stripped, not grepped.

  const items = navForRoles(me);

  const ownProviderPath = me?.providerProfile?.id
    ? `/providers/${me.providerProfile.id}`
    : null;
  /*
    ⚠⚠ `E735` — THE CANDIDATE LIST GAINS THE FOUR CONTROLS. ⚠ `bandActiveHref` can only
    pick a winner from what it is handed, so an icon that owns a prefix and is not in this
    array still lights nothing. ⚠⚠⚠ **THAT WAS HALF THE 50-DARK-ROUTE DEFECT** — the other
    half was that three of the controls had no lit branch to switch on.
  */
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
      {/*
        ── ⚠⚠⚠ THE LOGO CARRIES NO GROUND, IN ANY STATE (`P2-ALL-E801`) ───────

        ⚠ **SCOTT, 2026-10-03:** the logo *"shows a grey box behind it — remove
        the background on the logo link in every state (normal, hover, focus);
        keep a visible focus outline only for keyboard focus."*
        ⚠⚠ That grey box was `E735`'s LIT STATE: `bg-white/15` whenever the
        current route is home. On the admin console, home is where he spends the
        day, so the box was on almost permanently.

        ⚠⚠⚠ **`aria-current` STAYS AND SO DOES `activeHref`.** Only the PAINT is
        removed. The lit-state bookkeeping is what `check:nav-reachable`'s `E735`
        sweep reads — it counts dark routes from the data, not from CSS — so the
        route still knows it is home, and the sweep still sees exactly one winner.
        ⚠ Dropping `activeHref` to remove a background would have turned a
        cosmetic note into a nav regression.

        ⚠⚠ **SUPERSEDED BY SCOTT, quoted not deleted (`E164`, rule 13):**
        //   E735 - THE LOGO LIGHTS ON /dashboard (Scott: "/dashboard lights the
        //   logo"). It is a wordmark on a dark band, not a pill, so the lit
        //   state is a subtle ground behind it rather than BAND_LIT's solid
        //   magenta.
        //   className: (isActive(HOME_BAND_HREF) ? "bg-white/15" : "")
        ⚠ This is `SUPERSEDED-BY-SCOTT`, not `SUPERSEDED-IN-FACT`: the code did
        exactly what it was asked to, and the decision moved.

        ⚠ `focus-visible` ONLY — a mouse click on a link leaves focus on it, so a
        plain `:focus` ring would paint the very box he asked to remove the
        moment anybody clicks home.
      */}
      <Link
        href={isAdmin ? ADMIN_HOME.href : "/dashboard"}
        aria-label="Panameer home"
        aria-current={isActive(HOME_BAND_HREF) ? "page" : undefined}
        className="pm-band-brand block rounded-[6px] px-2 py-1 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/panameer-lockup-white.png"
          alt="Panameer"
          className="h-6 w-auto"
        />
        {/*
          ⚠ THE CONSOLE LABEL SITS UNDER THE WORDMARK (WS-A 6), as it did in the
          rail. ⚠⚠ THE COMPANY NAME IS NOT HERE — and it was not in the rail
          either: `E099` removed the company chip and moved BOTH its behaviours
          into `AccountMenu`'s `My Company` block (a popover for company admins,
          a plain link for everyone else). `CompanyMenu.tsx` is deleted.
          ⚠ So no control is dropped by this band. `casing_spec_LOCKED.md` still
          describes a rail zone 2 chip and has been wrong since `E099`; that is
          corrected there, not papered over here.
        */}
        {/*
          ⚠⚠ THE SLOT KEEPS ITS LINE BOX AND SAYS NOTHING. `" "` holds the
          height so the wordmark does not jump vertically when the label arrives
          — the band is `align-items: center`, so a shorter brand block would
          re-centre the logo and trade one flicker for another.
          ⚠ A NON-BREAKING SPACE IS NOT A PLACEHOLDER: it names nothing, claims
          nothing and reads as nothing. ⚠⚠ IT IS THE HOUSE PRECEDENT, not a new
          idea — `AppHeader` used exactly this for the greeting before the clock
          resolved (`: " "`).
          ⚠ NO SKELETON, NO "Loading…", NO GUESSED LABEL.
        */}
        {/* ⚠⚠ HIDDEN BELOW 930px (`E602` WS-E 3). Scott: *"the mark alone,
            without 'Provider Console', is fine"* — the label is what made the
            brand column wide enough to squeeze the menu once the brand stopped
            being hidden. ⚠ `pm-band-console` is styled in `app-band.css`. */}
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
                  /* ⚠ `E217` — ONE RULE: active is a SOLID fill, the translucent
                     wash is hover and nothing else. Carried over from the rail so
                     the band does not invent a second selection language.
                     ⚠⚠ THIS IS THE CLASS THE AVATAR NOW REUSES (`E720` item 1) — it is the
                     band item's own lit look, and there is one copy of it.
                     ⚠ SUPERSEDED, quoted not deleted (`E164`):
                     //   "… rounded-[8px] px-3 py-1.5 " +
                     //   (active ? "bg-rail-active text-white"
                     //           : "text-white/75 hover:bg-white/10 hover:text-white") */
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
          // ── ⚠⚠⚠ THE DATE CHIP AND THE `AI on` CHIP ARE REMOVED (`P2-ALL-E587`
          //    WS-B2, 2026-09-20) ────────────────────────────────────────────
          //
          // ⚠⚠ SCOTT, 2026-09-20: *"the date chip and the AI on chip will get
          // REMOVED. They are not functional and I really want to simplify."*
          // ⚠ RULED: *"RMOVE both. TY."*
          //
          // ⚠⚠⚠ NEITHER DID ANYTHING WHEN CLICKED, and the `AI on` comment below
          // said so in its own words — *"no toggle, no backend, nothing reads
          // it"*. A control that looks interactive and is not is worse than no
          // control: it teaches people that things in the band do not respond,
          // and that lesson then applies to the controls that DO.
          //
          // ⚠ SUPERSEDED, quoted not deleted (`E164`), with `//` line comments
          // per rule 12 and `check:comment-quotes`:
          //
          //   [comment, paraphrased: date and `AI on` kept the ribbon wash from
          //    held because a surface tint on an unactionable status is not the
          //    saturated magenta that marks something clickable]
          //   {dateLabel && (
          //       <CalendarIcon />
          //       {dateLabel}
          //     </span>
          //   )}
          //
          //   [comment, paraphrased: `AI on` was decoration — no toggle, no
          //    backend, nothing read it, locked spec 2026-08-13 — styled as a
          //    status so nobody would click it, and deliberately carrying no
          //    aria-live because announcing a state that never changes is noise]
          //     <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          //     AI on
          //   </span>
          //
          // simplification, so the band gets QUIETER, not refilled. Measured at
          // the WS-B2 gate and reported, not spent.
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
        <span className="hidden md:contents">
          {}
          <BandIcon href="/support/bug" label="Report a bug">
            <BugIcon />
          </BandIcon>
        </span>

        {}
        {}
        <button
          ref={messagesButtonRef}
          type="button"
          onClick={() => setMessagesOpen((v) => !v)}
          aria-label="Messages"
          title="Messages"
          aria-haspopup="dialog"
          aria-expanded={messagesOpen}
          className={
            "grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors " +
            (messagesOpen || isActive(MESSAGES_BAND_HREF) ? BAND_LIT : BAND_IDLE)
          }
        >
          <MessagesIcon />
        </button>

        {}
        <NotificationBell
          unreadCount={unreadCount}
          label={NOTIFICATIONS_NAV.label}
          active={isActive(BELL_BAND_HREF)}
        >
          <BellIcon />
        </NotificationBell>

        {}
        {}
        <AccountMenu isAdmin={isAdmin} onDark active={isActive(ACCOUNT_BAND_HREF)} />
      </div>

      {}
      {messagesOpen && (
        <MessagesDrawer
          onClose={() => setMessagesOpen(false)}
          returnFocusRef={messagesButtonRef}
        />
      )}
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

//
//
//   function CalendarIcon() {
//     return (
//       <svg {...S} width={14} height={14}>
//         <rect x="3" y="4.5" width="18" height="16" rx="2" />
//         <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
//       </svg>
//     );
//   }
//
// stripped before removing this one.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HomeIcon() {
  return (
    <svg {...S}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg {...S}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-2.8-.4L4 21l1.4-4.1A8.1 8.1 0 0 1 4 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8 8.4Z" />
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

//
//
//   [comment, paraphrased: the clock was an external store carried over from
//    `AppHeader` unchanged]
//   function subscribeNothing() { return () => {}; }
//   let cachedNow: Date | null = null;
//   function clientNow(): Date {
//     [comment, paraphrased: cached so the snapshot is referentially stable —
//      a fresh Date every call makes React think the store changed and
//      re-render forever]
//     if (!cachedNow) cachedNow = new Date();
//     return cachedNow;
//   }
//   function serverNow(): null { return null; }
//
// clock ever returns to this band, a fresh `Date` per call re-renders forever.
