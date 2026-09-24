"use client";

import Link from "next/link";
import { NotificationBell } from "@/components/casing/NotificationBell";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
// ⚠ `useSyncExternalStore` LEFT WITH THE CLOCK (`P2-ALL-E587` WS-B2).
// ⚠ SUPERSEDED, quoted not deleted (`E164`):
//   import { useRef, useState, useSyncExternalStore } from "react";
import { useRef, useState } from "react";
import { useMe } from "@/components/MeProvider";
import { AccountMenu } from "@/components/casing/AccountMenu";
import { RailIcon } from "@/components/casing/RailIcon";
import { MessagesDrawer } from "@/components/casing/MessagesDrawer";
/* ⚠ `HOME_NAV` LEFT THIS IMPORT with the Home icon (`E602` WS-E 3). It is
   still exported and still a member of `UTILITY_NAV`; this file just no longer
   renders it, and an unused import is a NEW lint problem against a zero-new
   baseline. ⚠ SUPERSEDED, quoted not deleted (`E164`): `HOME_NAV,` */
import {
  navForRoles,
  railPersona,
  ADMIN_NAV,
  ADMIN_HOME,
  NOTIFICATIONS_NAV,
  bandPrefixesFor,
} from "@/lib/nav";
import "./app-band.css";

/**
 * ── ⚠⚠ THE APP BAND (`P2-ALL-E559`) — ONE DARK BAND, NO LEFT RAIL ───────────
 *
 * SCOTT, 2026-09-17: the left rail becomes top icons.
 *
 * ⚠⚠ BLAST RADIUS: EVERY LOGGED-IN PAGE. One `AppShell` serves `(app)/**`,
 * `/admin/**` and logged-in `/learn`, so this replaces the chrome on all of them
 * at once.
 *
 * ⚠⚠ `casing_spec_LOCKED.md` IS INCORPORATED, NOT SUPERSEDED. Scott: *"No, it
 * incorporates it."* The header's nine elements stay; what moved is the RAIL'S
 * CONTENTS into this band. Every divergence is written back into that doc with
 * the `E164` treatment — it ends *"if any logged-in page chrome diverges from
 * this, this doc wins"*, so a divergence left unrecorded makes the doc lie.
 *
 * ⚠ `AppRail.tsx` AND `AppHeader.tsx` STAY ON DISK (`E164`). Neither is deleted
 * and neither is rendered by `AppShell` any more.
 *
 * ── WHAT IS DELIBERATELY ABSENT ──────────────────────────────────────────────
 *
 * ⚠ SEARCH — removed (WS-A 4). It was a LINK shaped like a field pointing at a
 *   Coming-Soon stub, and removing it plus the greeting is what makes room for
 *   the menu. `SEARCH_NAV` is untouched in `nav.ts`.
 * ⚠ THE GREETING (*"Good {morning}, {first}"*) — removed (WS-A 4).
 * ⚠⚠ MESSAGES — OMITTED, NOT FORGOTTEN. It is an icon in this cluster per
 *   WS-A 5, but it belongs to `E560`, and `E560` HAS NOT LANDED (verified: no
 *   commit on any branch). ⚠ The brief's instruction is explicit — *"do not
 *   render a dead one."*
 * ⚠ COMMUNITY CREDITS — out. Scott, 2026-09-18: *"community credits is out for
 *   now."* `E375` parked it commented-not-deleted and that stays true; the pill
 *   simply has no home here. Recorded in `casing_spec_LOCKED.md`, which still
 *   listed a Credits pill in the header cluster.
 * ⚠⚠ THE PERSONA CAPTION (`MAIN MENU` / `SELLER`) — dropped (ruling 3,
 *   2026-09-18). With the rail gone, `Provider Console` under the wordmark and a
 *   persona word inches away are two labels for one fact from the same
 *   predicate — `P1-J1.1-E248` in reverse, and a horizontal band has less room
 *   for it than a vertical rail did.
 *   ⚠⚠⚠ `railPersona()` IS NOT DELETED AND ITS RETURN VALUES ARE UNCHANGED.
 *   It still returns `"PANAMEER"` / `"SELLER"` / `"BUYER"` and `consoleLabel`
 *   below still branches on it. `E491` is the standing warning: change what that
 *   function RETURNS and the admin branch silently takes the wrong path with
 *   nothing failing. ONLY THE RENDERED CAPTION LEFT THE BAND.
 */
