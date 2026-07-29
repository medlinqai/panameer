"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Author-entered free text, rendered the way it was written (E060).
 *
 * Two problems, one component:
 *
 *  1. RUN-ON. A bio typed as three paragraphs was collapsing into one wall of
 *     text, because HTML folds newlines. Blank lines become real paragraphs and
 *     single newlines survive inside them (`whitespace-pre-line`), so what the
 *     provider typed is what a buyer reads.
 *
 *  2. NO CEILING. A 4,000-character project description pushed everything below
 *     it off the card. Long blocks clamp to `clampLines` with a Read-more
 *     toggle.
 *
 * The toggle only appears when the text ACTUALLY overflows at the current
 * width, measured rather than guessed from a character count — the same bio is
 * four lines in the main column and nine in the sidebar, and a "Read more" that
 * expands to reveal nothing is worse than no toggle at all.
 */
export function RichText({
  text,
  className = "",
  clampLines,
  /** Line height used to compute the collapsed height; matches leading-relaxed. */
  lineHeight = 1.625,
  moreLabel = "Read more",
  lessLabel = "Show less",
}: {
  text: string;
  className?: string;
  /** Omit to render in full with no toggle. */
  clampLines?: number;
  lineHeight?: number;
  moreLabel?: string;
  lessLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !clampLines) return;

    // Only meaningful while COLLAPSED: expanded, scrollHeight === clientHeight
    // by definition, which would read as "no overflow" and hide the control
    // that collapses it again.
    if (expanded) return;

    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 2);
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [clampLines, text, expanded]);

  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n\s*\n+/)
    .filter((p) => p.trim().length > 0);

  if (paragraphs.length === 0) return null;

  const collapsed = Boolean(clampLines) && !expanded;

  return (
    <div>
      <div
        ref={ref}
        className={`${collapsed ? "overflow-hidden" : ""} ${className}`}
        style={
          collapsed
            ? { maxHeight: `${clampLines! * lineHeight}em` }
            : undefined
        }
      >
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className={`whitespace-pre-line ${i > 0 ? "mt-2.5" : ""}`}
          >
            {p}
          </p>
        ))}
      </div>

      {clampLines && (overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1.5 text-[13px] font-bold text-magenta transition-colors hover:text-magenta-dark"
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  );
}
