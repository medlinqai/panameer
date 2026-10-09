"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shortTime } from "@/lib/short-time";
import { SwipeRow } from "@/components/notifications/SwipeRow";

export type Row = { id: string; title: string; body: string | null; href: string | null; category: string; at: string; unread: boolean; needsAction: boolean; dismissed?: boolean };
export type Chip = { key: string; label: string; n: number };

const BTN = "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap border border-ink bg-surface px-3 text-[13px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-40";

// M-E014: Notifications is a plain list — dot · title · one-line summary · time; tap opens and marks read. Acting lives on the Worklist.
export function NotificationList({ rows, chips, filter, more, openCount, unreadCount, now }: { rows: Row[]; chips: Chip[]; filter: string; more: boolean; openCount: number; unreadCount: number; now: number }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const post = (action: string, ids?: string[]) =>
    fetch("/api/notifications/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ids }) }).then(() => startTransition(() => router.refresh()));
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<{ ids: string[]; n: number } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);
  const dismissOne = (id: string) => {
    setHidden((h) => new Set(h).add(id));
    void post("dismiss", [id]);
  };
  // N-E002: no confirm — it's reversible for 5 seconds.
  const dismissAll = async () => {
    const r = await fetch("/api/notifications/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismiss_all" }) });
    const j = (await r.json().catch(() => ({}))) as { ids?: string[]; count?: number };
    setUndo({ ids: j.ids ?? [], n: j.count ?? 0 });
    startTransition(() => router.refresh());
  };
  const open = (r: Row) => {
    if (r.unread) void post("read", [r.id]);
    if (r.href) router.push(r.href);
  };
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <h1 className="font-display text-[22px] font-bold">Notifications</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Link href="/worklist" className={BTN}>Worklist{openCount > 0 ? ` (${openCount})` : ""} →</Link>
        {unreadCount > 0 && <button type="button" disabled={busy} onClick={() => post("read_all")} className={BTN}>Mark All Read</button>}
        <button type="button" disabled={busy} onClick={dismissAll} data-dismiss-all className={BTN}>Dismiss All</button>
      </div>
      {undo && (
        <p role="status" data-undo className="mt-2 flex items-center gap-3 text-[13.5px]">
          Dismissed {undo.n}
          {undo.ids.length > 0 && <button type="button" onClick={() => { void post("undismiss", undo.ids); setUndo(null); }} className="font-bold text-magenta-dark underline underline-offset-4">Undo</button>}
        </p>
      )}
      <label className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-ink-2">
        <span className="sr-only">Show</span>
        <select
          value={filter}
          onChange={(e) => router.push(e.target.value === "all" ? "/notifications" : `/notifications?filter=${encodeURIComponent(e.target.value)}`)}
          aria-label="Filter notifications"
          className="h-10 max-w-full border border-line bg-surface px-2.5 text-[14px] font-semibold text-ink"
        >
          {chips.map((c) => <option key={c.key} value={c.key}>{c.label}{c.n > 0 ? ` (${c.n})` : ""}</option>)}
        </select>
      </label>
      {rows.length === 0 ? (
        <p className="mt-8 text-center text-[14px] text-ink-2">Nothing here.</p>
      ) : (
        <ul data-notification-list className="mt-3 border-t border-line">
          {rows.map((r) => {
            const muted = r.dismissed || hidden.has(r.id);
            const body = (
              <button type="button" onClick={() => open(r)} className="grid w-full grid-cols-[10px_minmax(0,1fr)_auto] items-start gap-x-3 py-3 pl-1 pr-1 text-left hover:bg-bg-soft">
                <span aria-label={r.unread ? "Unread" : undefined} className={"mt-[7px] h-2 w-2 rounded-full " + (r.unread && !muted ? "bg-magenta" : "bg-transparent")} />
                <span className="min-w-0">
                  <span className={"block truncate text-[14.5px] " + (muted ? "font-normal text-ink-3" : r.unread ? "font-bold text-ink" : "font-semibold text-ink-2")}>{r.title}</span>
                  {r.body && <span className={"block truncate text-[13px] " + (muted ? "text-ink-3" : "text-ink-2")}>{r.body}</span>}
                </span>
                <span className="pt-0.5 text-[12px] text-ink-3">{muted ? "Dismissed" : shortTime(new Date(r.at), now)}</span>
              </button>
            );
            return (
              <li key={r.id} data-unread={r.unread ? "yes" : "no"} data-dismissed={muted ? "yes" : "no"} className="border-b border-line">
                {muted ? body : <SwipeRow label={r.title} onDismiss={() => dismissOne(r.id)}>{body}</SwipeRow>}
              </li>
            );
          })}
        </ul>
      )}
      {more && rows.length > 0 && (
        <div className="mt-4 text-center">
          <Link className={BTN} href={`/notifications?${new URLSearchParams({ ...(filter !== "all" ? { filter } : {}), after: rows[rows.length - 1].id }).toString()}`}>Load More</Link>
        </div>
      )}
    </div>
  );
}
