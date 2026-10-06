"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shortTime } from "@/lib/short-time";
import "@/components/notifications/triage.css";

export type Row = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  category: string;
  at: string;
  unread: boolean;
  needsAction: boolean;
};

export type Chip = { key: string; label: string; n: number };

export function TriageList({
  rows,
  chips,
  filter,
  more,
  openCount,
  unreadCount,
  now,
}: {
  rows: Row[];
  chips: Chip[];
  filter: string;
  more: boolean;
  openCount: number;
  unreadCount: number;
  now: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function act(action: string, ids?: string[]) {
    await fetch("/api/notifications/act", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids }),
    });
    setSelected(new Set());
    setConfirming(false);
    startTransition(() => router.refresh());
  }

  const open = (r: Row) => {
    if (!r.unread) {
      if (r.href) router.push(r.href);
      return;
    }
    void fetch("/api/notifications/act", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", ids: [r.id] }),
    }).then(() => startTransition(() => router.refresh()));
    if (r.href) router.push(r.href);
  };

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <div className="pm-triage">
      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div className="pm-triage-top">
        <h1 className="font-display text-[22px] font-bold">Notifications</h1>
        <div className="pm-triage-top-actions">
          {}
          <Link href="/worklist" className="pm-triage-btn pm-triage-btn-s">
            Worklist {openCount > 0 ? `(${openCount})` : ""} &rarr;
          </Link>
          {unreadCount > 0 && (
            <button
              type="button"
              className="pm-triage-btn pm-triage-btn-s"
              disabled={busy}
              onClick={() => act("read_all")}
            >
              Mark All Read
            </button>
          )}
          <button
            type="button"
            className="pm-triage-btn pm-triage-btn-s"
            disabled={busy}
            onClick={() => setConfirming(true)}
          >
            Dismiss All
          </button>
        </div>
      </div>

      {/* THE CONFIRM STATES THE COUNT (Scott: *"a confirm dialog that states the */}
      {confirming && (
        <div className="pm-triage-confirm" role="alertdialog" aria-label="Dismiss all">
          <p>
            <strong>Dismiss {chips.find((c) => c.key === "all")?.n ?? rows.length} notifications?</strong>{" "}
            They are hidden from this list, not deleted. Anything waiting on you stays on
            your Worklist.
          </p>
          <div className="pm-triage-confirm-actions">
            <button type="button" className="pm-triage-btn pm-triage-btn-p" disabled={busy} onClick={() => act("dismiss_all")}>
              Dismiss All
            </button>
            <button type="button" className="pm-triage-btn pm-triage-btn-s" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── CHIPS ───────────────────────────────────────────────────────────── */}
      {/* Links, not buttons: the filter lives in the URL so a filtered list can be */}
      <nav className="pm-triage-chips" aria-label="Filter notifications">
        {chips.map((c) => (
          <Link
            key={c.key}
            href={c.key === "all" ? "/notifications" : `/notifications?filter=${encodeURIComponent(c.key)}`}
            aria-current={filter === c.key ? "page" : undefined}
            className="pm-triage-chip"
            data-on={filter === c.key ? "yes" : "no"}
          >
            {c.label}
            {/* A ZERO IS NOT PRINTED — a chip only exists when it has rows, so a `(0)` */}
            {c.n > 0 && <span className="pm-triage-chip-n">({c.n})</span>}
          </Link>
        ))}
      </nav>

      {/* ── SELECTION BAR ───────────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="pm-triage-bar" role="region" aria-label="Selected notifications">
          <strong>{selected.size} selected</strong>
          <button type="button" className="pm-triage-bar-act" disabled={busy} onClick={() => act("read", [...selected])}>
            Mark Read
          </button>
          <button type="button" className="pm-triage-bar-act" disabled={busy} onClick={() => act("dismiss", [...selected])}>
            Dismiss
          </button>
          <button
            type="button"
            className="pm-triage-bar-act"
            onClick={() => setSelected(new Set(rows.map((r) => r.id)))}
          >
            Select All on Page
          </button>
          <button type="button" className="pm-triage-bar-x" aria-label="Clear selection" onClick={() => setSelected(new Set())}>
            &#10005;
          </button>
        </div>
      )}

      {/* ── ROWS ────────────────────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <p className="pm-triage-empty">
          {filter === "all"
            ? "Nothing here yet. We'll tell you when something needs you."
            : "Nothing in this filter."}
        </p>
      ) : (
        <>
          <div className="pm-triage-head">
            <input
              type="checkbox"
              aria-label="Select all on page"
              checked={allOnPage}
              onChange={() =>
                setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)))
              }
            />
            <span>{rows.length} shown</span>
          </div>

          <ul className="pm-triage-rows">
            {rows.map((r) => (
              <li
                key={r.id}
                className="pm-triage-row"
                data-unread={r.unread ? "yes" : "no"}
                data-id={r.id}
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${r.title}`}
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                />
                <div className="pm-triage-main" onClick={() => open(r)}>
                  <div className="pm-triage-t">
                    {/* The unread dot is the only magenta on the row besides a link. */}
                    {r.unread && <span className="pm-triage-dot" aria-hidden />}
                    {r.href ? (
                      <Link href={r.href} className="pm-triage-title" onClick={(e) => e.stopPropagation()}>
                        {r.title}
                      </Link>
                    ) : (
                      <span className="pm-triage-title">{r.title}</span>
                    )}
                    {r.needsAction && <span className="pm-triage-needs">Needs You</span>}
                  </div>
                  {r.body && <p className="pm-triage-body">{r.body}</p>}
                </div>
                <time className="pm-triage-at" dateTime={r.at}>
                  {shortTime(new Date(r.at), now)}
                </time>
                <span className="pm-triage-row-acts">
                  {r.unread && (
                    <button
                      type="button"
                      title="Mark read"
                      aria-label={`Mark ${r.title} read`}
                      disabled={busy}
                      onClick={() => act("read", [r.id])}
                    >
                      &#10003;
                    </button>
                  )}
                  <button
                    type="button"
                    title="Dismiss"
                    aria-label={`Dismiss ${r.title}`}
                    disabled={busy}
                    onClick={() => act("dismiss", [r.id])}
                  >
                    &#10005;
                  </button>
                </span>
              </li>
            ))}
          </ul>

          {/* Scott: *"page by 25; no infinite list."* The cursor is the last row's id. */}
          {more && (
            <div className="pm-triage-more">
              <Link
                className="pm-triage-btn pm-triage-btn-s"
                href={`/notifications?${new URLSearchParams({
                  ...(filter !== "all" ? { filter } : {}),
                  after: rows[rows.length - 1].id,
                }).toString()}`}
              >
                Load More
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