export function AppBand() {
  const { me } = useMe();
  const pathname = usePathname();

  /* ⚠ ADMIN IS A SESSION BIT, NOT AN ACTOR FLAG — the same read `AppRail` and
     `AppHeader` both used. `Me` carries actor flags and the admin bit is
     deliberately not one of them. */
  const { data: session } = useSession();
  const isAdmin = session?.user?.isSystemAdmin === true;

  const unreadCount = me?.notificationsUnread ?? 0;

  /* ⚠ `P2-ALL-E560` STAGE 2 — the drawer's open state and the element focus
     returns to when it closes. ⚠⚠ THE REF IS THE ICON ITSELF, never `<body>`. */
  const [messagesOpen, setMessagesOpen] = useState(false);
  const messagesButtonRef = useRef<HTMLButtonElement>(null);

  /* ⚠⚠ UNCHANGED DERIVATION (`E491`). The caption is gone; the value is not. */
  const persona = railPersona(me, isAdmin);
  /*
    ── ⚠⚠⚠ NOTHING RENDERS HERE UNTIL `me` RESOLVES (`P2-ALL-E560`, 2026-09-18)

    ⚠⚠ A PROVIDER WAS SEEING `Buyer Console` ON EVERY LOGGED-IN PAGE LOAD.
    `AppBand` is a client component: before `useMe()` resolves, `me` is null,
    `railPersona` correctly returns `null` — and the old ternary's FINAL ELSE
    swallowed that null into `"Buyer Console"`. ⚠ So the band told a seller they
    were a buyer, briefly, constantly, everywhere.

    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    // const consoleLabel =
    //   persona === "PANAMEER" ? "Platform Console"
    //     : persona === "SELLER" ? "Provider Console"
    //       : "Buyer Console";

    ⚠⚠ THE HOUSE ALREADY HELD THE PRINCIPLE — `casing_spec_LOCKED.md` on the
    bell: *"NO count/badge until the notifications feed backend exists — a '0' or
    fake number is worse than none."* ⚠ **A WRONG CONSOLE NAME IS WORSE THAN NO
    CONSOLE NAME.**

    ⚠ `null` IS NOW ITS OWN BRANCH rather than a fall-through. `BUYER` still maps
    to `Buyer Console`; what changed is that UNRESOLVED no longer borrows it.
    ⚠⚠ `railPersona()`'s BUYER FALLBACK IS NOT TOUCHED — it is deliberate and
    documented, and `E491` is why nothing here may change what that function
    returns. ⚠ ONLY WHAT THE BAND RENDERS WHILE `me` IS NULL CHANGED.
    ⚠ AN ADMIN NEVER FLASHES: `railPersona` short-circuits on the `isSystemAdmin`
    SESSION bit, which resolves without `/api/me`.
  */
  const consoleLabel =
    persona === "PANAMEER"
      ? "Platform Console"
      : persona === "SELLER"
        ? "Provider Console"
        : persona === "BUYER"
          ? "Buyer Console"
          : null;

  // ── ⚠ THE CLOCK GOES WITH THE CHIP IT FED (`P2-ALL-E587` WS-B2) ─────────
  //
  // ⚠ SUPERSEDED, quoted not deleted (`E164`):
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
  // ⚠⚠ ITS ONLY READER WAS THE DATE CHIP. `AppHeader.tsx` carries its OWN copy
  // of the same clock and its own `CalendarIcon`; that file is dead code kept
  // on disk (`E559` replaced it with the band and nothing imports it), so this
  // removal cannot reach it. MEASURED with comments stripped, not grepped.

  /*
    ⚠ THE MENU IS `nav.ts`'S, NOT A LIST HERE. That rule survived the reskin
    deliberately and it survives this one: hard-coding the labels is exactly the
    drift one definition exists to prevent.
    ⚠⚠ THIS BRIEF DOES NOT CHANGE WHO SEES WHICH MENU. `navForRoles` already
    gates on `hasCapability`-equivalent flags; the admin branch is a different
    LIST, flattened here because a band has no room for group headers.
  */
  const items = isAdmin ? ADMIN_NAV.flatMap((g) => g.items) : navForRoles(me);

  /* ⚠ EXACT MATCH for the two landing routes. `/admin` is a prefix of every
     admin page and a startsWith test lit fifteen pills at once — the rail
     learned that the hard way (`E475`). */
  const EXACT = new Set(["/dashboard", "/admin"]);
  /*
    ── ⚠⚠ AN ITEM MAY OWN MORE THAN ONE PREFIX (`P2-A3-E596` WS-A) ──────────

    ⚠ SUPERSEDED, quoted not deleted (`E164`) — one prefix per item:
    //   const isActive = (href: string) =>
    //     EXACT.has(href) ? pathname === href : pathname.startsWith(href);

    ⚠⚠ CONNECT'S PAGES LIVE UNDER `/community`, NOT UNDER `/connect` — eight
    routes — so the old test left the pill dark on every one of them. Scott
    caught it on `/community/score`, where the tab row said `CONNECT · Profile`
    and the band said he was nowhere.
    ⚠⚠⚠ THE LIST IS EXPLICIT AND LIVES IN `nav.ts`. Relaxing the match instead
    is the `E475` trap this very comment records — fifteen pills at once. An
    explicit list adds exactly what somebody wrote down.
    ⚠ `EXACT` still wins for `/dashboard` and `/admin`: they own no extras, and
    an exact landing route must not become a prefix.
  */
  const isActive = (href: string) =>
    EXACT.has(href)
      ? pathname === href
      : bandPrefixesFor(href).some((p) => pathname.startsWith(p));

  return (
    <header className="pm-band border-b border-white/10 bg-rail px-5 py-2.5 sm:px-6">
      {/* ── LEFT: the brand, always left-justified while visible ──────────── */}
      <Link
        href={isAdmin ? ADMIN_HOME.href : "/dashboard"}
        aria-label="Panameer home"
        className="pm-band-brand block"
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
                  "pm-band-item flex flex-col items-center gap-0.5 rounded-[8px] px-3 py-1.5 " +
                  "text-[11.5px] font-medium leading-[14px] whitespace-nowrap transition-colors " +
                  /* ⚠ `E217` — ONE RULE: active is a SOLID fill, the translucent
                     wash is hover and nothing else. Carried over from the rail so
                     the band does not invent a second selection language. */
                  (active
                    ? "bg-rail-active text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white")
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
          //    `P1-A1.5-E445b`, re-toned for a dark band, and noted `E433` still
          //    held because a surface tint on an unactionable status is not the
          //    saturated magenta that marks something clickable]
          //   {dateLabel && (
          //     <span className="pm-band-date inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[12.5px] font-semibold text-white/75">
          //       <CalendarIcon />
          //       {dateLabel}
          //     </span>
          //   )}
          //
          //   [comment, paraphrased: `AI on` was decoration — no toggle, no
          //    backend, nothing read it, locked spec 2026-08-13 — styled as a
          //    status so nobody would click it, and deliberately carrying no
          //    aria-live because announcing a state that never changes is noise]
          //   <span className="pm-band-ai inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[12px] font-semibold text-white/75">
          //     <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          //     AI on
          //   </span>
          //
          // ⚠⚠ THE FREED WIDTH IS NOT REDISTRIBUTED. Scott's stated goal is
          // simplification, so the band gets QUIETER, not refilled. Measured at
          // the WS-B2 gate and reported, not spent.
        }

        {/*
          ── ⚠⚠⚠ THE HOME ICON IS GONE (`P2-A2-E602` WS-E 3) ──────────────────

          ⚠ SCOTT'S WALK (`E024`): *"Remove the Home icon from the band's
          right-hand cluster. The logo is home."*
          ⚠⚠ MEASURED BEFORE REMOVING, because the ruling depends on it: the
          logo links to `isAdmin ? ADMIN_HOME.href : "/dashboard"`, and
          `HOME_NAV.href` IS `/dashboard`. **They were the same destination**,
          so this removes a genuine duplicate rather than a door.
          ⚠⚠⚠ NOTHING IS STRANDED — that is the whole test for removing an
          affordance, and it passes here only because the logo already goes
          there. ⚠ For an admin the logo goes to the ADMIN home instead, which
          is the more useful of the two, not a loss.

          ⚠ THE FREED WIDTH IS NOT REDISTRIBUTED — the band's own standing rule,
          recorded a few lines above: Scott's goal is simplification, so the band
          gets QUIETER, not refilled.

          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   <BandIcon
          //     href={HOME_NAV.href}
          //     label={HOME_NAV.label}
          //     active={pathname === HOME_NAV.href}
          //   >
          //     <HomeIcon />
          //   </BandIcon>
          ⚠⚠ `HOME_NAV` IS STILL EXPORTED AND STILL A MEMBER OF `UTILITY_NAV` —
          only this file's IMPORT of it went, because an unused import is a NEW
          lint problem against a zero-new baseline. ⚠ `HomeIcon` STAYS ON DISK
          BELOW, unrendered, under `E164`, with a named disable rather than a
          deletion. Only this ONE rendering is removed.
        */}

        <BandIcon href="/support/bug" label="Report a bug">
          <BugIcon />
        </BandIcon>

        {/*
          ── ⚠⚠ MESSAGES (`P2-ALL-E560` STAGE 1, 2026-09-18) ──────────────────

          ⚠ SUPERSEDED, quoted not deleted (`E164`) — `E559` left this hole on
          purpose and this is what fills it:
          // MESSAGES BELONGS HERE AND IS OMITTED - `E560` has not landed.
          // See the docblock. Do not render a dead icon.

          ⚠ SCOTT, 2026-09-18: *"make it like linkedin. in notification
          bell...icon...and it opens on the right."* ⚠⚠ THE PANEL IS STAGE 2.

          ⚠⚠⚠ THIS ICON NAVIGATES TO `/messages` TODAY. THAT IS AN INTERIM AND IT
          IS DELIBERATE, NOT THE FINISHED DESIGN — Stage 2 replaces the
          navigation with a right-side overlay. ⚠ Stage 1 ships first so the band
          stops having a hole in it, and a link that WORKS is not a dead icon.

          ⚠⚠ NO UNREAD DOT, AND THAT IS MEASURED RATHER THAN FORGOTTEN:
          `Message` holds ZERO ROWS (measured 2026-09-18), so no unread can
          exist and a dot could only ever be decoration. ⚠ Scott's ruling was
          *"measure the Message row count first — if it is zero, ship without the
          dot and record it as deferred."* ⚠ RECORDED AS DEFERRED.
          ⚠⚠ WHEN IT IS BUILT IT IS A BOOLEAN EXISTENCE CHECK, NEVER A COUNT —
          a dot is not a number, and `me.ts` already runs one count per
          authenticated request. ⚠ THE BELL'S "no badge" RULE IS UNCHANGED and
          is a different rule: a fake NUMBER is worse than none.
        */}
        {/*
          ⚠⚠ A BUTTON, NOT A LINK (`P2-ALL-E560` STAGE 2). ⚠ SUPERSEDED, quoted
          not deleted (`E164`) — Stage 1's stated interim:
          // <BandIcon href="/messages" label="Messages"
          //   active={pathname.startsWith("/messages")}>
          //   <MessagesIcon />
          // </BandIcon>

          ⚠ THE ELEMENT HAD TO CHANGE WITH THE BEHAVIOUR. A thing that opens an
          overlay is a BUTTON; a link that does not navigate lies to the
          keyboard, to the middle-click and to the status bar.
          ⚠ `aria-expanded` and `aria-haspopup` say what it does, the same way
          `AccountMenu`'s trigger does.
          ⚠⚠ `/messages` THE ROUTE STAYS — the drawer's footer links it.
        */}
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
            (messagesOpen
              ? "bg-rail-active text-white"
              : "text-white/75 hover:bg-white/10 hover:text-white")
          }
        >
          <MessagesIcon />
        </button>


        {/*
          ── ⚠⚠⚠ STAGE 2 HAS LANDED (`P2-A3-E620` WS-C item 1) ──────────────

          ⚠ SCOTT, 2026-09-18: *"make it like linkedin. in notification
          bell...icon...and it opens on the right."* ⚠⚠ Recorded as **Stage 2**
          when `E559` shipped the band, and deferred for a measured reason: the
          notification table held ONE ROW, so a panel would have been an empty
          box behind a badge that could never appear. ⚠⚠⚠ `E620` REGISTERED THE
          EVENTS THAT PRODUCE ROWS, which is what made this buildable.

          ⚠ SUPERSEDED, quoted not deleted (`E164`) — the interim, a plain link
          to the page with the badge on it:
          //   <BandIcon href={NOTIFICATIONS_NAV.href} label={NOTIFICATIONS_NAV.label} …>
          //     <span className="relative inline-flex">
          //       <BellIcon />
          //       {unreadCount > 0 && <span …>{unreadCount > 9 ? "9+" : unreadCount}</span>}
          //     </span>
          //   </BandIcon>

          ⚠⚠ THE BADGE IS UNCHANGED AND IS STILL `me`'s COUNT — absent at zero,
          delivered-and-unread only. The panel fetches its own rows and never
          feeds the number, so the two cannot drift.
          ⚠ `See All` inside the panel is the page's door; the bell itself no
          longer navigates, which is what lets it open instead.
        */}
        <NotificationBell unreadCount={unreadCount} label={NOTIFICATIONS_NAV.label}>
          <BellIcon />
        </NotificationBell>

        {/* ⚠ THE ACCOUNT MENU — still the ONE home for Sign Out (locked spec),
            and still where `My Company` lives since `E099`. */}
        <AccountMenu isAdmin={isAdmin} onDark />
      </div>

      {/* ⚠ RENDERED BY THE BAND, which every logged-in page already has — so the
          drawer is reachable from all of them without any page opting in. */}
      {messagesOpen && (
        <MessagesDrawer
          onClose={() => setMessagesOpen(false)}
          returnFocusRef={messagesButtonRef}
        />
      )}
    </header>
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
        (active
          ? "bg-rail-active text-white"
          : "text-white/75 hover:bg-white/10 hover:text-white")
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

