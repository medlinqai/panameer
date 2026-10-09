"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BAND_LIT, BAND_IDLE } from "@/components/casing/band-lit";
import { useRouter } from "next/navigation";
import { SwipeRow } from "@/components/notifications/SwipeRow";

type Row = {
  id: string;
  title: string;
  href: string | null;
  unread: boolean;
  needsAction: boolean;
  at: string;
};

export function NotificationBell({
  unreadCount,
  active = false,
  children,
  label,
}: {
  unreadCount: number;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [rows, setRows] = useState<Row[] | null>(null);
  const needActionCount = (rows ?? []).filter((r) => r.needsAction).length;
  const [failed, setFailed] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || rows !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/notifications/recent");
        if (!r.ok) throw new Error(String(r.status));
        const data = (await r.json()) as { rows: Row[] };
        if (!cancelled) setRows(data.rows);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, rows]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
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

  /** N-E001: hides it from the quick view only; nothing is deleted and the worklist task is untouched. */
  function dismissOne(id: string) {
    setRows((r) => (r ?? []).filter((x) => x.id !== id));
    void fetch("/api/notifications/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismiss", ids: [id] }) }).catch(() => {});
  }

  async function readOne(row: Row) {
    setOpen(false);
    if (row.unread) {
      void fetch("/api/notifications/recent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      })
        .then(() => router.refresh())
        .catch(() => {});
    }
    if (row.href) router.push(row.href);
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={
          "grid h-9 w-9 place-items-center rounded-full transition-colors " +
          (active || open ? BAND_LIT : BAND_IDLE)
        }
      >
        <span className="relative inline-flex">
          {children}
          {}
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} unread notifications`}
              className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-magenta px-1 text-[10px] font-bold text-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
      </button>

      {open && (
        // ON A PHONE IT IS PINNED TO THE VIEWPORT, NOT TO THE BELL
        <div
          role="menu"
          aria-label="Notifications"
          className="fixed inset-x-2 top-14 z-50 max-h-[70vh] overflow-y-auto rounded-brand border border-line bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[360px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="text-[14px] font-bold">Notifications</p>
            {/* TWO DOORS, NOT ONE . Scott: *"The bell's dropdown links See All → */}
            <span className="flex items-center gap-3">
              {needActionCount > 0 && (
                <Link
                  href="/worklist"
                  onClick={() => setOpen(false)}
                  className="text-[13px] font-bold text-magenta hover:underline"
                >
                  {needActionCount} need action
                </Link>
              )}
            </span>
          </div>

          {failed ? (
            // A FAILURE SAYS SO. Rendering "nothing yet" on a failed fetch
            <p className="px-4 py-6 text-center text-[13.5px] text-ink-2">
              We couldn&rsquo;t load these. Try again in a moment.
            </p>
          ) : rows === null ? (
            <p className="px-4 py-6 text-center text-[13.5px] text-ink-2">Loading…</p>
          ) : rows.length === 0 ? (
            /* THE EMPTY STATE SAYS WHAT WILL APPEAR THERE (WS-C item 4). */
            <p className="px-4 py-6 text-center text-[13.5px] leading-relaxed text-ink-2">
              Nothing yet. When something needs you — a request to join a group,
              an invitation, a proposal — it appears here.
            </p>
          ) : (
            <ul>
              {rows.map((n) => (
                <li key={n.id} className="border-b border-line last:border-0">
                  <SwipeRow label={n.title} onDismiss={() => dismissOne(n.id)}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => readOne(n)}
                    className="block w-full py-3 pl-4 pr-1 text-left transition-colors hover:bg-line-2"
                  >
                    <span className="flex items-start gap-2">
                      {/* UNREAD IS A DOT AND A WEIGHT, never colour */}
                      <span
                        aria-hidden
                        className={
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full " +
                          (n.unread ? "bg-magenta" : "bg-transparent")
                        }
                      />
                      <span className="min-w-0">
                        <span
                          className={
                            "block text-[13.5px] leading-snug " +
                            (n.unread ? "font-bold text-ink" : "text-ink-2")
                          }
                        >
                          {n.title}
                        </span>
                        {/* A WORKLIST ITEM SAYS SO IN WORDS. "You owe an */}
                        {n.needsAction && (
                          <span className="mt-0.5 block text-[11.5px] font-bold uppercase tracking-[0.05em] text-magenta">
                            Needs You
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                  </SwipeRow>
                </li>
              ))}
            </ul>
          )}
          <Link href="/notifications" onClick={() => setOpen(false)} data-show-all className="block border-t border-line px-4 py-3 text-center text-[13.5px] font-bold text-magenta-dark hover:bg-line-2">
            Show All →
          </Link>
        </div>
      )}
    </div>
  );
}
