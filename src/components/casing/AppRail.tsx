"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useMe } from "@/components/MeProvider";
import {
  navForRoles,
  railPersona,
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
  /*
    E098 — WHICH SIDE OF THE MARKETPLACE THIS RAIL IS SHOWING.

    Derived in `nav.ts` from the same inputs that pick the menu, so the caption
    and the items under it cannot disagree. Not a prop and not a per-page
    string: a caption a page could pass in is a caption a page could get wrong.

    ⚠⚠ THE CONSOLE LABEL NOW DERIVES FROM THIS (`P1-J1.1-E248`) — see the note
    directly below. This paragraph used to insist the two were separate:
    *"THIS IS NOT THE CONSOLE LABEL. `consoleLabel` above says which PORTAL you are
    in and reads 'Provider Console' for buyers and sellers alike; this says which
    SIDE you are on. They answer different questions — see the WS-2 note in the brief
    and the rail section of casing_spec_LOCKED.md."*
    ⚠ SUPERSEDED BY SCOTT, quoted not deleted. Reading `Provider Console` over a
    `BUYER` caption and a buyer menu is not answering a different question — it is
    answering the same one wrongly, which is what he filed.
  */
  const persona = railPersona(me, isAdmin);
  /*
    ── ⚠⚠ THE CONSOLE LABEL FOLLOWS THE PERSONA (`P1-J1.1-E248`) ────────────────

    Scott, on a requester's first signed-in screen: the rail read `Provider Console`
    under the wordmark while the group label directly beneath it read `BUYER`, above
    a buyer rail. A requester was being told they were in the provider console.

    ⚠ SUPERSEDED, quoted not deleted, and it sat ABOVE `persona` so the two could
    never agree:
        const consoleLabel = isAdmin ? "Platform Console" : "Provider Console";
    The note beside `persona` even recorded the split as deliberate — *"THIS IS NOT
    THE CONSOLE LABEL. `consoleLabel` above says which PORTAL you are in and reads
    'Provider Console' for buyers and sellers alike; this says which SIDE you are
    on."* ⚠ THAT DISTINCTION IS WHAT SCOTT REJECTED: a portal name that contradicts
    the caption and the menu under it is not answering a different question, it is
    answering the same one wrongly.

    ⚠⚠ DERIVED FROM `persona`, NOT FROM A SECOND TEST. `railPersona` already reads
    the SAME inputs the menu does (`isSellerSide` plus the `isSystemAdmin` session
    bit), so the label, the caption and the items cannot disagree — one source of
    truth (`P1-J4-E024`). ⚠ DO NOT re-derive this from `me.person.roles` here; that
    is the second test this replaced.

    ⚠⚠ THE DUAL-ROLE RULE IS UNCHANGED AND IS PRESERVED BY CONSTRUCTION. Somebody
    holding BOTH actor flags gets `SELLER` from `railPersona` — because
    `menuForUserClass` gives them `PROVIDER_NAV` — so they still read
    `Provider Console`. Nothing here alters that; it inherits it.
    ⚠ `null` PERSONA (no `me` yet) TAKES THE BUYER LABEL, deliberately: `isSellerSide`
    is false for an unprofiled user, so the rail is already rendering `REQUESTER_NAV`
    underneath. Falling back to `Provider Console` there would be the same defect.

    ⚠⚠ `Buyer Console` IS PROVISIONAL AND IS CHAT'S, NOT SCOTT'S. He has not chosen
    the buyer-side wording. It uses the persona name the code already has (`BUYER`)
    in the shape the other two labels use (`Platform Console`, `Provider Console`).
    Reported at `E248` as provisional so he can name it.
  */
  const consoleLabel =
    persona === "PANAMEER"
      ? "Platform Console"
      : persona === "SELLER"
        ? "Provider Console"
        : "Buyer Console";
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

    ⚠⚠ SUPERSEDED 2026-09-13, QUOTED NOT DELETED (`E164` / `P1-A1.5-E475`):

      "All 15 items + 2 buttons + 3 group headers fit a 768px viewport without
       scrolling at these metrics, so the collapsible-group fallback is not
       needed."

    ⚠ THAT GUARANTEE WAS REAL AND IT HAS BEEN TRADED AWAY ON PURPOSE. Do not
    "fix" it back — read why first.
  */
  /*
    TWO DENSITIES, ONE RAIL (E191).

    ⚠⚠ SUPERSEDED 2026-09-13, QUOTED NOT DELETED (`E164`):

      "…the comment above is the reason it must stay tight — that budget is what
       keeps 'Platform Admins' on screen at 768px without scrolling. Giving both
       the roomier metrics would have bought the provider the design and cost the
       admin the property the density was measured for, so density is a parameter
       rather than a re-tune."

    ⚠ THE MECHANISM SURVIVES — `dense` IS STILL A PARAMETER and the app rail is
    untouched. What changed is only what the ADMIN branch passes.

    ── WHY THE 768px BUDGET WAS GIVEN UP ───────────────────────────────────────

    1. ⚠ THE ADMIN CONSOLE IS DESKTOP WORK, decided after that budget was set —
       `2. Claude Sub-Files/work_surface_model.md`: *"the admins are not likely
       to be managing users on their mobile."* A 768px-tall viewport was a fair
       worst case while nobody had decided. It is not the case to optimise for.
    2. ⚠⚠ MEDLINQ'S OWN RAIL SCROLLS. *"Signed in As / Paul Ingrao"* is cut off
       at the bottom of the screenshot Scott sent as the thing that *"looks so
       much nicer"*. The look and the no-scroll rule were never both true in the
       reference either.

    ── ⚠ THE MEASURED NUMBERS THAT REPLACE THE CLAIM ───────────────────────────

    Chromium, signed in as admin at /admin, ⚠ DEV BANNER DISMISSED, 1440 wide.
    18 links (16 nav + 2 buttons), 4 headers (persona + 3 groups):

                              BEFORE (dense)      AFTER
      label                   15px / 22px         14px / 20px
      row height              28px                36px
      pitch                   29px                ⚠ 38px  (Medlinq exactly)
      rail width              248px               240px
      nav CONTENT height      636px               ⚠ 839px   (+203px)
      last item on screen
      without scrolling       ⚠ down to 730px     ⚠ down to 940px

    ⚠⚠ SO THE REPLACEMENT FOR THE 768px CLAIM IS: THE ADMIN RAIL NOW NEEDS A
    940px-TALL VIEWPORT TO SHOW "Platform Admins" WITHOUT SCROLLING. Below that
    it scrolls, and that is accepted, not a regression to fix.

    ⚠ THE BRIEF ESTIMATED +145px. It is +203px — chat's arithmetic was low by
    58px, which is exactly why the brief said to measure rather than quote it.

    ⚠ ONLY THE `<nav>` SCROLLS, VERIFIED AT A 600px-TALL VIEWPORT: the `<aside>`
    itself does not scroll (`scrollHeight === clientHeight`) and the brand block
    stays pinned at top 0 with the nav scrolled to its end. The logo never
    leaves the screen — that was the brief's stop condition and it does not fire.
  */
  /*
    ── ⚠⚠ THE ADMIN RAIL TAKES MEDLINQ'S METRICS (`P1-A1.5-E475`) ─────────────

    **SCOTT, 2026-09-13:** *"the medlinq menu looks so much nicer then the
    panameer menu… It would be great if the panameer menu looked more like the
    medlinq menu (fonts, spacing)."* **AND, side by side at the same zoom:**
    *"Looks like size of rail and font."*

    ⚠⚠ MEASURED FROM MEDLINQ'S OWN SOURCE, NOT FROM A SCREENSHOT:
    `Medlinq/medlinq-app/src/components/Sidebar.tsx:153` is
    `gap-3 rounded-xl px-3 py-2 text-sm font-medium`, its icon is `h-[18px]`
    (`:174`), and its rows are wrapped in `space-y-0.5` (`:301`).
    ⚠ `text-sm` IS 14px/20px — so the brief's ~14px estimate was RIGHT, and this
    is now a measurement rather than a guess. Row = 20 + 8 + 8 = 36px, gap 2px,
    ⚠ PITCH 38px.

    ⚠⚠ THE FONT SIZE AND THE ICON GAP MOVED INSIDE THE `dense` TERNARY, and that
    is the whole reason this is safe. They were on the SHARED line, so the brief's
    "label 15px → 14px" and "gap-2 → gap-3" would have silently re-typed the APP
    rail too — the one Scott has already approved and the brief says twice not to
    touch. ⚠ THE NON-DENSE BRANCH IS THE OLD STRING, UNCHANGED: `gap-2 py-[7px]
    text-[15px] leading-[22px]`.
  */
  const link = (active: boolean, dense: boolean) =>
    "flex items-center whitespace-nowrap rounded-[8px] px-2.5 " +
    (dense
      ? "gap-3 py-2 text-[14px] leading-[20px] "
      : "gap-2 py-[7px] text-[15px] leading-[22px] ") +
    "font-medium transition-colors " +
    /*
      E217 — ONE RULE. Active is a SOLID fill; the translucent wash is reserved
      for hover and nothing else. Before this, hover and active were both
      "magenta-ish areas" and the only difference was opacity, so a hovered item
      read as half-selected. Now: solid = you are here, translucent = your
      pointer is here.
    */
    (active
      ? "bg-rail-active text-white"
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
        /*
          ⚠ THE TYPE MATCHES THE NAV ROWS (`E475`), THE TREATMENT DOES NOT.
          ⚠⚠ NOT IN THE BRIEF'S LIST, AND ADDED ON EVIDENCE: measured after the
          first pass, these two buttons were still `text-[15px] gap-2` while
          every row below them had become 14px — and being the widest thing left
          in the rail, "Panameer Dashboard" was setting the minimum rail width
          at the OLD font size. Medlinq settles it: its equivalent top button
          (`Sidebar.tsx:354`) is `gap-3 px-3 py-2 text-sm` — byte-for-byte the
          metrics of its nav rows (`:153`).
          ⚠ THE OUTLINE/FILL RULE IS UNTOUCHED — border + faint wash, never
          solid unless active, so exactly one thing in the rail is ever filled.
          `py-[5px]` also stays: these sit closer together than nav rows by
          design.
        */
        "flex items-center gap-3 whitespace-nowrap rounded-[8px] border px-2.5 py-[5px] " +
        "text-[14px] font-medium leading-[20px] transition-colors " +
        (isActive(item.href)
          ? "border-rail-active bg-rail-active text-white"
          : "border-white/15 bg-white/[0.06] text-white/90 hover:bg-white/[0.12] hover:text-white")
      }
    >
      <RailIcon name={item.icon} />
      <span className="truncate">{item.label}</span>
    </Link>
  );

  /*
    ⚠ THE IDENTITY BLOCK IS GONE FROM THE RAIL — E214 REVERSED, deliberately.

    It was pinned bottom-left here on the "three zones" argument: the org up
    top, the work in the middle, you at the bottom. That reasoning still reads
    well; the call is simply that the account menu is a UNIVERSAL control and
    the universal controls now live in the top bar together.

    ADMINS ARE COVERED, which was E214's actual worry — the note here said a
    Panameer employee would lose their only route to My Profile and Sign Out if
    the menu were not in the rail. That was true when the admin console had its
    own chrome. It does not: `src/app/admin/layout.tsx` renders the same
    `AppShell`, so admin and provider get the same header and the same menu.
    Checked before removing this, not assumed.
  */
  /*
    Same metrics as the admin rail's existing group headers, so the caption
    joins a typographic family the rail already has rather than introducing a
    fourth label size. The mockup's `.railcap` is 9.5px/1.4px tracking; this is
    10.5px/0.09em, which is the app's own equivalent and already on screen two
    inches below on every admin page.
  */
  const personaCaption = persona && (
    <p className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white/40">
      {persona}
    </p>
  );

  const nav = isAdmin ? (
    <>
      {personaCaption}
      <div className="mt-1 space-y-1.5">
        {adminButton(ADMIN_SETUP)}
        {adminButton(ADMIN_HOME)}
      </div>

      {/*
        ── ⚠ THE GROUP HEADERS ARE THE OTHER HALF OF IT (`E475` WS-2) ──────────

        ⚠⚠ THE BRIEF SAID MEDLINQ'S HEADERS HAVE "sentence case, NO TRACKING".
        ⚠ HALF OF THAT IS WRONG, AND THE SOURCE SETTLES IT. `Sidebar.tsx:183` is
        `mb-2 px-3 text-[10px] font-semibold tracking-widest` — `tracking-widest`
        is 0.1em, which is MORE letter-spacing than Panameer's 0.09em, not none.
        ⚠⚠ WHAT ACTUALLY DIFFERS IS THE CASE: Medlinq renders `Applications`,
        `Setup`, `Support` as written; Panameer shouted `TRANSACTION DATA` through
        a CSS `uppercase`.
        ⚠ SO `uppercase` GOES AND THE TRACKING STAYS. Dropping both would have
        walked past the reference design on the strength of a screenshot.
        ⚠ `nav.ts` ALREADY STORES THEM TITLE-CASED (`title: "Transaction Data"`),
        so no string changes — the CSS was doing the shouting.

        ⚠ AIR ABOVE THE HEADER: `mt-2` (8px) → `mt-6` (24px), because Medlinq
        wraps its groups in `space-y-6` (`:300`), and `pb-0.5` → `pb-2` to match
        its `mb-2`. ⚠ THE BRIEF ESTIMATED `mt-4`; 24px is what the reference
        actually uses, and the brief's own rule is to measure rather than trust
        its table.
        ⚠ `space-y-px` → `space-y-0.5`, Medlinq's 2px, so the 38px pitch is
        36px of row plus 2px of gap exactly as the reference builds it.
      */}
      {ADMIN_NAV.map((group) => (
        <div key={group.title ?? "x"} className="mt-6">
          {group.title && (
            <p className="px-2.5 pb-2 text-[10.5px] font-semibold tracking-[0.09em] text-white/40">
              {group.title}
            </p>
          )}
          <div className="space-y-0.5">{group.items.map((i) => railLink(i))}</div>
        </div>
      ))}
    </>
  ) : (
    <>
      {/*
        ⚠ THE UTILITY ROW IS GONE — E207/E208/E209 REVERSED. Search, Home and
        Notifications are in the top bar again; the rail is the six role
        transactions and nothing else.

        E216 still holds — PLAIN LINKS, NO FLYOUTS, NO CHEVRONS. The six items
        each had a hover submenu once; those children are their destination
        pages' tab rows now (`PAGE_TABS` in nav.ts).

        E224 still holds too — no "TRANSACTIONS" heading above them. With the
        utility row removed there is no longer a second group to divide from, so
        the hairline that used to separate the two goes with it: a divider above
        the only list on the rail separates it from nothing.
      */}
      {/*
        E206/E211 — the separate "Provider Dashboard" button used to sit here.
        It pointed at /dashboard, which the utility row's "Home" already does,
        so the rail lit two magenta pills at once for one destination. Home in
        the utility row is the single landing entry now.

        E216 — PLAIN LINKS, NO FLYOUTS, NO CHEVRONS. The six Transaction items
        each had a hover submenu; those children are their destination pages'
        tab rows now (`PAGE_TABS` in nav.ts). Nothing flies out of the rail, so
        nothing here needs a disclosure affordance.

        E224 — AND NO "TRANSACTIONS" HEADING above them, which is what this
        spacing is about. The `mt-6` that used to sit here was measured to clear
        a heading; with the heading gone it was 24px of nothing, and the six
        items read as a detached second list rather than the continuation of the
        first.

        A HAIRLINE INSTEAD OF A GAP. The two groups genuinely are different —
        three things you reach for from anywhere, then the six things you do —
        so the break is worth marking; it just is not worth a heading or an
        empty block. Same `border-white/10` the identity block already uses, with
        symmetric 8px either side, so the rail has one rhythm from top to bottom:
        4px between items, 8px across a divider.
      */}
      {personaCaption}
      <div className="space-y-1">
        {items.map((i) => railLink(i, false))}
      </div>
    </>
  );

  const brand = (
    <Link
      href={isAdmin ? ADMIN_HOME.href : "/dashboard"}
      aria-label="Panameer home"
      className="block px-1"
    >
      {/*
        ── ⚠⚠ THE LOCKUP NOW CARRIES THE SEGMENTED-SQUARE MARK (`P1-ALL-E397`) ──

        ⚠ SUPERSEDED, QUOTED NOT DELETED — this read:
            *"E002 CLOSED — the new looped-P wordmark, on-dark variant (white
            letters), from 4. Logo. The old thin lowercase mark is gone."*
        E002 IS STILL CLOSED and the old thin lowercase mark is still gone; what
        changed is that the LOOPED-P is gone too. `P1-ALL-E391` put the segmented
        square in the browser tab and stopped, because no transparent lockup
        carrying it existed — so the app showed TWO DIFFERENT MARKS, a square in
        the tab and a looped P in this rail. This closes that.

        ⚠⚠ THE MARK IN THIS LOCKUP IS THE COMPRESSED RAMP, NOT THE 512, AND THAT
        IS DELIBERATE. This renders at `h-7` = 28px, which is icon territory: at
        that size the full ramp's palest segments fall within a few units of the
        canvas and the ring reads as broken — the same failure `E391` measured for
        the favicon. ⚠ DO NOT regenerate it from the 512 to make it "consistent".
        MEASURED: the lockup's palest ring pixel is rgb(255,192,255), 24 channel
        units from `panameer-mark-32.png`'s reference; the full 512 is 69 away.
        `check:brand-assets` asserts that by COMPARING PIXELS, not the filename.

        ⚠ `alt="Panameer"` IS UNCHANGED — the lockup is still the wordmark and the
        accessible name has not moved.
        ⚠ THE OLD `panameer-new-on-dark.png` SURVIVES, UNTOUCHED — and since
        `P1-ALL-E403` NOTHING IN THE CODE POINTS AT IT ANY MORE. ⚠ SUPERSEDED,
        quoted: *"seven email and API callers hotlink it"* — those seven were
        repointed to the v2 lockup. ⚠⚠ THAT MAKES IT **MORE** IMPORTANT, NOT
        LESS: an asset nothing references is what a cleanup deletes, and the only
        thing still rendering it is mail somebody already received. Overwriting
        or removing it silently restyles a message from last month.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/panameer-lockup-white.png"
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
      {/*
        ── ⚠ RAIL WIDTH: 248px → 240px, AND THAT IS THE FLOOR (`E475` WS-1b) ───

        **SCOTT:** *"Looks like size of rail and font."* ⚠ Medlinq's is 220px
        (`Sidebar.tsx:253`, `w-[220px]` — measured from source, not a screenshot).

        ⚠⚠ MEASURED IN THE RUNNING APP AT 14px, SIGNED IN, BANNER DISMISSED.
        Required width = label + 18 icon + 12 gap + 20 link px-2.5 + 24 wrapper:

          Panameer Dashboard     154.4  →  228.4px   ⚠ THE BINDING CONSTRAINT
          Roles>Domains>Skills   152.7  →  226.7px
          Setup & Maintenance    150.5  →  224.5px

        ⚠⚠ THE BRIEF EXPECTED `Roles>Domains>Skills` TO BE THE CONSTRAINT. IT IS
        NOT — `Panameer Dashboard` is wider, by 1.7px. Both matter; neither alone.

        ⚠ THE MARGIN IS SIZED, NOT GUESSED. Montserrat loads at 400/600 but the
        label asks for `font-medium` (500), so the rendered face can legitimately
        be either. Worst case across 500/600 is 157.7 → ⚠ 231.7px. At 240 that
        leaves 8.3px of headroom against the widest label in the worst weight.
        ⚠ THE HARD REQUIREMENT AT THE TOP OF THIS FILE STILL HOLDS: nothing wraps
        and nothing clips — verified, zero labels overflow at 240px.
        ⚠⚠ 220px IS UNREACHABLE while these three labels exist at this size. That
        is a LABEL question, not a width question — see the report.

        ⚠ SAFE FOR `AppHeader`: its breakpoint derivation subtracts the rail from
        the viewport, so every available width A GROWS by 8px while the required
        R is unchanged. Narrowing can only loosen that arithmetic, never tighten
        it. ⚠ Its comment's totals are superseded in place there.
      */}
      <aside className="hidden w-[240px] shrink-0 bg-rail lg:block">
        <div className="sticky top-0 flex h-screen flex-col px-3 py-4">
          {brand}

          {/*
            ⚠ THE COMPANY CHIP IS GONE (E099), AND THAT REVERSES E225.

            Zone 1 was org context: a popover of company surfaces for admins, a
            plain link for everyone else. E225 had removed "My Company" from the
            personal menu and this chip was built as its replacement; Scott
            reversed that on 2026-08-15 and chose ONE door, in the account menu.
            Both behaviours moved intact — see the My Company block in
            `AccountMenu.tsx`. `CompanyMenu.tsx` is deleted; the rail was its
            only caller.

            The rail is now the persona caption and the work, which is also why
            the caption reads better than it did with a chip above it.
          */}
          <nav className="mt-3 min-h-0 flex-1 overflow-y-auto">{nav}</nav>
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
          </div>
        )}
      </div>
    </>
  );
}
