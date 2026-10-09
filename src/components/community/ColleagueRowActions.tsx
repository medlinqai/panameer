"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// M-E006: every row's actions sit in one ••• menu, so every row is the same height.
const ITEM = "block w-full px-4 py-2.5 text-left text-[14px] text-ink transition-colors hover:bg-bg-soft";

export function ColleagueRowActions({
  toUserId,
  name,
  buySide,
  profileHref,
  onAskRecommendation,
}: {
  toUserId: string;
  name: string;
  buySide: boolean;
  profileHref?: string | null;
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
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${name}`}
        data-row-menu
        className="grid h-10 w-10 place-items-center border border-ink bg-surface text-[16px] font-bold leading-none text-ink transition-colors hover:bg-surface-hover"
      >
        •••
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-[240px] overflow-hidden border border-line bg-white py-1 shadow-lg">
          <Link role="menuitem" href={`/messages?with=${toUserId}`} className={ITEM}>Message</Link>
          {profileHref && <Link role="menuitem" href={profileHref} className={ITEM}>View Profile</Link>}
          <button role="menuitem" type="button" onClick={() => { setOpen(false); onAskRecommendation(); }} className={ITEM}>Request a Recommendation</button>
          {!buySide && <Link role="menuitem" href={`/connect/mentors?ask=${toUserId}`} className={ITEM}>Ask Them to Mentor Me</Link>}
        </div>
      )}
    </div>
  );
}
