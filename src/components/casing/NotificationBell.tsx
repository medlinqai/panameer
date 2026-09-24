"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * ── ⚠⚠⚠ THE BELL AND ITS PANEL (`P2-A3-E620` WS-C item 1) ───────────────
 *
 * ⚠ SCOTT, 2026-09-18: *"make it like linkedin. in notification bell...icon...
 * and it opens on the right."* ⚠⚠ That was recorded as **Stage 2** when `E559`
 * shipped the band, because there was nothing to put in a panel — the table
 * held one row. `E620` registered the events, so Stage 2 is now buildable.
 *
 * ⚠⚠⚠ OPENING THE BELL DOES NOT MARK ANYTHING READ. The brief is explicit, and
 * the API is built so there is nothing to reach for: `/api/notifications/recent`
 * has no mark-all. ⚠ READING ONE marks THAT ONE — a side effect of LOOKING at a
 * list is not the same act as deliberately clearing it, and `/notifications`
 * keeps its own labelled `Mark All Read` button for the deliberate version.
 *
 * ⚠⚠ THE BADGE IS NOT RE-DERIVED HERE. It is handed down from `me` and is the
 * same number the page counts — one definition (`E585`). The panel's own rows
 * are fetched on open and never feed the count.
 */

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
  children,
  label,
}: {
  unreadCount: number;
  children: React.ReactNode;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  /* ⚠⚠ FETCHED ON OPEN, NOT ON MOUNT. The band renders on every authenticated
     page; loading the panel's rows on mount would be a query per page view for
     a panel most views never open. */
  useEffect(() => {
    if (!open || rows !== null) return;
    let cancelled = false;
    (async () => {
      /* ⚠ `catch` present and meaning it — `E516`'s finding was five blocks
         with `try`/`finally` and no `catch`, where a thrown fetch is silence. */
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

  /* ⚠⚠ CLOSE ON OUTSIDE CLICK AND ON ESCAPE. A panel that can only be closed by
     the control that opened it is a trap on a phone, where the control may be
     scrolled off. */
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

  async function readOne(row: Row) {
    setOpen(false);
    /*
      ⚠⚠⚠ MARK, THEN NAVIGATE — AND THE NAVIGATION DOES NOT WAIT ON THE MARK.
      ⚠ If the mark fails, the member still gets where they were going; the
      notification simply stays unread, which is recoverable and honest. The
      opposite — blocking the link on a write — turns a logging failure into a
      dead link, which is `E522`'s receipt rule applied to a click.
    */
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
        className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <span className="relative inline-flex">
          {children}
          {/* ⚠ ABSENT AT ZERO, NEVER A `0` BADGE — and it counts unread AND
              DELIVERED only, so a DIGEST row nobody was sent cannot badge. */}
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
        /*
          ── ⚠⚠⚠ ON A PHONE IT IS PINNED TO THE VIEWPORT, NOT TO THE BELL ────

          ⚠ Scott asked for it to open on the right, and above `sm` it does —
          anchored to the button, which is where a desktop reader expects it.
          ⚠⚠ AT PHONE WIDTH THAT IS A DEFECT, AND IT SHIPPED ONCE: a 360px
          panel hanging off a button near the right edge of a 390px screen put
          its left side **30.8px off-screen**, measured, and the heading read
          *"otifications"*. ⚠⚠⚠ AN ABSOLUTELY-POSITIONED BOX OFF THE LEFT EDGE
          DOES NOT WIDEN THE DOCUMENT, so no page-scroll check can see it —
          `check:notifications-ui` measures the panel's OWN box against the
          viewport, and that assertion fails on the version below this one.

          ⚠ `fixed` is what pins it: the band is sticky, so an `absolute` child
          can only ever be positioned against the band, never against the
          screen. ⚠⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   className="absolute right-0 top-11 z-50 … w-[min(92vw,360px)] …"
        */
        <div
          role="menu"
          aria-label="Notifications"
          className="fixed inset-x-2 top-14 z-50 max-h-[70vh] overflow-y-auto rounded-brand border border-line bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[360px]"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[14px] font-bold">Notifications</p>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[13px] font-bold text-magenta hover:underline"
            >
              See All
            </Link>
          </div>

          {failed ? (
            /* ⚠ A FAILURE SAYS SO. Rendering "nothing yet" on a failed fetch
               would tell a member they have no notifications when the truth is
               that we could not ask. */
            <p className="px-4 py-6 text-center text-[13.5px] text-ink-2">
              We couldn&rsquo;t load these. Try again in a moment.
            </p>
          ) : rows === null ? (
            <p className="px-4 py-6 text-center text-[13.5px] text-ink-2">Loading…</p>
          ) : rows.length === 0 ? (
            /* ⚠ THE EMPTY STATE SAYS WHAT WILL APPEAR THERE (WS-C item 4). */
            <p className="px-4 py-6 text-center text-[13.5px] leading-relaxed text-ink-2">
              Nothing yet. When something needs you — a request to join a group,
              an invitation, a proposal — it appears here.
            </p>
          ) : (
            <ul>
              {rows.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => readOne(n)}
                    className="block w-full border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-line-2"
                  >
                    <span className="flex items-start gap-2">
                      {/* ⚠⚠ UNREAD IS A DOT **AND** A WEIGHT, never colour
                          alone — a single magenta dot is invisible to a
                          colour-blind reader, and this is the only thing
                          distinguishing two otherwise identical rows. */}
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
                        {/* ⚠ A WORKLIST ITEM SAYS SO IN WORDS. "You owe an
                            action" and "you have not read this" are different
                            facts and must not look the same. */}
                        {n.needsAction && (
                          <span className="mt-0.5 block text-[11.5px] font-bold uppercase tracking-[0.05em] text-magenta">
                            Needs You
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
