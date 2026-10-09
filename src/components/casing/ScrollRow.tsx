"use client";

import { useEffect, useRef, useState } from "react";

// M-E001: one row that scrolls sideways (tabs and chips alike): right-edge fade while more is hidden, active item scrolled into view.
export function ScrollRow({
  children,
  className = "",
  wrapFrom,
  label,
  as = "div",
}: {
  children: React.ReactNode;
  /** Classes for the row itself (gap, border, padding). */
  className?: string;
  /** "md": wrap instead of scroll from 768px up. */
  wrapFrom?: "md";
  label?: string;
  as?: "div" | "nav";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[aria-current="page"], [aria-current="true"], [data-active="true"]');
    if (active && el.scrollWidth > el.clientWidth) {
      const left = active.offsetLeft - el.offsetLeft;
      if (left + active.offsetWidth > el.clientWidth) el.scrollLeft = left - 24;
    }
    const update = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const Tag = as;
  return (
    <div className="relative min-w-0">
      <Tag
        ref={ref as React.Ref<HTMLDivElement & HTMLElement>}
        aria-label={label}
        data-scroll-row
        className={
          "flex flex-nowrap overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
          (wrapFrom === "md" ? "md:flex-wrap md:overflow-visible " : "") +
          className
        }
      >
        {children}
        {/* Room after the last item so it can scroll clear of the fade. */}
        <span aria-hidden className={"w-6 shrink-0" + (wrapFrom === "md" ? " md:hidden" : "")} />
      </Tag>
      {more && <span aria-hidden className={"pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent" + (wrapFrom === "md" ? " md:hidden" : "")} />}
    </div>
  );
}
