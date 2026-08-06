"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

/**
 * A floating panel anchored to a trigger, rendered into `document.body`
 * (E212, E213).
 *
 * WHY A PORTAL, AND WHY THIS EXISTS AT ALL. The rail's flyouts were positioned
 * `absolute left-full` inside `<nav class="overflow-y-auto">`, and that is the
 * whole of E213: once either axis of `overflow` is not `visible`, CSS computes
 * the other one to `auto` as well, so a panel sticking out of the right edge of
 * a vertically-scrolling column is CLIPPED. No z-index can fix that — the panel
 * was not behind the content, it had been cut off at the rail's edge. Rendering
 * into the body escapes the clip and the stacking context in one move.
 *
 * POSITION IS WRITTEN TO THE DOM, NOT HELD IN STATE. Measuring the anchor and
 * calling setState from a layout effect is exactly the cascading-render pattern
 * this repo lints as an error, and it would also paint the panel once at 0,0
 * before moving it. The panel is `position: fixed` and its `left`/`top` are
 * assigned directly to the node, so there is one paint and no render loop.
 */
export type PopoverPlacement = "right-start" | "bottom-start" | "bottom-end" | "top-start";

/** Keeps a panel off the viewport edges. */
const MARGIN = 8;

export function Popover({
  open,
  onClose,
  anchorRef,
  placement = "bottom-start",
  width = 304,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  placement?: PopoverPlacement;
  width?: number;
  label?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  /*
    "Are we on the client yet?", as an external store rather than a flag set by
    an effect. `document` does not exist while the server renders, so the portal
    has to wait for mount — but writing that with setState-in-effect is the
    cascading-render pattern this repo lints as an error, and it is the same
    question the header's clock answers the same way: a server snapshot and a
    client snapshot, no state write on mount.
  */
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);

  const position = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const a = anchor.getBoundingClientRect();
    const h = panel.offsetHeight;
    const w = panel.offsetWidth;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left: number;
    let top: number;
    switch (placement) {
      case "right-start":
        left = a.right + 4;
        top = a.top;
        // Flip to the other side when the panel would run off the right edge —
        // the rail is on the left, but a narrow window still runs out of room.
        if (left + w > vw - MARGIN) left = Math.max(MARGIN, a.left - w - 4);
        break;
      case "top-start":
        left = a.left;
        top = a.top - h - 6;
        // Below the trigger if there is no room above it.
        if (top < MARGIN) top = Math.min(vh - h - MARGIN, a.bottom + 6);
        break;
      case "bottom-end":
        left = a.right - w;
        top = a.bottom + 6;
        break;
      default:
        left = a.left;
        top = a.bottom + 6;
    }

    // Clamp last, so a flip that still doesn't fit lands on screen anyway.
    left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, vw - w - MARGIN));
    top = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, vh - h - MARGIN));

    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.visibility = "visible";
  }, [anchorRef, placement]);

  useLayoutEffect(() => {
    if (!open) return;
    position();
    /*
      `capture: true` on scroll, because scroll does not bubble: without it a
      panel anchored to something inside a scrolling column stays put while its
      trigger moves away underneath it.
    */
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    return () => {
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
    };
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      // The trigger is excluded too: without it, clicking the open trigger
      // closes here and re-opens in the button's own handler, and the menu
      // never shuts.
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label={label}
      style={{ width, visibility: "hidden" }}
      /*
        z-[60] clears the mobile rail drawer and any sticky page chrome. Hidden
        until positioned, so it never flashes in the top-left corner first.
      */
      className="fixed z-[60] max-h-[calc(100vh-1rem)] overflow-y-auto overscroll-contain rounded-[14px] border border-line bg-white py-1.5 text-ink shadow-brand"
    >
      {children}
    </div>,
    document.body
  );
}

/* Nothing changes after hydration, so there is nothing to subscribe to. */
function subscribeNothing() {
  return () => {};
}

/** Standard row inside a popover — a link, a button, whatever renders it. */
export const POPOVER_ROW =
  "block w-full px-4 py-2.5 text-left text-[14.5px] text-ink hover:bg-black/[0.04]";

export function PopoverHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">
      {children}
    </p>
  );
}
