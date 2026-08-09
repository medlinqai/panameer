"use client";

import { useId, useRef, useState, type ReactNode } from "react";

/**
 * THE ONE CLIENT ISLAND ON THE BUYER PAGE (brief_home_rebuild_08_09 WS-D).
 *
 * Four tabs, four panels, and nothing else. Everything visible inside a panel
 * — the domain checklist, the KPI tiles, the maturity bar — is built by the
 * SERVER component that renders this and handed over as a ReactNode.
 *
 * ── HOW `/` STAYS STATIC ─────────────────────────────────────────────────────
 *
 *  1. THIS FILE IS THE ONLY CLIENT BOUNDARY on the route. `/` is a server
 *     component and nothing in it reads cookies, headers or searchParams — the
 *     three things that force a route dynamic — so Next prerenders the whole
 *     page, this island included, at build time and ships JS that hydrates it.
 *  2. ALL FOUR PANELS ARE IN THE DOM, hidden with the `hidden` attribute. Never
 *     conditionally rendered, never fetched on click. A crawler and a reader
 *     with no JS get all four process areas; switching tabs flips an attribute.
 *  3. THE PANELS ARE PROPS, NOT IMPORTS, so forty domain rows, sixteen KPI
 *     tiles and four maturity bars are server-rendered and never enter the
 *     client bundle. What ships is a state hook, a keydown handler, four
 *     buttons.
 *
 * This is the BeatTabs pattern, which worked; the retired carousel's lesson was
 * about what belonged on the page, not about how it was wired.
 *
 * ── ACCESSIBILITY ────────────────────────────────────────────────────────────
 *
 * A real tablist: role=tablist/tab/tabpanel with aria-selected, aria-controls
 * and aria-labelledby. Roving tabindex, so Tab steps PAST the group and
 * Left/Right move within it; Home/End jump to the ends; selection moves focus
 * with it. Enter and Space need no handler because these are real buttons.
 */

export function AssessmentTabs({
  tabs,
  panels,
}: {
  tabs: { key: string; label: string; glyph: string }[];
  /** One per tab, same order. Server-rendered — see note 3. */
  panels: ReactNode[];
}) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = (i: number) => `${baseId}-panel-${i}`;

  const select = (i: number) => {
    const next = (i + tabs.length) % tabs.length;
    setActive(next);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const map: Record<string, number | undefined> = {
      ArrowRight: active + 1,
      ArrowDown: active + 1,
      ArrowLeft: active - 1,
      ArrowUp: active - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = map[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(next);
  };

  return (
    <>
      <div
        role="tablist"
        aria-label="Choose a process area to assess"
        onKeyDown={onKeyDown}
        className="mt-9 flex gap-1.5 overflow-x-auto border-b border-line"
      >
        {tabs.map((t, i) => {
          const on = i === active;
          return (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={tabId(i)}
              aria-selected={on}
              aria-controls={panelId(i)}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(i)}
              className={
                "whitespace-nowrap border-b-[3px] px-[18px] py-3.5 text-[15px] font-semibold transition-colors " +
                (on
                  ? "border-magenta text-magenta"
                  : "border-transparent text-[#3a4266] hover:text-magenta")
              }
            >
              <span aria-hidden className="mr-1.5">
                {t.glyph}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>

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
    </>
  );
}