// ── ⚠ `CalendarIcon` GOES WITH THE DATE CHIP (`P2-ALL-E587` WS-B2) ────────
//
// ⚠ It was defined here and used exactly once — by the chip. ⚠ SUPERSEDED,
// quoted not deleted (`E164`):
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
// ⚠⚠ `AppHeader.tsx` HAS ITS OWN `CalendarIcon` AND KEEPS IT. That file is dead
// code on disk (`E559`), and the two were never shared — measured with comments
// stripped before removing this one.

/* ⚠⚠⚠ RETIRED BY `E602` WS-E 3 AND KEPT ON DISK (`E164`) — the band no longer
   renders a Home icon because the logo already goes to `/dashboard`.
   ⚠ THE DISABLE IS NAMED RATHER THAN BLANKET: `E164` says superseded code stays,
   and the lint baseline's rule is ZERO NEW, so the two rules are reconciled here
   explicitly instead of by deleting the component or by ignoring the file. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HomeIcon() {
  return (
    <svg {...S}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </svg>
  );
}

/* ⚠ `P2-ALL-E560` — a speech bubble, distinct from the bell beside it at 18px.
   Same `S` metrics as every other cluster glyph so the row keeps one weight. */
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

// ── ⚠ THE CLOCK'S THREE HELPERS GO WITH IT (`P2-ALL-E587` WS-B2) ──────────
//
// ⚠ All three existed to feed `useSyncExternalStore` for the date chip, and
// nothing else called them. ⚠ SUPERSEDED, quoted not deleted (`E164`):
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
// ⚠⚠ THE REFERENTIAL-STABILITY NOTE IS THE PART WORTH KEEPING IN WORDS: if a
// clock ever returns to this band, a fresh `Date` per call re-renders forever.
