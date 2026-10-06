"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";

export function FlipCard({
  front,
  back,
  backLabel,
  initialBack = false,
  title,
}: {
  front: ReactNode;
  back: ReactNode | null;
  backLabel?: string;
  initialBack?: boolean;
  title: string;
}) {
  const [flipped, setFlipped] = useState(initialBack);
  const id = useId();

  if (!back) return <>{front}</>;

  const showing = flipped ? "back" : "front";
  return (
    <div className="pm-flip" data-showing={showing}>
      {}
      <div className="pm-flip-faces">
        {}
        <div
          className={flipped ? "pm-flip-hidden" : "pm-flip-face"}
          id={`${id}-front`}
          aria-hidden={flipped}
        >
          {front}
        </div>
        <div
          className={flipped ? "pm-flip-face" : "pm-flip-hidden"}
          id={`${id}-back`}
          aria-hidden={!flipped}
        >
          {back}
        </div>
      </div>
      {/* Bottom-right — the infolet position. A REAL TAP TARGET on a phone */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-controls={flipped ? `${id}-back` : `${id}-front`}
        className="pm-flip-toggle"
        title={flipped ? `Back to ${title}` : backLabel ? `${title}: ${backLabel}` : title}
      >
        {/* The accessible name says what the control DOES and to which card — */}
        <span className="sr-only">
          {flipped ? `Show ${title} figures` : `Show ${backLabel ?? "more"} for ${title}`}
        </span>
        <span aria-hidden className="pm-flip-glyph">
          {/* A corner fold, drawn in our tokens. Not an Oracle icon. */}
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
            <path
              d="M2 8.5 A6.5 6.5 0 0 1 13.5 4.6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M13.8 1.8v3.2h-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
    </div>
  );
}
