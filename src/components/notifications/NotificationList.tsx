"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shortTime } from "@/lib/short-time";
import { SwipeRow } from "@/components/notifications/SwipeRow";
import { useMe } from "@/components/MeProvider";
import { RowActions } from "@/components/notifications/RowActions";
import type { RowAction } from "@/lib/worklist-actions";

export type Row = { id: string; title: string; body: string | null; href: string | null; category: string; at: string; unread: boolean; needsAction: boolean; dismissed?: boolean; resolved?: boolean; action?: RowAction };
export type Chip = { key: string; label: string; n: number };

const BTN = "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap border border-ink bg-surface px-3 text-[13px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-40";

// M-E014: dot · title · one-line summary · time; tap opens and marks read. NT-E002: request rows act in place (Accept / Approve · Decline, Message).
export function NotificationList({ rows, chips, filter, more, openCount, unreadCount, now }: { rows: Row[]; chips: Chip[]; filter: string; more: boolean; openCount: number; unreadCount: number; now: number }) {
  const router = useRouter();
  const { refresh: refreshMe } = useMe();
  const [busy, startTransition] = useTransition();
  // Scott 10-17: the avatar / menu count updates as soon as you read or dismiss.
  const post = (action: string, ids?: string[]) =>
    fetch("/api/notifications/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ids }) }).then(() => { refreshMe(); startTransition(() => router.refresh()); });
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<{ ids: string[]; n: number } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);
  // NT-E003: a done row leaves the list at once; counts (bell, Worklist, All) follow on the refresh.
  const [gone, setGone] = useState<Set<string>>(new Set());
  const leave = (id: string) => setGone((g) => new Set(g).add(id));
  const dismissOne = (id: string) => {
    if (filter === "done") setHidden((h) => new Set(h).add(id));
    else leave(id);
    void post("dismiss", [id]);
  };
  // N-E002: no confirm — it's reversible for 5 seconds.
  const dismissAll = async () => {
    const r = await fetch("/api/notifications/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismiss_all" }) });
    const j = (await r.json().catch(() => ({}))) as { ids?: string[]; count?: number };
    setUndo({ ids: j.ids ?? [], n: j.count ?? 0 });
    refreshMe();
    startTransition(() => router.refresh());
  };
  const open = (r: Row) => {
    if (r.unread) void post("read", [r.id]);
    if (r.href) router.push(r.href);
  };

  // NT-E004: J/↓ next · K/↑ previous · A accept/approve · D decline · X dismiss · Enter open. Acting keeps focus on the
  // same slot, which is now the next row. Keys are ignored while typing.
  const visible = rows.filter((r) => !gone.has(r.id));
  const [focusRaw, setFocus] = useState(-1);
  // After the last row leaves, focus sits on the new last row.
  const focus = Math.min(focusRaw, visible.length - 1);
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const decidable = (r: Row) => !!r.action && (r.action.kind === "join" || r.action.kind === "connect" || r.action.kind === "mentor") && r.action.pending && !r.dismissed;
  const decide = async (r: Row, decision: "APPROVED" | "REJECTED") => {
    setKeyMsg(null);
    leave(r.id);
    const res = await fetch("/api/worklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, action: "decide", decision }) }).catch(() => null);
    if (!res?.ok) setKeyMsg(((await res?.json().catch(() => ({}))) as { error?: string })?.error ?? "That didn't work.");
    refreshMe();
    startTransition(() => router.refresh());
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable))) return;
      const k = e.key.toLowerCase();
      const row = visible[focus];
      if (k === "j" || k === "arrowdown") { e.preventDefault(); setFocus(Math.min(visible.length - 1, focus + 1)); }
      else if (k === "k" || k === "arrowup") { e.preventDefault(); setFocus(Math.max(0, focus - 1)); }
      else if (!row) return;
      else if (k === "a" && decidable(row)) void decide(row, "APPROVED");
      else if (k === "d" && decidable(row)) void decide(row, "REJECTED");
      else if (k === "x" && !row.dismissed) dismissOne(row.id);
      else if (k === "enter") { e.preventDefault(); open(row); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    if (focus >= 0) document.querySelector(`[data-row-index="${focus}"]`)?.scrollIntoView({ block: "nearest" });
  }, [focus]);
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <h1 className="font-display text-[22px] font-bold">Notifications</h1>
      <p className="mt-0.5 hidden text-[12.5px] text-ink-3 sm:block" data-keys-hint>J/K to move · A accept · D decline · X dismiss</p>
      {keyMsg && <p role="alert" className="mt-1 text-[13px] font-semibold text-magenta-dark">{keyMsg}</p>}
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
          {visible.map((r, i) => {
            const muted = r.dismissed || hidden.has(r.id);
            const acts = !muted && r.action && r.action.kind !== "dismiss" && r.action.kind !== "reply" && !(("pending" in r.action) && !r.action.pending);
            const body = (
              <div className="flex flex-wrap items-center gap-x-2 hover:bg-bg-soft">
              <button type="button" onClick={() => open(r)} className="grid min-w-0 flex-1 grid-cols-[10px_minmax(0,1fr)_auto] items-start gap-x-3 py-3 pl-1 pr-1 text-left">
                <span aria-label={r.unread ? "Unread" : undefined} className={"mt-[7px] h-2 w-2 rounded-full " + (r.unread && !muted ? "bg-magenta" : "bg-transparent")} />
                <span className="min-w-0">
                  <span className={"block truncate text-[14.5px] " + (muted ? "font-normal text-ink-3" : r.unread ? "font-bold text-ink" : "font-semibold text-ink-2")}>{r.title}</span>
                  {r.body && <span className={"block truncate text-[13px] " + (muted ? "text-ink-3" : "text-ink-2")}>{r.body}</span>}
                </span>
                <span className="pt-0.5 text-[12px] text-ink-3">{muted ? "Dismissed" : shortTime(new Date(r.at), now)}</span>
              </button>
              {acts && <span className="pb-2 pl-6 sm:pb-0 sm:pl-0" data-notification-actions><RowActions id={r.id} action={r.action!} href={null} onDone={() => { leave(r.id); refreshMe(); startTransition(() => router.refresh()); }} /></span>}
              </div>
            );
            return (
              <li key={r.id} data-row-index={i} data-unread={r.unread ? "yes" : "no"} data-dismissed={muted ? "yes" : "no"} onMouseDown={() => setFocus(i)} className={i === focus ? "border-b border-line outline outline-2 -outline-offset-2 outline-ink" : "border-b border-line"}>
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
