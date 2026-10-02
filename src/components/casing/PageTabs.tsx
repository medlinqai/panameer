import "./page-tabs.css";
import Link from "next/link";
/*
  ⚠⚠⚠ THE DISC AND THE CONNECTOR MOVED OUT, AND NOTHING ABOUT THEM CHANGED
  (brief 9 WS-C item 1). ⚠ They were written inline here, which made this
  application's one visual language for a staged sequence **unavailable to the
  next surface that needed it** — `E585`, third time in this run.
  ⚠⚠ `/learn/<slug>`'s stage rail is the first consumer, and it could not be a
  `PageTabs` CALL because every item here is a `<Link href>` while `Enrolled` is
  a state with no destination. **One vocabulary, two components** — see
  `StepDisc.tsx`, which also records why the WORK record had nothing to reuse.
  ⚠ SUPERSEDED, quoted not deleted (`E164`) — both bodies now live in that file:
  //   <span aria-hidden className={"grid h-[22px] w-[22px] … " + (active
  //     ? "bg-magenta text-white" : done ? "bg-emerald-600 text-white"
  //     : "bg-ink-2/12 text-ink-2")}>{done ? "✓" : t.n}</span>
  //   <span aria-hidden className="h-px w-3 shrink-0 bg-line sm:w-4" />
*/
import { StepDisc, StepConnector } from "@/components/casing/StepDisc";

/**
 * The tab row a flattened rail item's children become (E216), now carrying the
 * journey's sequence where it has one (`P1-ALL-E378`).
 *
 * WHY THIS EXISTS. The six Transaction rail items each carried a hover flyout
 * of children, and the Find Work flyout was the clearest sign it was the wrong
 * shape: its five entries were the Find Work page's own tab row, listed a
 * second time in a menu. Two controls for one set of views, one of which you
 * had to discover by hovering.
 *
 * So the children come DOWN onto the page they belong to. A tab row is visible
 * on arrival, says where you are as well as where you can go, survives a
 * bookmark, and cannot be clipped by the rail — which the flyouts were, until
 * they had to be portalled out.
 *
 * SERVER COMPONENT, LINKS NOT BUTTONS. Every one of these views is a distinct
 * URL, so they are navigations; making them client-side state would cost the
 * back button and the ability to link someone to "my proposals".
 *
 * ── ⚠⚠ THE AFFORDANCE, AND A CORRECTION TO THE BRIEF'S PREMISE ────────────
 *
 * `E378` states that *"the active tab is signalled by COLOUR ALONE — magenta
 * text, nothing else."* ⚠ THAT WAS NOT TRUE OF THIS FILE. The active tab
 * already carried `border-b-2 border-magenta`, inactive tabs already carried
 * `border-transparent` at the same width so nothing shifted, and `-mb-px`
 * already pulled it onto the hairline. REPORTED AT `E378` RATHER THAN SILENTLY
 * "FIXED": the underline existed and the accessibility gap the brief describes
 * was already closed.
 *
 * ⚠ WHAT ACTUALLY CHANGED IS THE WEIGHT: 2px -> 2.5px, as specified. Plus
 * `aria-current="page"`, which was already here and is what a screen reader
 * actually announces — colour and thickness are both invisible to it.
 *
 * ⚠ NOT PILLS, AND THE COST WOULD HAVE LANDED ON LEARN. On the LEARN catalog a
 * pill FILTERS the list beneath it; reusing that shape to NAVIGATE would teach
 * one shape two meanings.
 *
 * ── ⚠⚠ THREE MODES. A SET DECLARES ITS OWN, IN `nav.ts`. ──────────────────
 *
 *   `process`   numbers + connectors + done/current/upcoming
 *   `suggested` numbers + connectors, ⚠ NO STATE
 *   `none`      plain tabs
 *
 * ⚠⚠ `suggested` HAS NO DONE STATE AND THAT IS THE WHOLE POINT. You never
 * finish "check your messages" — you do it again tomorrow, so a tick beside it
 * asserts something false. It is NOT a third pattern: it is exactly the
 * treatment the PUBLIC spine already uses — numbered, no state, because a
 * promise has no state. One pattern, two placements.
 * ⚠ THE TYPE ENFORCES IT: `done` is only read when the mode is `process`, and
 * `check:community` asserts a `suggested` set can never render one.
 *
 * ⚠ `process` FOLLOWS LEARN'S EXISTING RULE — colour ONLY where there is
 * progress. Scott, on the LEARN home: *"coming in to a bunch of what look like
 * incomplete tiles is not a good look."* A member with nothing done sees plain
 * numbered steps, not five things they have failed to do.
 *
 * ⚠⚠ UPCOMING STEPS STAY CLICKABLE. GREYING IS A STATE, NOT A LOCK. A
 * certificate comes from passing the test with no lesson precondition
 * (`learn-assessment.ts:890`) — a locked tab would contradict the product.
 * Every tab is a `<Link>` in every mode; nothing here renders a disabled one.
 *
 * ── ⚠ MOBILE: THE STRIP SCROLLS SIDEWAYS. NO DROPDOWN. ────────────────────
 *
 * A menu hides the set, and being able to SEE the set is the entire job of the
 * row. Oracle Cloud scrolls; so does the rest of the web.
 *   · `overflow-x-auto` was already here and stays.
 *   · ⚠ THE RIGHT EDGE FADES, so a cut-off row is visibly cut off rather than
 *     looking like the end of the list. Pointer-events-none so it cannot eat a
 *     tap on the tab underneath.
 *   · ⚠ HIT TARGETS: `min-h-[44px]` with `py-2.5`, so a numbered tab clears 44px
 *     without the row growing on desktop.
 *   · ⚠ THE ACTIVE TAB IS SCROLLED INTO VIEW by the browser itself — this is a
 *     SERVER COMPONENT and adding `useEffect` would make the whole row client.
 *     `scroll-mt` plus the anchor's own focus behaviour handles the common case;
 *     REPORTED at `E378` as the one part of WS-5 that is not JS-driven.
 */
