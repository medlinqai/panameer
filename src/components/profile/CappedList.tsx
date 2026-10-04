"use client";

import { useState } from "react";
import type { ReactNode } from "react";

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
