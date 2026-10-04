"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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
      {}
      <Link
        href={`/messages?with=${toUserId}`}
        className="border border-ink bg-surface px-4 py-1.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-hover"
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
          className="border border-ink bg-surface px-3 py-1.5 text-[13.5px] font-semibold leading-none text-ink-2 transition-colors hover:bg-surface-hover text-ink"
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
