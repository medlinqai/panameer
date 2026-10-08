"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";

// The conversation list with "Search people and messages": names filter as you type; message text via the server.
export type ConvRow = { otherUserId: string; name: string; photoUrl: string | null; lastBody: string; lastAt: string; unread: number; profileHref: string | null };
const when = (iso: string) => {
  const d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (now.getTime() - d.getTime() < 6 * 86_400_000) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function ConversationList({ rows, active }: { rows: ConvRow[]; active: string | null }) {
  const [q, setQ] = useState("");
  const [textHits, setTextHits] = useState<Set<string>>(new Set());
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let live = true;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/messages?q=${encodeURIComponent(term)}`).catch(() => null);
      const b = (await r?.json().catch(() => null)) as { matches?: string[] } | null;
      if (live) setTextHits(new Set(b?.matches ?? []));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter((c) => c.name.toLowerCase().includes(n) || c.lastBody.toLowerCase().includes(n) || (n.length >= 2 && textHits.has(c.otherUserId)));
  }, [rows, q, textHits]);
  return (
    <>
      <div className="border-b border-line px-3 py-2.5">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length < 2) setTextHits(new Set()); }}
          placeholder="🔍 Search people and messages"
          aria-label="Search people and messages"
          data-message-search
          className="h-9 w-full border border-line bg-bg-soft px-3 text-[13.5px] focus:border-ink focus:outline-none"
        />
      </div>
      {shown.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-ink-2">{rows.length ? "No conversations match." : "No conversations yet."}</p>}
      <ul>
        {shown.map((c) => {
          const on = c.otherUserId === active;
          const [first, ...rest] = c.name.split(" ");
          return (
            <li key={c.otherUserId} data-conversation={c.otherUserId} className={"flex items-center gap-3 border-b border-line px-4 py-3 " + (on ? "bg-magenta/[0.06]" : "hover:bg-ink-2/[0.04]")}>
              {c.profileHref ? (
                <Link href={c.profileHref} aria-label={`${c.name}'s profile`} className="shrink-0"><Avatar firstName={first ?? ""} lastName={rest.join(" ")} photoUrl={c.photoUrl} size={36} /></Link>
              ) : (
                <span className="shrink-0"><Avatar firstName={first ?? ""} lastName={rest.join(" ")} photoUrl={c.photoUrl} size={36} /></span>
              )}
              <Link href={`/messages?with=${c.otherUserId}`} className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-bold">{c.name}</span>
                  <span className="ml-auto shrink-0 text-[11.5px] text-ink-3">{when(c.lastAt)}</span>
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className="truncate text-[12.5px] text-ink-2">{c.lastBody}</span>
                  {c.unread > 0 && <span className="ml-auto grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-magenta px-1 text-[11px] font-bold text-white">{c.unread}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
