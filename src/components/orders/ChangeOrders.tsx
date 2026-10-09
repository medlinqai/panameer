"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BTN = "inline-flex min-h-11 items-center border border-ink bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-40";
const BTN_K = "inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40";
const INPUT = "h-10 w-full border border-line bg-surface px-2.5 text-[14px] focus:border-ink focus:outline-none";

export type ChangeLine = { id: string; lineNumber: number; description: string; byQuantity: boolean; quantity: number | null; rateCents: number | null; amountCents: number | null; start: string | null; end: string | null };
export type ChangeHistory = { id: string; number: number; status: string; createdAt: string; decidedAt: string | null; note: string | null; lines: string[]; fromErp: boolean };

const dollars = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));
const cents = (s: string) => (s.trim() === "" ? null : Math.round(Number(s) * 100));

/** O-E003: the customer raises a change order; the provider accepts or rejects it; both see the history. */
export function ChangeOrders(props: {
  orderId: string;
  party: "BUYER" | "PROVIDER" | "NONE";
  canChange: boolean;
  blockedReason: string | null;
  header: { nteCents: number | null; start: string | null; end: string | null; sow: string | null };
  lines: ChangeLine[];
  history: ChangeHistory[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [h, setH] = useState({ nte: dollars(props.header.nteCents), start: props.header.start ?? "", end: props.header.end ?? "", sow: props.header.sow ?? "" });
  const [ls, setLs] = useState(props.lines.map((l) => ({ id: l.id, quantity: l.quantity == null ? "" : String(l.quantity), rate: dollars(l.rateCents), amount: dollars(l.amountCents), start: l.start ?? "", end: l.end ?? "" })));
  const pending = props.history.find((r) => r.status === "PENDING");

  const post = async (url: string, body: unknown) => {
    setBusy(true);
    setError(null);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "That didn't work."), false;
    router.refresh();
    return true;
  };

  const submit = async () => {
    const header: Record<string, string | number | null> = {};
    if (cents(h.nte) !== props.header.nteCents) header.not_to_exceed_cents = cents(h.nte);
    if ((h.start || null) !== props.header.start) header.period_start = h.start || null;
    if ((h.end || null) !== props.header.end) header.period_end = h.end || null;
    if ((h.sow.trim() || null) !== (props.header.sow ?? null)) header.sow_text = h.sow.trim() || null;
    const lines = props.lines
      .map((l, i) => {
        const v = ls[i];
        const fields: Record<string, string | number | null> = {};
        if (l.byQuantity) {
          const q = v.quantity.trim() === "" ? null : Number(v.quantity);
          if (q !== l.quantity) fields.quantity = q;
          if (cents(v.rate) !== l.rateCents) fields.unit_price_cents = cents(v.rate);
        } else if (cents(v.amount) !== l.amountCents) fields.amount_cents = cents(v.amount);
        if ((v.start || null) !== l.start) fields.service_start = v.start || null;
        if ((v.end || null) !== l.end) fields.service_end = v.end || null;
        return { lineId: l.id, fields };
      })
      .filter((l) => Object.keys(l.fields).length);
    if (!Object.keys(header).length && !lines.length) return setError("Change at least one term.");
    if (await post(`/api/orders/${props.orderId}/revisions`, { header, lines })) setOpen(false);
  };

  return (
    <section id="change-order" data-testid="change-orders" className="mt-8 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-bold">Change Orders</h2>
        {props.party === "BUYER" && !open && !pending && (
          props.canChange ? <button type="button" data-raise-change onClick={() => setOpen(true)} className={BTN}>Change Terms</button> : props.blockedReason ? <span className="text-[13px] text-ink-2">{props.blockedReason}</span> : null
        )}
      </div>

      {pending && (
        <div data-pending-change className="mt-3 border border-magenta p-4">
          <p className="text-[15px] font-bold">Change order {pending.number} · Pending Change Acknowledgment</p>
          <p className="mt-0.5 text-[13px] text-ink-2">{props.party === "PROVIDER" ? "The current terms stay in force until you accept." : "Waiting on the provider. The current terms stay in force until they accept."}</p>
          <ul className="mt-2 grid gap-1 text-[14px]">{pending.lines.map((t) => <li key={t}>{t}</li>)}</ul>
          {props.party === "PROVIDER" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" disabled={busy} onClick={() => post(`/api/orders/${props.orderId}/revisions/${pending.id}`, { decision: "ACCEPT" })} className={BTN_K}>Accept Change</button>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason, if rejecting" aria-label="Reason" className="h-11 min-w-[200px] flex-1 border border-line px-2.5 text-[14px]" />
              <button type="button" disabled={busy || note.trim().length < 3} onClick={() => post(`/api/orders/${props.orderId}/revisions/${pending.id}`, { decision: "REJECT", note })} className={BTN}>Reject</button>
            </div>
          )}
        </div>
      )}

      {open && (
        <div data-change-form className="mt-3 border border-line bg-white p-4">
          <p className="text-[13.5px] text-ink-2">Change any term. The provider accepts before it applies.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-[12.5px] font-bold">Not to exceed ($)<input inputMode="decimal" value={h.nte} onChange={(e) => setH({ ...h, nte: e.target.value })} className={INPUT} /></label>
            <label className="text-[12.5px] font-bold">Starts<input type="date" value={h.start} onChange={(e) => setH({ ...h, start: e.target.value })} className={INPUT} /></label>
            <label className="text-[12.5px] font-bold">Ends<input type="date" value={h.end} onChange={(e) => setH({ ...h, end: e.target.value })} className={INPUT} /></label>
          </div>
          {props.lines.map((l, i) => (
            <fieldset key={l.id} className="mt-3 border-t border-line pt-3">
              <legend className="text-[13px] font-bold">Line {l.lineNumber} · {l.description}</legend>
              <div className="mt-1 grid gap-3 sm:grid-cols-4">
                {l.byQuantity ? (
                  <>
                    <label className="text-[12.5px] font-bold">Quantity<input inputMode="decimal" value={ls[i].quantity} onChange={(e) => setLs(ls.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} className={INPUT} /></label>
                    <label className="text-[12.5px] font-bold">Rate ($)<input inputMode="decimal" value={ls[i].rate} onChange={(e) => setLs(ls.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)))} className={INPUT} /></label>
                  </>
                ) : (
                  <label className="text-[12.5px] font-bold sm:col-span-2">Amount ($)<input inputMode="decimal" value={ls[i].amount} onChange={(e) => setLs(ls.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} className={INPUT} /></label>
                )}
                <label className="text-[12.5px] font-bold">Starts<input type="date" value={ls[i].start} onChange={(e) => setLs(ls.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} className={INPUT} /></label>
                <label className="text-[12.5px] font-bold">Ends<input type="date" value={ls[i].end} onChange={(e) => setLs(ls.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} className={INPUT} /></label>
              </div>
            </fieldset>
          ))}
          <label className="mt-3 block text-[12.5px] font-bold">Statement of work<textarea value={h.sow} onChange={(e) => setH({ ...h, sow: e.target.value })} rows={4} className="mt-0.5 w-full border border-line px-2.5 py-2 text-[14px]" /></label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy} onClick={submit} className={BTN_K}>{busy ? "Sending…" : "Send to Provider"}</button>
            <button type="button" onClick={() => { setOpen(false); setError(null); }} className="text-[14px] font-semibold underline">Cancel</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{error}</p>}

      {props.history.filter((r) => r.status !== "PENDING").length > 0 && (
        <ul className="mt-4 grid gap-2">
          {props.history.filter((r) => r.status !== "PENDING").map((r) => (
            <li key={r.id} className="border-b border-line pb-2 text-[13.5px]">
              <span className="font-bold">Revision {r.number}</span> · {r.status === "ACCEPTED" ? "Accepted" : "Rejected"} {r.decidedAt}{r.fromErp ? " · from ERP" : ""}
              {r.note && <span className="text-ink-2"> · “{r.note}”</span>}
              <ul className="mt-0.5 text-ink-2">{r.lines.map((t) => <li key={t}>{t}</li>)}</ul>
            </li>
          ))}
        </ul>
      )}
      {props.history.length === 0 && !open && <p className="mt-2 text-[13.5px] text-ink-2">No change orders. Revision 0.</p>}
    </section>
  );
}
