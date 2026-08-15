"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

/**
 * THE LIGHTBOX — one mechanism, four scenes.
 *
 * ── WHY A HAND-ROLLED DIALOG AND NOT <dialog> ────────────────────────────────
 *
 * `showModal()` gives focus trapping and Esc for free, but it also puts the
 * scene in the top layer, where the `.pm-home` scoped stylesheet does not
 * reach — every scene style is written under `.pm-home` and would silently
 * stop applying. The trap below is a dozen lines and keeps the scenes styled.
 *
 * ── NOTHING HERE IS HOVER-ONLY ───────────────────────────────────────────────
 *
 * The cards are real <button>s, so they open on click AND on tap AND on
 * Enter/Space. Hover only adds the lift and the pan — decoration on top of an
 * affordance that already works without a pointer.
 */
export function Lightbox({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** The dialog's accessible name. */
  label: string;
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  /*
    ⚠ FOCUS RETURN IS EXPLICIT. Unmounting the dialog sends focus to <body>, not
    back to the control that opened it — a keyboard user would land at the top
    of the document and have to tab all the way back. The opener is captured on
    open and refocused on close.
  */
  const opener = useRef<HTMLElement | null>(null);

  /*
    THE TRAP. Tab from the last focusable wraps to the first and Shift+Tab from
    the first wraps to the last, so focus cannot escape to the page behind the
    dim — which is the actual requirement, not just "focus starts inside".
  */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const box = boxRef.current;
      if (!box) return;
      const focusable = box.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    /*
      The page behind must not scroll while the dialog is up — on a phone the
      backdrop scrolling under a modal is how people lose their place.
    */
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      opener.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="lb-dim"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onKeyDown={onKeyDown}
      /* Click-outside: only when the dim ITSELF is the target, so a click that
         lands on the scene and drags onto the backdrop does not close it. */
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lb-box" ref={boxRef}>
        {/* Outside the scene's top-right, so it cannot collide with scene chrome. */}
        <button ref={closeRef} type="button" className="lb-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        {children}
        <p className="lb-hint">Esc or click outside to close</p>
      </div>
    </div>
  );
}
