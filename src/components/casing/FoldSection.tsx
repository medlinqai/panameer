"use client";

import { useEffect, useState, type ReactNode } from "react";

// PJ-E001: the /profile section row, shared — title · one-line summary when closed · right action · chevron.
// Only the current step's section starts open; the choice is remembered per page in localStorage.
export function FoldSection({ id, storageKey, title, summary, action, defaultOpen = false, children }: { id: string; storageKey: string; title: string; summary?: ReactNode; action?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const key = `pm-fold:${storageKey}:${id}`;
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    try { const v = window.localStorage.getItem(key); if (v === "1" || v === "0") setOpen(v === "1"); } catch { /* storage blocked — keep the default */ }
  }, [key]);
  const toggle = () => setOpen((o) => { try { window.localStorage.setItem(key, o ? "0" : "1"); } catch { /* ignore */ } return !o; });
  return (
    <section id={id} className="scroll-mt-24 border-t border-line" data-fold={id} data-open={open ? "1" : "0"}>
      <div className="flex items-center gap-3 py-3.5">
        <button type="button" onClick={toggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <h2 className="shrink-0 text-[17px] font-bold">{title}</h2>
          {!open && summary && <span className="min-w-0 truncate text-[13.5px] text-ink-2" data-fold-summary>{summary}</span>}
        </button>
        {action && <span className="flex shrink-0 items-center gap-2">{action}</span>}
        <button type="button" onClick={toggle} aria-label={open ? `Close ${title}` : `Open ${title}`} className="shrink-0 p-1">
          <svg aria-hidden viewBox="0 0 24 24" className={`h-4 w-4 stroke-ink-2 transition-transform ${open ? "rotate-180" : ""}`} fill="none" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>
      {open && <div className="pb-5">{children}</div>}
    </section>
  );
}