export type PageTab = {
  label: string;
  href: string;
  /** Matched against the current path+query to pick the active tab. */
  match?: string;
  /** ⚠ Step number in a sequenced set. Absent = deliberately unnumbered. */
  n?: number;
  /** ⚠ Readiness pill, moved off the duplicate section cards (`E378`). */
  state?: "live" | "early";
  /**
   * ⚠⚠ AN UNREAD COUNT (`P1-ALL-E379`). ZERO MUST RENDER NOTHING — the caller
   * passes `undefined`, never `0`. A "0" badge is a fabricated number in the
   * same family as a `$0` rate: it reports an absence as a measurement. Same
   * rule as `declinedCount`, which renders nowhere at all.
   * ⚠ THE TYPE CANNOT ENFORCE IT, so `check:messages` does.
   */
  badge?: number;
  /**
   * ⚠⚠ ONLY EVER READ IN `process` MODE. A `suggested` set passing this is
   * ignored by construction rather than by discipline — see `renderState`.
   */
  done?: boolean;
};

export type TabSequence = "process" | "suggested" | "none";

export function PageTabs({
  tabs,
  current,
  sequence = "none",
  className = "",
  children,
  eyebrow,
  wrap = false,
}: {
  tabs: PageTab[];
  /** The active tab's `match` (or href). Resolved by the page, which knows its
   *  own query string; this component stays free of client hooks. */
  current: string;
  /** ⚠ Declared by the set in `nav.ts` via `tabSequenceFor()`, never guessed. */
  sequence?: TabSequence;
  className?: string;
  /**
   * ── ⚠⚠⚠ WRAP INSTEAD OF SCROLL (`P2-A2-E609`) ───────────────────────────
   *
   * ⚠ MEASURED AT 390px: the Settings row cut *"Profile Setti…"* in half.
   * ⚠⚠ IT IS NOT ELLIPSIS TRUNCATION — the row is `overflow-x-auto` with
   * `whitespace-nowrap`, so the label is whole and the SCROLLER's edge slices
   * it. **A word cut mid-stroke with no affordance reads as broken, not as
   * scrollable**, which is the defect: nothing tells the member to swipe.
   * ⚠⚠ THE COMPONENT'S OWN COMMENT CLAIMED *"No tab is truncated and none is
   * dropped"*. That was true of the DOM and false on the screen — corrected in
   * `SettingsTabs`, because the stated rule is the half that misleads next.
   *
   * ⚠⚠⚠ OPT-IN, DEFAULT `false`, SO NO OTHER TAB ROW MOVES. `PageTabs` is
   * shared chrome — Connect, the profile row, Learn. Changing the default would
   * restyle every one of them inside a Settings brief.
   * ⚠ WRAP RATHER THAN SHORTEN: shortening the labels would also shorten every
   * page HEADING, because `SETTINGS_NAV` is deliberately one definition for
   * both — and it would still only make clipping *less likely* at 360, never
   * impossible. Wrapping makes it impossible.
   */
  wrap?: boolean;
  /** Trailing controls — a Filters button, a count. Sits after the tabs. */
  children?: React.ReactNode;
  /**
   * ── ⚠⚠ THE EYEBROW (`P2-J3-E557` WS-A) ──────────────────────────────────
   *
   * ⚠ A short label at the LEFT of the row, separated by a rule.
   * ⚠⚠ IT IS WHAT STOPS THE TABS READING AS A PAGE-LEVEL SEQUENCE. Once the
   * numbers come off a set, a bare row of words is ambiguous — it could be
   * steps, filters, or siblings. Naming the ROOM at the left makes them
   * obviously siblings within it.
   * ⚠ OPTIONAL, and every other row omits it: this is a room label, not a
   * decoration, and a row that does not name a room must not grow one.
   */
  eyebrow?: string;
}) {
  const numbered = sequence === "process" || sequence === "suggested";

  return (
    /* ⚠ `relative` carries the fade; the scroller keeps the hairline.
       ⚠⚠ `isolate` MAKES THIS A STACKING CONTEXT, AND IT IS REQUIRED BY THE BAND
       BELOW (`P2-A1.1-E751`). The band is `-z-10` so it paints behind the tabs;
       without a stacking context here that negative index escapes this subtree and
       the band disappears behind an ancestor's background instead. */
    <div className={"relative isolate " + className}>
      {/*
          ── ⚠⚠⚠ THE BAND, NOT JUST THE STRIP (`P2-A1.1-E751`)

          ⚠ **SCOTT, 2026-10-02, looking at `/profile`: *"tabs row still grey."***
          `E745` painted the STRIP `bg-surface`, which left a white rectangle
          floating in grey: the row read as an island, not a band.

          ⚠⚠ **MEASURED BEFORE THE FIX, THREE POINTS × THREE PAGES × TWO SCHEMES.**
          The strip's own background was already right (`rgb(255,255,255)` light /
          `rgb(23,17,40)` dark). The grey came from the SHELL showing through,
          because this wrapper is transparent and so is everything between it and
          `AppShell`'s root: above the strip = `main`'s `py-6`, beside it =
          `main`'s `px-5 sm:px-8`. Both read `rgb(250,250,250)` / `rgb(11,8,23)`.

          ⚠⚠⚠ **WHY IT IS A VIEWPORT BLEED AND NOT A NEGATIVE MARGIN, AND THIS IS
          THE LOAD-BEARING PART:** `-mx-8` would have cancelled `main`'s padding on
          the EIGHT callers where this wrapper is `main`'s first child — and been
          **wrong on `/payments`, which nests it one level deeper** (measured:
          `x=64 w=1152` against everyone else's `x=32 w=1216`). A bleed sized to an
          ancestor is a second definition of the layout, kept in step by hand
          (`E585`). ⚠ Sized to the VIEWPORT it is correct at every nesting depth.

          ⚠⚠ **THE COST OF THAT CHOICE IS PAID IN `AppShell.tsx` — `main` CARRIES
          `overflow-x-clip`.** `100vw` includes the scrollbar, so on a platform with
          classic (non-overlay) scrollbars this layer would be ~15px wider than the
          page and put a horizontal scrollbar on every logged-in screen. ⚠ `clip`
          and NOT `hidden`: `clip` does not create a scroll container, so the sticky
          asides `P2-ALL-E587` guards keep resolving to the viewport.
          ⚠ **If that class is ever removed from `main`, this layer overflows.**

          ⚠ `-top-6` cancels `main`'s `py-6`, so the band starts at the top of the
          content box; `bottom-0` ends it on the strip's own hairline, which is the
          strip's `border-b` and is NOT painted over. ⚠ Measured: every one of the
          nine tab-rendering pages puts this row at `y = main.top + 24`.

          ⚠ `aria-hidden` + `pointer-events-none`: it is paint, never a target.
          ⚠ `bg-surface`, never `bg-white` (`E723`) — it has to follow dark mode.

          ⚠⚠⚠ **`-z-10` IS NOT DECORATION — WITHOUT IT THIS LAYER COVERS THE TABS.**
          A positioned element paints AFTER all static in-flow content in the same
          stacking context, so the first version of this band — identical but for
          the z-index — painted over every tab label and over the strip's own
          hairline. ⚠ **MEASURED, which is the only reason it was caught:** the
          border row under the strip read `rgb(229,231,235)` on trunk and
          `rgb(255,255,255)` with the band, and the screenshot showed an empty
          white row where the tabs had been. ⚠ `isolate` on the wrapper above is
          what keeps `-z-10` inside this subtree.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 bottom-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-surface"
      />
      {/*
          ⚠⚠ `data-testid` IS DELIBERATE, NOT DEBRIS (`P2-J3-E591` WS-A item 9).
          ⚠ `connect-walk.spec.ts` asserted the tab row with
          `a[href^="/community"]` — a PREFIX ON A ROUTE — so the `E591` split
          would have emptied the locator and the test would have gone
          GREEN-BY-ABSENCE. ⚠⚠ A LOCATOR KEYED TO A ROUTE BREAKS ON EVERY ROUTE
          CHANGE, and the row is not a `<nav>` and has no heading, so there is
          nothing else stable to hold. ⚠ Walking up from a link to a guessed
          container is the approach `E560` already recorded as failing.
      */}
      <div
        data-testid="page-tabs"
        className={
          /*
            ── ⚠⚠⚠ THE STRIP PAINTS ITS OWN SURFACE (`P2-A1.1-E745`, lane 2 item 7)

            ⚠ **SCOTT, 2026-10-02: *"The Account Information tab strip … still has
            a light grey background. Make it white, with the thin line under it
            kept."*** ⚠⚠ **MEASURED FIRST, AND THE GREY WAS NOT THIS ELEMENT'S:**
            the strip was transparent and the grey came from the app shell's
            `bg-canvas` — `rgb(250,250,250)` light, `rgb(11,8,23)` dark. So the
            fix is to PAINT the strip, not to hunt for a background to delete.

            ⚠⚠⚠ **`bg-surface`, NEVER `bg-white`.** Scott's own instruction:
            *"Dark mode uses the theme surface token."* A hard-coded white here is
            the `E723` defect that broke `/profile` and `/providers/[id]` in dark
            mode, and `gauges.css` carries the same warning.

            ⚠⚠ **IT IS SHARED BY TWENTY CALLERS, NOT FOUR — SAY SO.** Scott
            approved the change on the understanding it hits *"all four tabs at
            once"* (Profile · Score · Usage · Health). It is in fact rendered by 20
            files, including `/community`, `/messages`, `/payments`, `/company`,
            `/my-services` and Settings. ⚠ **A PROP WOULD HAVE BEEN WORSE:** two
            tab-strip treatments drifting apart is `E585`, and the strip is chrome
            — one row, one look. ⚠ **REPORTED so it can be reverted in one line if
            he dislikes it on a page he has not walked.**
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   "-mx-1 mb-4 flex items-center gap-0.5 border-b border-line px-1 " +
          */
          "-mx-1 mb-4 flex items-center gap-0.5 border-b border-line bg-surface px-1 " +
          /* ⚠ `flex-wrap` AND NO `overflow-x-auto` — leaving the scroller on a
             wrapping row gives a container that can both wrap and scroll, which
             is neither. `items-center` becomes `items-end` so wrapped rows sit
             on the shared bottom rule rather than floating. */
          (wrap ? "flex-wrap items-end gap-y-0" : "items-center overflow-x-auto")
        }
      >
        {/* ⚠ THE EYEBROW AND ITS RULE (`P2-J3-E557`). `shrink-0` so it survives
            the horizontal scroll that the row relies on at narrow widths, and
            `aria-hidden` on the rule because it is a separator, not content. */}
        {eyebrow && (
          <>
            <span className="shrink-0 whitespace-nowrap py-2.5 pl-2 pr-3 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-2">
              {eyebrow}
            </span>
            <span aria-hidden className="mr-2 h-5 w-px shrink-0 self-center bg-line" />
          </>
        )}
        {tabs.map((t, i) => {
          const active = (t.match ?? t.href) === current;

          /* ⚠⚠ THE ONE PLACE STATE IS DECIDED, AND `suggested` CANNOT REACH IT.
             A `done` flag on a suggested set is not "ignored later" — it is
             never read, because the mode gates the expression itself. */
          const done = sequence === "process" && t.done === true && !active;

          return (
            <div key={t.href} className="flex shrink-0 items-center">
              {/* ⚠ THE CONNECTOR sits BETWEEN steps, so the first has none. It
                  is decorative and hidden from assistive tech — the numbers
                  already carry the order. */}
              {numbered && i > 0 && <StepConnector />}
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={
                  "-mb-px flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap border-b-[2.5px] px-3 py-2.5 text-[14px] font-semibold transition-colors " +
                  (active
                    ? "border-magenta text-magenta"
                    : "border-transparent text-ink-2 hover:text-ink")
                }
              >
                {/* ⚠ THE DISC survives a narrow screen better than anything
                    else in the row, which is why numbered modes keep it. */}
                {/* ⚠ A TICK IS ONLY EVER REACHABLE IN `process` — `done` above
                    is already gated on the mode, so the state passed here is. */}
                {numbered && t.n !== undefined && (
                  <StepDisc n={t.n} state={active ? "current" : done ? "done" : "upcoming"} />
                )}
                {t.label}
                {/* ⚠ ZERO RENDERS NOTHING. The `> 0` is the guard even though
                    callers already omit it — two chances to get it right. */}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-magenta px-1 text-[11px] font-bold text-white">
                    {t.badge}
                  </span>
                )}
                {/* ⚠ THE READINESS PILL, on the tab rather than on a second set
                    of cards. `early` is the only one drawn: a `live` pill on
                    everything that works is noise, and the absence of a pill
                    already means "ready". */}
                {t.state === "early" && (
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-amber-700">
                    Early
                  </span>
                )}
              </Link>
            </div>
          );
        })}
        {children && <div className="ml-auto shrink-0 pb-1 pl-3">{children}</div>}
      </div>
      {/* ⚠ THE RIGHT-EDGE FADE. `pointer-events-none` so it never swallows a tap
          on the tab beneath it. Sits above the hairline, not over it.
          ⚠⚠ **`from-surface`, NOT `from-canvas` (`P2-A1.1-E751`).** It fades the
          scroller out against WHAT IS BEHIND IT, and since `E745` that is the
          strip's own surface. Fading to canvas painted a grey block over the last
          32px of a white strip — the most visible half of *"tabs row still grey."*
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   ... w-8 bg-gradient-to-l from-canvas to-transparent
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[calc(1rem+1px)] right-0 top-0 w-8 bg-gradient-to-l from-surface to-transparent"
      />
    </div>
  );
}
