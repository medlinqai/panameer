"use client";

import { useState } from "react";

// TX2-E004: a small "?" next to a label that shows a plain-words description (examples) on click.
export function HelpTip({ text, label }: { text: string | null | undefined; label: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <span className="relative inline-block align-middle">
      <button type="button" aria-label={`What is ${label}?`} aria-expanded={open} onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }} onBlur={() => setOpen(false)} data-help-tip className="ml-1.5 grid h-[18px] w-[18px] place-items-center rounded-full border border-ink-3 text-[11px] font-bold leading-none text-ink-2 hover:border-ink hover:text-ink">
        ?
      </button>
      {open && (
        <span role="tooltip" className="absolute left-0 top-6 z-20 block w-64 border border-line bg-white p-2.5 text-[12.5px] font-normal normal-case leading-snug tracking-normal text-ink-2 shadow-sm">
          <b className="block text-ink">{label}</b>
          {text}
        </span>
      )}
    </span>
  );
}
