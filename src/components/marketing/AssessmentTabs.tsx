"use client";

import { useId, useRef, useState, type ReactNode } from "react";

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
