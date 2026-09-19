"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import "./messages-drawer.css";

/**
 * ── ⚠⚠ THE MESSAGES DRAWER (`P2-ALL-E560` STAGE 2) ──────────────────────────
 *
 * SCOTT, 2026-09-18: *"make it like linkedin. in notification bell...icon...and
 * it opens on the right."*
 *
 * ⚠⚠ IT OPENS OVER THE PAGE; IT DOES NOT NAVIGATE. The page behind keeps its
 * scroll position and its state, because nothing unmounts — the drawer is a
 * sibling overlay, not a route.
 *
 * ⚠ TWO SURFACES, ONE DOOR EACH: the cluster icon opens THIS; this links
 * `/messages`, which stays and is the full view.
 *
 * ── ⚠⚠ THE CONVERSATION LIST IS DERIVED, AND THAT IS A DECISION ─────────────
 *
 * ⚠ It comes from `listConversations()` via `GET /api/messages` — the SAME
 * function the `/messages` page calls, so the two surfaces cannot drift.
 * ⚠⚠ THERE IS NO `Conversation` MODEL AND THAT IS DELIBERATE — see the note on
 * `listConversations` in `lib/messages.ts` for the condition that would unblock
 * one. **Do not add a model to make this cheaper without meeting it.**
 *
 * ── ⚠⚠ EMPTY IS THE DESIGNED STATE ─────────────────────────────────────────
 *
 * ⚠ `Message` holds ZERO rows, so this ships empty and that is correct.
 * ⚠⚠ NOTHING WAS SEEDED to make it demonstrable (`E564`). The empty copy says
 * what is TRUE — no messages yet — and does not apologise or imply a fault.
 *
 * ── ⚠⚠⚠ KEYBOARD: A DRAWER A KEYBOARD USER CANNOT LEAVE IS A TRAP ──────────
 *
 * ⚠ Escape closes · click outside closes · focus is TRAPPED while open and
 * RETURNS TO THE ICON on close. ⚠⚠ Returning focus is the half that is easy to
 * skip and the half that strands somebody: focus dropped to `<body>` means the
 * next Tab starts from the top of the document, not from where they were.
 */

export type DrawerConversation = {
  otherUserId: string;
  name: string;
  photoUrl: string | null;
  title: string | null;
  lastBody: string;
  /** ⚠ AN ISO STRING, not a `Date` — it crossed the wire as JSON. */
  lastAt: string;
  unread: number;
};

/*
 * ⚠⚠ MOUNTED ONLY WHILE OPEN — `AppBand` renders this behind `messagesOpen &&`.
 * ⚠ THAT IS NOT A STYLE CHOICE, IT IS WHAT REMOVES A RESET: a component that
 * stays mounted has to clear last time's state on open, and clearing it
 * SYNCHRONOUSLY INSIDE AN EFFECT is the `react-hooks/set-state-in-effect` error
 * this repo carries eleven of and allows zero new of. ⚠⚠ A fresh mount already
 * has fresh state, so there is nothing to reset.
 * ⚠ It also means each open FETCHES AGAIN, which is right for a message list —
 * a cached list is a wrong list.
 */
