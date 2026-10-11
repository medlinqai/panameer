"use client";

import { Children, useState, type ReactNode } from "react";

// WS-E005: Show More loads the next cards in place, in the same list.
export function ShowMore({ children, step = 8, className = "" }: { children: ReactNode; step?: number; className?: string }) {
  const all = Children.toArray(children);
  const [n, setN] = useState(step);
  return (
    <>
      <div className={className}>{all.slice(0, n)}</div>
      {n < all.length && (
        <div className="mt-4 flex justify-center">
          <button type="button" data-show-more onClick={() => setN((x) => x + step)} className="inline-flex min-h-11 items-center border border-ink px-6 text-[14px] font-semibold hover:bg-surface-hover">
            Show More
          </button>
        </div>
      )}
    </>
  );
}
