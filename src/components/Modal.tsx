"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A small dialog used by the onboarding modals (brief_P): photo crop (E019),
 * résumé upload (E012), and the education editor (E015).
 *
 * Built on the native <dialog> element so focus trapping, Escape-to-close and
 * inertness of the page behind come from the platform rather than hand-rolled
 * key handlers.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clicking the backdrop (the dialog element itself, outside the panel).
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`w-[calc(100vw-2rem)] ${width} rounded-brand border border-line bg-white p-0 font-body text-ink shadow-brand backdrop:bg-black/40 backdrop:backdrop-blur-[2px]`}
    >
      <div className="p-6 sm:p-7">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-[20px] font-extrabold tracking-[-0.4px]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 grid h-8 w-8 place-items-center rounded-full text-[18px] text-ink-2 transition-colors hover:bg-bg-soft hover:text-ink"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
