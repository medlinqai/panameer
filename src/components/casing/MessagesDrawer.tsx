"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import "./messages-drawer.css";

export type DrawerConversation = {
  otherUserId: string;
  name: string;
  photoUrl: string | null;
  title: string | null;
  lastBody: string;
  lastAt: string;
  unread: number;
};

export function MessagesDrawer({
  onClose,
  returnFocusRef,
}: {
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<DrawerConversation[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/messages")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { conversations: DrawerConversation[] }) => {
        if (alive) setRows(d.conversations ?? []);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const close = useCallback(() => {
    onClose();
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

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("button, a[href]")
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="pm-drawer-root" role="presentation">
      {}
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
            <p className="px-4 py-6 text-[14px] leading-relaxed text-ink-2">
              We couldn&rsquo;t load your messages. Try again in a moment.
            </p>
          ) : rows === null ? (
            <p className="px-4 py-6 text-[14px] text-ink-2">Loading&hellip;</p>
          ) : rows.length === 0 ? (
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
