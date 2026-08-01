"use client";

import { useState } from "react";
import type { ReactNode } from "react";

/**
 * A capped list with an expandable tail (walk7 WS5).
 *
 * Takes ALREADY-RENDERED items, not a render function. The first cut passed a
 * `children(shown)` callback, which is fine inside one bundle and fatal across
 * the server/client boundary — React can't serialize a function as a prop, and
 * the "You're live" page 500'd with "Functions are not valid as a child of
 * Client Components". Elements serialize; closures don't.
 *
 * "N more — pending" is the brief's wording and it earns its place: it reads as
 * "still being reviewed" rather than "we dropped some", which matters on the one
 * page whose job is to reassure someone that what they published is whole.
 *
 * With no cap this is a plain <ul> and costs nothing.
 */
export function CappedList({
  items,
  cap,
  className = "space-y-7",
}: {
  items: ReactNode[];
  cap?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!cap || items.length <= cap) {
    return <ul className={className}>{items}</ul>;
  }

  const overflow = items.length - cap;
  return (
    <div>
      <ul className={className}>{expanded ? items : items.slice(0, cap)}</ul>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-6 w-full rounded-[12px] border border-dashed border-line px-4 py-3 text-[14px] font-bold text-ink-2 transition-colors hover:border-magenta hover:text-magenta"
      >
        {expanded ? "Show fewer" : `${overflow} more — pending`}
      </button>
    </div>
  );
}
