"use client";

import { useId, useRef, useState, type ReactNode } from "react";

/**
 * THE FOUR BEATS AS A TAB CAROUSEL (E076).
 *
 * The four beat cards ARE the tabs; the primer for the active one renders
 * underneath. This merges what would otherwise be an overview section plus four
 * long primer sections into one, which is the point: a visitor reads the map,
 * then opens exactly the territory they care about.
 *
 * ── HOW THIS KEEPS `/` STATIC WHILE BEING INTERACTIVE ────────────────────────
 *
 * Three separate things, and it is worth being precise because "add a client
 * component" is usually where static rendering quietly dies:
 *
 *  1. THE CLIENT BOUNDARY IS THIS FILE ONLY. `/` is a server component and
 *     stays one. It renders this island; Next prerenders the island's initial
 *     HTML at BUILD time and ships JS that hydrates it. Nothing here reads
 *     cookies, headers or searchParams — the three things that would force the
 *     route dynamic — so `/` still builds as ○.
 *
 *  2. EVERY PANEL IS IN THE DOM, HIDDEN WITH CSS. `hidden` on the inactive
 *     panels, not conditional rendering. A crawler and a reader-with-no-JS get
 *     all four primers in the prerendered HTML; switching tabs only flips an
 *     attribute. This is also why the panels are not lazy-loaded: the SEO value
 *     of this section is the content that would have been behind the lazy-load.
 *
 *  3. THE PANELS ARRIVE AS PROPS, NOT IMPORTS. They are built by the SERVER
 *     component that renders this and passed in as ReactNode. So the diagrams,
 *     the card copy and the links are server-rendered and never enter the
 *     client bundle — what ships is this file: some state, a keydown handler,
 *     and the tab buttons.
 *
 * ── ACCESSIBILITY ────────────────────────────────────────────────────────────
 *
 * A real tablist. `role="tablist"` on the row, `role="tab"` + `aria-selected` +
 * `aria-controls` on each card, `role="tabpanel"` + `aria-labelledby` on each
 * panel. Roving tabindex: only the active tab is in the tab order, so Tab moves
 * PAST the group rather than through four cards, and Left/Right moves between
 * them — which is what the pattern specifies and what a screen-reader user will
 * expect. Home/End jump to the ends. Enter and Space need no handler because
 * these are real <button>s.
 */

export type BeatTab = {
  /** 1–4. Rendered as the ghosted 01–04. */
  n: number;
  /** The badge word: Learn · Connect · Create · Settle. */
  word: string;
  /** The agnostic one-liner, e.g. "Learn from Experts". */
  caption: string;
};

export function BeatTabs({
  tabs,
  panels,
}: {
  tabs: BeatTab[];
  /** One per tab, same order. Server-rendered; see note 3 above. */
  panels: ReactNode[];
}) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = (i: number) => `${baseId}-panel-${i}`;

  /** Move selection AND focus together — the tablist pattern's requirement. */
  const select = (i: number) => {
    const next = (i + tabs.length) % tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        select(active + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        select(active - 1);
        break;
      case "Home":
        e.preventDefault();
        select(0);
        break;
      case "End":
        e.preventDefault();
        select(tabs.length - 1);
        break;
    }
  };

  return (
    <>
      <div
        role="tablist"
        aria-label="How Panameer works"
        onKeyDown={onKeyDown}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {tabs.map((t, i) => {
          const on = i === active;
          return (
            <button
              key={t.word}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={tabId(i)}
              aria-selected={on}
              aria-controls={panelId(i)}
              // Roving tabindex — see the note above.
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(i)}
              className={
                "relative min-h-[190px] overflow-hidden rounded-[16px] p-5 text-left transition-all " +
                "bg-[linear-gradient(180deg,rgba(18,20,40,0.15),rgba(18,20,40,0.88)),linear-gradient(135deg,#3b1f6b,#8a1f88)] " +
                (on
                  ? "shadow-brand ring-2 ring-magenta"
                  : "opacity-[0.72] hover:-translate-y-0.5 hover:opacity-100")
              }
            >
              {/* The ghosted numeral, kept from the card look it replaces. */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-4 top-1 font-display text-[64px] font-bold leading-none tracking-[-3px] text-white/[0.17]"
              >
                {String(t.n).padStart(2, "0")}
              </span>

              <span className="relative flex h-full min-h-[150px] flex-col justify-end">
                <span className="font-display text-[24px] font-bold leading-none text-white">
                  {t.word}
                </span>
                <span className="mt-1.5 text-[14px] font-bold text-white/90">
                  {t.caption}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/*
        All four panels render. `hidden` is the only thing that changes, which
        is what puts every primer in the prerendered HTML.

        `animate-[fadeIn…]` re-runs on switch because React reuses these nodes —
        the keyframe is defined in globals.css, and `motion-reduce:animate-none`
        turns it off for anyone who asked.
      */}
      <div className="mt-8">
        {panels.map((panel, i) => (
          <div
            key={i}
            role="tabpanel"
            id={panelId(i)}
            aria-labelledby={tabId(i)}
            hidden={i !== active}
            className={
              i === active
                ? "animate-[fadeIn_220ms_ease-out] motion-reduce:animate-none"
                : undefined
            }
          >
            {panel}
          </div>
        ))}
      </div>
    </>
  );
}
