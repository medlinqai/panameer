"use client";

import { useCallback, useEffect, useState } from "react";

type R = { avg: number; n: number; parts: Record<string, number> } | null;
type Row = { id: string; side: "BUYER" | "SELLER"; order: string; overall: number; comment: string | null; hidden: boolean; hiddenReason: string | null; at: string };

const line = (r: R) => (r && r.n ? `★ ${r.avg.toFixed(1)} · ${r.n} Review${r.n === 1 ? "" : "s"} · ${Object.entries(r.parts).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(" · ")}` : "No Reviews Yet");

// OR-E005: review averages and counts; Hide Comment asks for a reason (audited). The stars stay.
export function AdminOrderReviews({ personId, companyId }: { personId?: string; companyId?: string }) {
  const q = personId ? `personId=${personId}` : `companyId=${companyId}`;
  const [data, setData] = useState<{ asSeller: R; asBuyer: R; reviews: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => { fetch(`/api/admin/order-reviews?${q}`).then((r) => r.json()).then(setData).catch(() => setError("Couldn't load reviews.")); }, [q]);
  useEffect(() => { load(); }, [load]);
  const hide = async (id: string) => {
    const reason = window.prompt("Why hide this comment? (logged)");
    if (!reason?.trim()) return;
    const r = await fetch("/api/admin/order-reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId: id, reason }) }).catch(() => null);
    if (!r?.ok) { setError("Couldn't hide that comment."); return; }
    load();
  };
  return (
    <section className="border-t border-line pt-4" data-admin-order-reviews>
      <h2 className="text-[17px] font-bold">Order Reviews</h2>
      {!data ? <p className="text-[13px] text-ink-3">{error ?? "Loading…"}</p> : (
        <>
          {personId && <p className="mt-1 text-[13.5px]"><b>As Seller</b> {line(data.asSeller)}</p>}
          <p className="mt-1 text-[13.5px]"><b>As Buyer</b> {line(data.asBuyer)}</p>
          <ul className="mt-2">
            {data.reviews.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 border-b border-line/60 py-1.5 text-[13px]">
                <span className="text-ink-2">{r.at.slice(0, 10)} · {r.order} · {r.side === "BUYER" ? "by buyer" : "by seller"}</span>
                <b>★ {r.overall.toFixed(1)}</b>
                {r.comment && <span className={r.hidden ? "text-ink-3 line-through" : ""}>“{r.comment}”</span>}
                {r.hidden ? <span className="text-ink-3">Hidden · {r.hiddenReason}</span> : r.comment && <button type="button" onClick={() => hide(r.id)} className="font-semibold text-state-declined underline">Hide Comment</button>}
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="mt-1 text-[13px] text-state-declined">{error}</p>}
        </>
      )}
    </section>
  );
}
