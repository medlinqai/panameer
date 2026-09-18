"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * ── ⚠⚠ ONE BUTTON PLUS AN OVERFLOW (`P2-J3-E558` WS-A) ────────────────────
 *
 * ⚠ SCOTT ASKED FOR THIS SHAPE, 2026-09-17, and the reason is not taste:
 * `Message` is EVERYDAY AND REPEATABLE; `Ask them to mentor me` and `Request a
 * recommendation` are ONE-TIME RELATIONSHIP ASKS. Giving them equal weight
 * spends the same pixels on an action used weekly and one used twice a year.
 * ⚠⚠ AND THREE BUTTONS ON A ROW IS EXACTLY WHAT PRODUCED THE SQUEEZE — the
 * layout bug the container queries in `member-row.css` fixed. This keeps the
 * row at ONE control at rest, so it stays inline down to 360px of card width.
 *
 * ⚠ BUY-SIDE ROWS GET THE OVERFLOW WITHOUT MENTORING. A recommendation from a
 * buyer is the strongest one there is; mentoring stays off because it is a PAID
 * ENGAGEMENT, not a peer action.
 *
 * ⚠ THE LABELS ARE PROPOSALS — the brief says so, and Scott names things.
 */
export function ColleagueRowActions({
  toUserId,
  name,
  buySide,
  onAskRecommendation,
}: {
  toUserId: string;
  name: string;
  buySide: boolean;
  onAskRecommendation: () => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  /* ⚠ CLOSES ON AN OUTSIDE CLICK AND ON Escape. A menu that only closes by
     re-clicking its own trigger traps a keyboard user. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* ⚠ `Message` IS THE VISIBLE ONE. It is also the only action here that
          already has a permission boundary in the product (`canMessage`). */}
      <Link
        href={`/messages?with=${toUserId}`}
        className="rounded-full border-[1.5px] border-line px-4 py-1.5 text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
      >
        Message
      </Link>

      <div ref={box} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`More actions for ${name}`}
          className="rounded-full border-[1.5px] border-line px-3 py-1.5 text-[13.5px] font-bold leading-none text-ink-2 transition-colors hover:border-magenta hover:text-magenta"
        >
          ···
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-[240px] overflow-hidden rounded-brand border border-line bg-white py-1 shadow-lg"
          >
            {/* ⚠⚠ MENTORING IS OMITTED ON BUY-SIDE ROWS — see the header. */}
            {!buySide && (
              <Link
                role="menuitem"
                href={`/community/mentors?ask=${toUserId}`}
                className="block px-4 py-2.5 text-left text-[14px] text-ink transition-colors hover:bg-bg-soft"
              >
                Ask Them to Mentor Me
              </Link>
            )}
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                onAskRecommendation();
              }}
              className="block w-full px-4 py-2.5 text-left text-[14px] text-ink transition-colors hover:bg-bg-soft"
            >
              Request a Recommendation
            </button>
          </div>
        )}
      </div>
    </>
  );
}
