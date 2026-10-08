"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import type { RequestItem } from "@/lib/requests";

// Connections › Requests: Received · Sent, every kind tagged (CONNECT / MENTORING / RECOMMENDATION).
const day = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? "today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
};

export function RequestsPanel({ received, sent, tab }: { received: RequestItem[]; sent: RequestItem[]; tab: "received" | "sent" }) {
  const rows = tab === "received" ? received : sent;
  const sub = (k: "received" | "sent", label: string, n: number) => (
    <Link href={`?chip=requests${k === "sent" ? "&rq=sent" : ""}`} aria-current={tab === k ? "page" : undefined} className={"-mb-px border-b-2 px-3 py-2 text-[13.5px] font-bold " + (tab === k ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink")}>
      {label} <span className="font-medium text-ink-3">{n}</span>
    </Link>
  );
  return (
    <section data-requests className="mt-2">
      <nav className="flex gap-1 border-b border-line" aria-label="Requests">
        {sub("received", "Received", received.length)}
        {sub("sent", "Sent", sent.length)}
      </nav>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[13.5px] text-ink-2">{tab === "received" ? "Nothing waiting on you." : "No requests waiting on anyone."}</p>
      ) : (
        <ul>
          {rows.map((r) => <Row key={`${r.kind}:${r.id}`} r={r} tab={tab} />)}
        </ul>
      )}
    </section>
  );
}

function Row({ r, tab }: { r: RequestItem; tab: "received" | "sent" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const act = async (action: "accept" | "decline" | "withdraw", label: string) => {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/connect/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: r.kind, id: r.id, action }) }).catch(() => null);
    const b = (await res?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res?.ok) return setErr(b?.error ?? "That didn't go through.");
    setDone(label);
    router.refresh();
  };
  const [first, ...rest] = r.name.split(" ");
  const BTN = "border border-ink px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50";
  const BTN_K = "bg-ink px-3 py-1.5 text-[13px] font-semibold text-surface disabled:opacity-50";
  return (
    <li data-request={r.kind} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-3">
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar firstName={first ?? ""} lastName={rest.join(" ")} photoUrl={r.photoUrl} size={38} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <b className="truncate text-[14px]">{r.name}</b>
            <span className="border border-line px-1.5 text-[10.5px] font-bold tracking-[0.06em] text-ink-2">{r.kind}</span>
          </span>
          <span className="block truncate text-[12.5px] text-ink-3">
            {tab === "received" ? "asked" : "sent"} {day(r.at)}
            {r.note ? ` · “${r.note}${r.note.length >= 80 ? "…" : ""}”` : r.title ? ` · ${r.title}` : ""}
          </span>
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        {done ? (
          <span className="text-[12.5px] font-bold text-[#1f8a5b]">✓ {done}</span>
        ) : tab === "sent" ? (
          <>
            <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">Requested</span>
            <button type="button" disabled={busy} onClick={() => act("withdraw", "Withdrawn")} className={BTN}>Withdraw</button>
          </>
        ) : r.kind === "RECOMMENDATION" ? (
          <>
            {r.respondHref && <a href={r.respondHref} className={BTN_K}>Write It</a>}
            <button type="button" disabled={busy} onClick={() => act("decline", "Declined")} className={BTN}>Decline</button>
          </>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={() => act("accept", "Accepted")} className={BTN_K}>Accept</button>
            <button type="button" disabled={busy} onClick={() => act("decline", "Declined")} className={BTN}>Decline</button>
          </>
        )}
        {err && <span className="text-[12px] text-red-600">{err}</span>}
      </span>
    </li>
  );
}
