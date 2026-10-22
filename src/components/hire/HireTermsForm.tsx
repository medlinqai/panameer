"use client";

import { NeutralAvatar } from "@/components/Avatar";
import { BILLING_CYCLE_LABEL, HIRE_BILLING_CYCLES, HIRE_PAYMENT_EVENTS, PAYMENT_EVENT_LABEL, PER_UOM_LABEL } from "@/lib/billing-terms";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { HireDefaults } from "@/lib/hire-direct";

// HS-E005: work · provider · rate + recurrence · dates · location · payment event · overtime · expenses.
const FIELD = "mt-1 block w-full rounded-[8px] border border-line bg-white px-3 py-2.5 text-[14.5px] font-normal text-ink";
const LABEL = "mt-4 block text-[13px] font-bold";

export function HireTermsForm({ d }: { d: HireDefaults }) {
  const router = useRouter();
  const [t, setT] = useState({
    description: d.description, rate: d.unitPriceCents != null ? String(d.unitPriceCents / 100) : "", uom: d.uom, billingCycle: d.billingCycle,
    start: d.start, end: d.end, paymentEvent: d.paymentEvent, overtimeAllowed: d.overtimeAllowed, overtimeMultiplier: String(d.overtimeMultiplier),
    expensesAllowed: d.expensesAllowed, expensesCap: d.expensesCapCents != null ? String(d.expensesCapCents / 100) : "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderId: string; orderNumber: string; wrNumber: string | null; approvalNote: string | null } | null>(null);
  const set = (p: Partial<typeof t>) => setT((x) => ({ ...x, ...p }));
  const submit = async () => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/hire/terms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: d.jobId, providerPersonId: d.providerPersonId, description: t.description,
        unitPriceCents: Math.round(Number(t.rate) * 100), uom: t.uom, billingCycle: t.billingCycle, start: t.start, end: t.end, paymentEvent: t.paymentEvent,
        overtimeAllowed: t.overtimeAllowed, overtimeMultiplier: t.overtimeAllowed ? Number(t.overtimeMultiplier) : null,
        expensesAllowed: t.expensesAllowed, expensesCapCents: t.expensesAllowed && t.expensesCap ? Math.round(Number(t.expensesCap) * 100) : null,
      }),
    }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { orderId?: string | null; orderNumber?: string | null; wrNumber?: string | null; approvalNote?: string | null; erp?: boolean; error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "That didn't work."); return; }
    if (j.erp) router.push("/punchout");
    // WA-E001: Submit stays on a confirmation — the buyer opens the Work Order from there (or from the link we send).
    // Oracle-style confirmation: a dialog with the numbers just created, then review it or go on.
    else if (j.orderId) setDone({ orderId: j.orderId, orderNumber: j.orderNumber ?? "", wrNumber: j.wrNumber ?? null, approvalNote: j.approvalNote ?? null });
  };
  return (
    <div className="mt-4 rounded-[14px] border border-line bg-white p-5" data-hire-terms>
      <label className={LABEL}>Work<textarea value={t.description} onChange={(e) => set({ description: e.target.value })} rows={3} maxLength={500} className={FIELD} /></label>
      <p className={LABEL}>Provider
        <span className="mt-1 flex items-center gap-2.5 text-[14.5px] font-normal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {d.identityShown ? d.providerPhotoUrl && <img src={d.providerPhotoUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <NeutralAvatar size={36} />}
          <span>{d.providerCompany ? `${d.providerCompany} · ` : ""}{d.providerName}</span>
        </span>
        {!d.identityShown && <span className="mt-1 block text-[12.5px] font-normal text-ink-2">Name and company show once the Work Order exists.</span>}
      </p>
      <div className="grid gap-x-3 sm:grid-cols-3">
        <label className={LABEL}>Rate ($)<input inputMode="decimal" value={t.rate} onChange={(e) => set({ rate: e.target.value.replace(/[^0-9.]/g, "") })} className={FIELD} /></label>
        <label className={LABEL}>Per<select value={t.uom} onChange={(e) => set({ uom: e.target.value })} className={FIELD}>{Object.entries(PER_UOM_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className={LABEL}>Billed<select value={t.billingCycle} onChange={(e) => set({ billingCycle: e.target.value as typeof t.billingCycle })} className={FIELD}>{HIRE_BILLING_CYCLES.map((v) => <option key={v} value={v}>{BILLING_CYCLE_LABEL[v]}</option>)}</select></label>
      </div>
      <div className="grid gap-x-3 sm:grid-cols-3">
        <label className={LABEL}>Start<input type="date" value={t.start} onChange={(e) => set({ start: e.target.value })} className={FIELD} /></label>
        <label className={LABEL}>End<input type="date" value={t.end} onChange={(e) => set({ end: e.target.value })} className={FIELD} /></label>
        <p className={LABEL}>Location<span className="mt-1 block text-[14.5px] font-normal">{d.location || "Not set on the job"}</span></p>
      </div>
      <label className={LABEL}>Payment Event <span className="font-normal text-ink-3">(what raises each payment request)</span>
        <select value={t.paymentEvent} onChange={(e) => set({ paymentEvent: e.target.value })} className={FIELD}>{HIRE_PAYMENT_EVENTS.map((v) => <option key={v} value={v}>{PAYMENT_EVENT_LABEL[v]}</option>)}</select>
      </label>
      <fieldset className="mt-4">
        <legend className="text-[13px] font-bold">Overtime Allowed?</legend>
        <div className="mt-1 flex flex-wrap items-center gap-4 text-[14px]">
          <label><input type="radio" checked={!t.overtimeAllowed} onChange={() => set({ overtimeAllowed: false })} /> No</label>
          <label><input type="radio" checked={t.overtimeAllowed} onChange={() => set({ overtimeAllowed: true })} /> Yes, at</label>
          {t.overtimeAllowed && <input aria-label="Overtime rate multiplier" inputMode="decimal" value={t.overtimeMultiplier} onChange={(e) => set({ overtimeMultiplier: e.target.value.replace(/[^0-9.]/g, "") })} className="w-20 rounded-[8px] border border-line px-2 py-1.5" />}
          {t.overtimeAllowed && <span className="text-ink-2">× the rate</span>}
        </div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className="text-[13px] font-bold">Expenses Allowed?</legend>
        <div className="mt-1 flex flex-wrap items-center gap-4 text-[14px]">
          <label><input type="radio" checked={!t.expensesAllowed} onChange={() => set({ expensesAllowed: false })} /> No</label>
          <label><input type="radio" checked={t.expensesAllowed} onChange={() => set({ expensesAllowed: true })} /> Yes, up to $</label>
          {t.expensesAllowed && <input aria-label="Expenses cap" inputMode="decimal" value={t.expensesCap} onChange={(e) => set({ expensesCap: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="no cap" className="w-28 rounded-[8px] border border-line px-2 py-1.5" />}
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-[13.5px] font-semibold text-magenta-dark">{error}</p>}
      <div className="mt-5 border-t border-line pt-4">
        <button type="button" disabled={busy || !t.rate} onClick={submit} data-create-work-order className="inline-flex min-h-11 items-center bg-ink px-6 text-[14.5px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40">
          {busy ? "Working…" : d.erpOrigin ? "Submit" : `Hire ${d.providerName.replace(/^Provider\s+/, "")}`}
        </button>
        {!d.erpOrigin && <p className="mt-2 text-[12.5px] text-ink-2">Hiring awards the job and creates the Work Request. It is approved, then the Work Order comes to you to accept.</p>}
        {d.erpOrigin && <p className="mt-2 text-[12.5px] text-ink-2">This request came from your ERP — Submit returns it there to raise the PO.</p>}
      </div>
      {done && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,18,30,0.45)] px-4" role="dialog" aria-modal="true" aria-labelledby="hire-done-title" data-wr-submitted>
          <div className="w-full max-w-md bg-white p-6 text-ink shadow-xl">
            <h2 id="hire-done-title" className="text-[20px] font-extrabold">Confirmation</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed">
              Work Request <b className="whitespace-nowrap">{done.wrNumber ?? "—"}</b>{"\u00a0"}was submitted and approved.
            </p>
            <p className="mt-1 text-[14.5px] leading-relaxed">
              Work Order <b className="whitespace-nowrap">{done.orderNumber}</b>{"\u00a0"}is ready for your review. We&apos;ve also sent you a link.
            </p>
            {done.approvalNote && <p className="mt-1 text-[12.5px] text-ink-3">{done.approvalNote}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href={`/orders/${done.orderId}`} className="inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-bold text-surface hover:bg-ink-hover" data-review-work-order>Review Work Order</Link>
              <Link href="/hire" className="inline-flex min-h-11 items-center border border-ink px-5 text-[14px] font-bold text-ink">Post Another Job</Link>
              <Link href="/hire/overview" className="text-[14px] font-semibold text-magenta-dark underline underline-offset-4">Done</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
