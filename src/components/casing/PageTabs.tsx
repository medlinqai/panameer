import Link from "next/link";

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
}: {
  tabs: PageTab[];
  /** The active tab's `match` (or href). Resolved by the page, which knows its
   *  own query string; this component stays free of client hooks. */
  current: string;
  /** ⚠ Declared by the set in `nav.ts` via `tabSequenceFor()`, never guessed. */
  sequence?: TabSequence;
  className?: string;
  /** Trailing controls — a Filters button, a count. Sits after the tabs. */
  children?: React.ReactNode;
}) {
  const numbered = sequence === "process" || sequence === "suggested";

  return (
    /* ⚠ `relative` carries the fade; the scroller keeps the hairline. */
    <div className={"relative " + className}>
      <div className="-mx-1 mb-4 flex items-center gap-0.5 overflow-x-auto border-b border-line px-1">
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
              {numbered && i > 0 && (
                <span aria-hidden className="h-px w-3 shrink-0 bg-line sm:w-4" />
              )}
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
                {numbered && t.n !== undefined && (
                  <span
                    aria-hidden
                    className={
                      "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[12px] font-bold " +
                      (active
                        ? "bg-magenta text-white"
                        : done
                          ? "bg-emerald-600 text-white"
                          : "bg-ink-2/12 text-ink-2")
                    }
                  >
                    {/* ⚠ A TICK IS ONLY EVER REACHABLE IN `process`. */}
                    {done ? "✓" : t.n}
                  </span>
                )}
                {t.label}
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
          on the tab beneath it. Sits above the hairline, not over it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[calc(1rem+1px)] right-0 top-0 w-8 bg-gradient-to-l from-canvas to-transparent"
      />
    </div>
  );
}