export function MessagesDrawer({
  onClose,
  returnFocusRef,
}: {
  onClose: () => void;
  /** ⚠ The cluster icon. Focus goes back here on close, never to `<body>`. */
  returnFocusRef: React.RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<DrawerConversation[] | null>(null);
  const [failed, setFailed] = useState(false);

  /* ⚠ FETCHED ON MOUNT, AND MOUNT ONLY HAPPENS ON OPEN — so the band does not
     put a request on every logged-in page load for a panel nobody opened. */
  useEffect(() => {
    let alive = true;
    fetch("/api/messages")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { conversations: DrawerConversation[] }) => {
        if (alive) setRows(d.conversations ?? []);
      })
      .catch(() => {
        /* ⚠ A FAILED READ SAYS SO. It must not render as "no messages" — that
           is a fabricated fact, the same defect class as a `0` badge. */
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const close = useCallback(() => {
    onClose();
    /*
      ⚠⚠ FOCUS GOES BACK TO THE ICON. Deferred a frame so the drawer has
      unmounted and cannot re-steal it.
      ⚠⚠⚠ `preventScroll: true` IS LOAD-BEARING, NOT A FLOURISH. `.focus()`
      SCROLLS THE ELEMENT INTO VIEW by default, and the icon lives in the band at
      the TOP of the document — so returning focus scrolled the page back to 0.
      ⚠ MEASURED 2026-09-19: scrollY 220 before opening, 0 after closing. The
      brief requires *"the page behind keeps its scroll position and its state"*,
      and without this flag the drawer silently violated it on every close.
    */
    requestAnimationFrame(() =>
      returnFocusRef.current?.focus({ preventScroll: true })
    );
  }, [onClose, returnFocusRef]);

  /* ── Escape, and the focus trap ─────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      /* ⚠ THE TRAP IS A CYCLE, NOT A BLOCK — Tab past the last focusable wraps
         to the first and Shift+Tab wraps backwards. Blocking Tab entirely would
         make the drawer unusable rather than merely inescapable. */
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;
      if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (activeEl && !panel.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [close]);

  /* ⚠ FOCUS MOVES INTO THE PANEL ON OPEN, so the first Tab is inside it. */
  useEffect(() => {
    const t = requestAnimationFrame(() => {
      /* ⚠ `preventScroll` HERE TOO — the panel is fixed, but the browser may
         still scroll an ancestor to "reveal" the focused node. Same reason as
         the return-focus call above. */
      panelRef.current
        ?.querySelector<HTMLElement>("button, a[href]")
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="pm-drawer-root" role="presentation">
      {/*
        ⚠ THE SCRIM DIMS THE PAGE AND IS THE CLICK-OUTSIDE TARGET. It covers the
        viewport, so "outside the panel" is unambiguous — no document-level
        listener guessing whether a click landed on a detached node.
        ⚠ `aria-hidden` because it carries no information; the dialog beside it
        is what a screen reader reads.
      */}
      <div className="pm-drawer-scrim" aria-hidden onClick={close} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Messages"
        className="pm-drawer-panel"
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-display text-[16px] font-bold">Messages</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close messages"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-black/[0.05] hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="pm-drawer-body">
          {failed ? (
            /* ⚠ SAYS IT FAILED. Never "no messages" — that would assert a fact
               nobody checked. */
            <p className="px-4 py-6 text-[14px] leading-relaxed text-ink-2">
              We couldn&rsquo;t load your messages. Try again in a moment.
            </p>
          ) : rows === null ? (
            <p className="px-4 py-6 text-[14px] text-ink-2">Loading&hellip;</p>
          ) : rows.length === 0 ? (
            /*
              ⚠⚠ THE DESIGNED EMPTY STATE. `Message` holds zero rows and nothing
              was seeded (`E564`). ⚠ It states what is true and points at the one
              thing that makes messages possible — a colleague connection —
              because messaging is COLLEAGUE-ONLY. It does not apologise.
            */
            <div className="px-4 py-6">
              <p className="text-[14px] leading-relaxed text-ink-2">
                No messages yet. You can message the colleagues you&rsquo;re
                connected to.
              </p>
              <Link
                href="/community/colleagues"
                onClick={close}
                className="mt-3 inline-block text-[13.5px] font-bold text-magenta hover:underline"
              >
                Find Colleagues
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((c) => (
                <li key={c.otherUserId}>
                  <Link
                    href={`/messages?with=${c.otherUserId}`}
                    onClick={close}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-black/[0.03]"
                  >
                    <Avatar
                      firstName={c.name.split(" ")[0] ?? ""}
                      lastName={c.name.split(" ").slice(1).join(" ")}
                      photoUrl={c.photoUrl}
                      size={36}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[14.5px] font-bold">
                          {c.name || "Panameer member"}
                        </span>
                        {/* ⚠ `E433` — a timestamp is a fact, so ink. */}
                        <span className="shrink-0 text-[12px] text-ink-2">
                          {shortWhen(c.lastAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[13.5px] text-ink-2">
                        {c.lastBody}
                      </span>
                    </span>
                    {/* ⚠⚠ A DOT, NEVER A DIGIT — the standing rule for this
                        surface. It marks that something is unread; the number is
                        on the conversation itself. */}
                    {c.unread > 0 && (
                      <span
                        aria-label="Unread"
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-magenta"
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ⚠ THE DRAWER LINKS THE PAGE — `/messages` stays and is the full view. */}
        <footer className="border-t border-line px-4 py-3">
          <Link
            href="/messages"
            onClick={close}
            className="text-[13.5px] font-bold text-magenta hover:underline"
          >
            Open Messages
          </Link>
        </footer>
      </div>
    </div>
  );
}

/** A compact relative stamp. ⚠ Parsed from the ISO string the API sent. */
function shortWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}
