"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_MAGENTA, BTN_OUT } from "@/components/hire/HireUI";

type F = { key: string; label: string; value: number | null };

// OR-E002: stars on four lines, an optional comment (≤500), and for the buyer an optional "Also Write a Recommendation".
export function OrderReviewForm({ orderId, side, otherName, fields, comment: initial, submitted, canEdit, due }: { orderId: string; side: "BUYER" | "SELLER"; otherName: string; fields: F[]; comment: string; submitted: boolean; canEdit: boolean; due: string }) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>(Object.fromEntries(fields.filter((f) => f.value).map((f) => [f.key, f.value!])));
  const [comment, setComment] = useState(initial);
  const [recommend, setRecommend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(submitted && !canEdit);
  const [asked, setAsked] = useState<"no" | "busy" | "yes">("no");

  const submit = async () => {
    setBusy(true); setError(null);
    const r = await fetch(`/api/orders/${orderId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...scores, comment }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "Couldn't save your review — try again."); return; }
    if (side === "BUYER" && recommend) { router.push(`/recommend-order/${orderId}`); return; }
    setDone(true);
    router.refresh();
  };
  const ask = async () => {
    setAsked("busy"); setError(null);
    const r = await fetch(`/api/orders/${orderId}/review/ask`, { method: "POST" }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    if (!r?.ok) { setAsked("no"); setError(j.error ?? "Couldn't send that — try again."); return; }
    setAsked("yes");
  };

  if (done) {
    return (
      <section className="mt-6 rounded-[12px] border border-line bg-surface p-5" data-review-done>
        <h2 className="text-[17px] font-bold">Thanks — Your Review Is In</h2>
        <p className="mt-1 text-[14px] text-ink-2">It shows once {otherName} reviews you too, or on {due}, whichever comes first. You can edit it for 7 days after it shows.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {side === "SELLER" && (asked === "yes"
            ? <span className="self-center text-[13.5px] font-semibold text-state-accepted">Recommendation request sent</span>
            : <button type="button" className={BTN_MAGENTA} disabled={asked === "busy"} onClick={ask}>Ask {otherName} for a Recommendation</button>)}
          {canEdit && <button type="button" className={BTN_OUT} onClick={() => setDone(false)}>Edit My Review</button>}
          <a href="/worklist" className={BTN_OUT}>Back to Worklist</a>
        </div>
        {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-state-declined">{error}</p>}
      </section>
    );
  }
  if (!canEdit) return <p className="mt-6 text-[14px] text-ink-2">The review window for this Order closed on {due}.</p>;
  const ready = fields.every((f) => scores[f.key]);
  return (
    <section className="mt-6 rounded-[12px] border border-line bg-surface p-5" data-review-form>
      {fields.map((f) => (
        <div key={f.key} className="flex flex-wrap items-center justify-between gap-2 border-b border-state-sunken py-3 last:border-b-0">
          <span className="text-[14.5px] font-semibold">{f.label}</span>
          <span className="flex gap-1" role="radiogroup" aria-label={f.label}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={scores[f.key] === n} aria-label={`${n} of 5`} onClick={() => setScores((s) => ({ ...s, [f.key]: n }))} className={`h-9 w-9 text-[22px] leading-none ${n <= (scores[f.key] ?? 0) ? "text-magenta" : "text-state-border"}`}>★</button>
            ))}
          </span>
        </div>
      ))}
      <label className="mt-4 block text-[13.5px] font-semibold">Comment <span className="font-normal text-ink-2">(optional)</span></label>
      <textarea value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} rows={4} className="mt-1 w-full border border-state-border bg-surface p-2.5 text-[14px]" />
      <p className="text-right text-[12px] text-ink-2">{comment.length} / 500</p>
      {side === "BUYER" && (
        <label className="mt-2 flex items-center gap-2 text-[14px]">
          <input type="checkbox" className="h-4 w-4 accent-ink" checked={recommend} onChange={(e) => setRecommend(e.target.checked)} />
          Also write a Recommendation for {otherName}
        </label>
      )}
      <div className="mt-4 flex gap-2">
        <button type="button" className={BTN} disabled={!ready || busy} onClick={submit}>{submitted ? "Save Review" : "Submit Review"}</button>
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-state-declined">{error}</p>}
    </section>
  );
}
