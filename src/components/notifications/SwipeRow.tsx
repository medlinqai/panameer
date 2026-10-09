"use client";

import { useRef, useState } from "react";

// N-E001: a row you can dismiss with × or (touch only) a left swipe past ~40%; shorter swipes snap back.
export function SwipeRow({ children, onDismiss, label, className = "" }: { children: React.ReactNode; onDismiss: () => void; label: string; className?: string }) {
  const [dx, setDx] = useState(0);
  const [gone, setGone] = useState(false);
  const start = useRef<{ x: number; y: number; w: number; locked: boolean | null } | null>(null);

  const dismiss = () => {
    setGone(true);
    setDx(-(start.current?.w ?? 400));
    setTimeout(onDismiss, 160);
  };

  return (
    <div className={"relative overflow-hidden " + className} data-swipe-row>
      <div aria-hidden className="absolute inset-0 flex items-center justify-end bg-ink px-4 text-[12px] font-bold uppercase tracking-[0.08em] text-surface">Dismiss</div>
      <div
        className={"relative flex items-stretch bg-white " + (start.current ? "" : "transition-transform duration-150")}
        style={{ transform: `translateX(${dx}px)`, touchAction: "pan-y" }}
        onPointerDown={(e) => {
          if (e.pointerType !== "touch" || gone) return;
          start.current = { x: e.clientX, y: e.clientY, w: e.currentTarget.offsetWidth, locked: null };
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const mx = e.clientX - s.x;
          const my = e.clientY - s.y;
          if (s.locked === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.locked = Math.abs(mx) > Math.abs(my);
          if (s.locked) setDx(Math.min(0, mx));
        }}
        onPointerUp={() => {
          const s = start.current;
          start.current = null;
          if (!s) return;
          if (s.locked && -dx > s.w * 0.4) dismiss();
          else setDx(0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDx(0);
        }}
        onClickCapture={(e) => {
          if (dx !== 0) e.preventDefault();
        }}
      >
        <div className="min-w-0 flex-1">{children}</div>
        <button type="button" aria-label={`Dismiss: ${label}`} data-dismiss-x onClick={dismiss} className="grid w-10 shrink-0 place-items-center text-[18px] leading-none text-ink-3 hover:text-ink">
          ×
        </button>
      </div>
    </div>
  );
}
