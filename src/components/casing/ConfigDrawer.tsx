"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NavGroup } from "@/lib/nav";
import { BAND_LIT, BAND_IDLE } from "@/components/casing/band-lit";
/* ⚠ THE SAME STYLESHEET THE MESSAGES DRAWER IMPORTS — one drawer language, two
   consumers. It is component-imported there, so it must be here too. */
import "./messages-drawer.css";

/**
 * ── ⚠⚠⚠ THE CONFIGURATION DRAWER — THE GEAR'S PANEL (`P2-ALL-E692`) ────────
 *
 * ⚠⚠ **SCOTT, 2026-09-27 (ruling `89i`):** *"The gear pops the configuration
 * menu as a drawer, so ruling 88's five-item limit does not apply to it."*
 *
 * ── ⚠⚠⚠ WHY THIS EXISTS: THE ADMIN BAND WAS FIFTEEN ITEMS, SCROLLING ───────
 *
 * ⚠ `AppBand` flattened `ADMIN_NAV` into the band — **15 items** across three
 * groups — and dropped them into `.pm-band-menu-row`, which is `overflow-x:
 * auto` with a **hidden scrollbar**. ⚠⚠ **MEASURED AT 390px: that row hides
 * 122px inside itself on every page, while the PAGE reports 0px overflow.**
 * ⚠⚠⚠ **SO EVERY `scrollWidth === innerWidth` GATE PASSED WHILE FOURTEEN
 * ADMIN DESTINATIONS SAT OFF-SCREEN BEHIND AN INVISIBLE SCROLLBAR.** That is
 * ruling 88's *"broken in plain sight"*, with a number on it.
 *
 * ── ⚠⚠ IT DOES NOT CHOOSE WHAT IS INSIDE IT ───────────────────────────────
 *
 * ⚠⚠⚠ **`ADMIN_NAV`'s CONTENT IS NOT REWRITTEN AND NOT REORDERED** — Scott:
 * *"DO NOT REWRITE `ADMIN_NAV`'s CONTENT. Build the gear and the drawer."* This
 * takes the groups as given and renders them, labels and order untouched.
 * ⚠ **The three group headings are KEPT rather than flattened**, because they
 * carry meaning a flat list discards — which is also why the band was the wrong
 * container for them.
 *
 * ── ⚠ THE SHELL IS THE MESSAGES DRAWER'S, DELIBERATELY ────────────────────
 *
 * ⚠⚠ It reuses `.pm-drawer-root` / `.pm-drawer-scrim` / `.pm-drawer-panel` /
 * `.pm-drawer-body` from `messages-drawer.css` rather than growing a second set.
 * ⚠⚠⚠ **TWO DRAWERS WITH TWO STYLESHEETS IS `E585` IN CHROME:** they would
 * drift, and a member would learn two dismissal gestures for one idea. ⚠ The
 * behaviour is the same for the same reason — Escape closes, the scrim closes,
 * focus returns to the control that opened it.
 */
export function ConfigDrawer({
  groups,
  active = false,
  label = "Configuration",
}: {
  /** ⚠ Passed IN, never imported here — this component knows no admin route. */
  groups: NavGroup[];
  /**
   * ⚠⚠ `E735` — whether the current route is one the gear owns (`/admin`). ⚠⚠⚠ THE GEAR
   * HAD NO LIT STATE AT ALL, which is why all 33 admin routes lit nothing. ⚠ It arrives as
   * a prop so the decision stays in `bandActiveHref` — this component still knows no admin
   * route, which is its own stated contract one line above.
   */
  active?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const gearRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    /* ⚠ FOCUS GOES BACK TO THE GEAR. A dialog that dumps focus at the top of the
       document leaves a keyboard user to find their place again. */
    gearRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  /* ⚠ FOCUS THE PANEL ON OPEN, so the first Tab lands inside it. */
  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => {
      panelRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(t);
  }, [open]);

  return (
    <>
      <button
        ref={gearRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        title={label}
        /* ⚠ 44px, because there is no hover on touch and a 32px gear is a miss
           (88a). The band's other icons are sized by `BandIcon`; this matches
           the touch standard rather than the visual one. */
        className={
          /* ⚠ The SHARED lit class (`E720` item 1), imported rather than re-typed. */
          "grid h-11 w-11 place-items-center rounded-full transition-colors " +
          (active || open ? BAND_LIT : BAND_IDLE)
        }
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div className="pm-drawer-root" role="presentation">
          <div className="pm-drawer-scrim" aria-hidden onClick={close} />
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="pm-drawer-panel"
          >
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-display text-[16px] font-bold">{label}</h2>
              <button
                type="button"
                onClick={close}
                aria-label={`Close ${label.toLowerCase()}`}
                className="grid h-11 w-11 place-items-center rounded-full text-ink-2 transition-colors hover:bg-black/[0.05] hover:text-ink"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </header>

            <div className="pm-drawer-body">
              {/*
                ⚠⚠ THE GROUPS ARE RENDERED AS GROUPS. `AppBand` flattened them
                and lost three headings that say what the items underneath are
                for; a drawer has the height to keep them.
                ⚠ `flex-col` at every width — this is a panel, not a row, so
                there is nothing here that could scroll sideways. **The defect
                this replaces was a sideways scroll.**
              */}
              {groups.map((group) => (
                /* ⚠ KEYED ON THE FIRST ITEM'S href, NOT THE TITLE — `NavGroup.title`
                   is `string | null`, so a title key would collide across every
                   untitled group. Measured, not assumed: the type says nullable. */
                <section
                  key={group.items[0]?.href ?? group.title ?? ""}
                  className="border-b border-line last:border-b-0"
                >
                  {/* ⚠ A NULL TITLE RENDERS NO HEADING rather than an empty one —
                      an empty heading is a label that says nothing occupies space
                      as though it said something. */}
                  {group.title && (
                    <h3 className="px-4 pt-4 pb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-2">
                      {group.title}
                    </h3>
                  )}
                  <nav aria-label={group.title ?? label} className="flex flex-col pb-2">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          /* ⚠⚠ FOLLOWING A LINK CLOSES THE PANEL. Without this it
                             sits over the page it just navigated to, which reads
                             as a rendering fault rather than as a drawer.
                             ⚠ Done ON THE CLICK rather than in an effect keyed on
                             `pathname`: `setState` inside an effect is the
                             `react-hooks/set-state-in-effect` error this repo
                             already carries eleven of, and the rule is 0 NEW.
                             ⚠ It is also the truer statement — the drawer closes
                             because you chose something, not because a string
                             changed. */
                          onClick={() => setOpen(false)}
                          /* ⚠ 44px rows (88a) — the same touch standard the tab
                             row already meets. */
                          className={
                            "flex min-h-11 items-center px-4 text-[14.5px] transition-colors " +
                            (active
                              ? "bg-black/[0.05] font-semibold text-ink"
                              : "text-ink-2 hover:bg-black/[0.03] hover:text-ink")
                          }
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
