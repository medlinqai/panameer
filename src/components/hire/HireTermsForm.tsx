"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HireDefaults } from "@/lib/hire-direct";

// HS-E005: work · provider · rate + recurrence · dates · location · settlement trigger · overtime · expenses.
const FIELD = "mt-1 block w-full rounded-[8px] border border-line bg-white px-3 py-2.5 text-[14.5px] font-normal text-ink";
const LABEL = "mt-4 block text-[13px] font-bold";
const UNITS = [["HOUR", "per hour"], ["DAY", "per day"], ["WEEK", "per week"], ["MONTH", "per month"]] as const;
const CYCLES = [["WEEKLY", "Weekly"], ["BIWEEKLY", "Every 2 weeks"], ["MONTHLY", "Monthly"]] as const;
const TRIGGERS = [["TIMESHEET", "Approved timesheet"], ["INVOICE", "Invoice"], ["PAYMENT_REQUEST", "Payment request"], ["ACCEPTANCE", "Acceptance of the work"], ["ORDER_ACCEPTED", "Order accepted"]] as const;

export function HireTermsForm({ d }: { d: HireDefaults }) {
  const router = useRouter();
  const [t, setT] = useState({
    description: d.description, rate: d.unitPriceCents != null ? String(d.unitPriceCents / 100) : "", uom: d.uom, billingCycle: d.billingCycle,
    start: d.start, end: d.end, paymentEvent: d.paymentEvent, overtimeAllowed: d.overtimeAllowed, overtimeMultiplier: String(d.overtimeMultiplier),
    expensesAllowed: d.expensesAllowed, expensesCap: d.expensesCapCents != null ? String(d.expensesCapCents / 100) : "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    const j = (await r?.json().catch(() => ({}))) as { orderId?: string | null; erp?: boolean; error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "That didn't work."); return; }
    if (j.erp) router.push("/punchout");
    else if (j.orderId) router.push(`/orders/${j.orderId}`);
  };
  return (
    <div className="mt-4 rounded-[14px] border border-line bg-white p-5" data-hire-terms>
      <label className={LABEL}>Work<textarea value={t.description} onChange={(e) => set({ description: e.target.value })} rows={3} maxLength={500} className={FIELD} /></label>
      <p className={LABEL}>Provider<span className="mt-1 block text-[14.5px] font-normal">{d.providerCompany ? `${d.providerCompany} · ` : ""}{d.providerName}</span></p>
      <div className="grid gap-x-3 sm:grid-cols-3">
        <label className={LABEL}>Rate ($)<input inputMode="decimal" value={t.rate} onChange={(e) => set({ rate: e.target.value.replace(/[^0-9.]/g, "") })} className={FIELD} /></label>
        <label className={LABEL}>Per<select value={t.uom} onChange={(e) => set({ uom: e.target.value })} className={FIELD}>{UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className={LABEL}>Billed<select value={t.billingCycle} onChange={(e) => set({ billingCycle: e.target.value as typeof t.billingCycle })} className={FIELD}>{CYCLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      </div>
      <div className="grid gap-x-3 sm:grid-cols-3">
        <label className={LABEL}>Start<input type="date" value={t.start} onChange={(e) => set({ start: e.target.value })} className={FIELD} /></label>
        <label className={LABEL}>End<input type="date" value={t.end} onChange={(e) => set({ end: e.target.value })} className={FIELD} /></label>
        <p className={LABEL}>Location<span className="mt-1 block text-[14.5px] font-normal">{d.location || "Not set on the job"}</span></p>
      </div>
      <label className={LABEL}>Settlement trigger <span className="font-normal text-ink-3">(what releases each payment)</span>
        <select value={t.paymentEvent} onChange={(e) => set({ paymentEvent: e.target.value })} className={FIELD}>{TRIGGERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </label>
      <fieldset className="mt-4">
        <legend className="text-[13px] font-bold">Overtime allowed?</legend>
        <div className="mt-1 flex flex-wrap items-center gap-4 text-[14px]">
          <label><input type="radio" checked={!t.overtimeAllowed} onChange={() => set({ overtimeAllowed: false })} /> No</label>
          <label><input type="radio" checked={t.overtimeAllowed} onChange={() => set({ overtimeAllowed: true })} /> Yes, at</label>
          {t.overtimeAllowed && <input aria-label="Overtime rate multiplier" inputMode="decimal" value={t.overtimeMultiplier} onChange={(e) => set({ overtimeMultiplier: e.target.value.replace(/[^0-9.]/g, "") })} className="w-20 rounded-[8px] border border-line px-2 py-1.5" />}
          {t.overtimeAllowed && <span className="text-ink-2">× the rate</span>}
        </div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className="text-[13px] font-bold">Expenses allowed?</legend>
        <div className="mt-1 flex flex-wrap items-center gap-4 text-[14px]">
          <label><input type="radio" checked={!t.expensesAllowed} onChange={() => set({ expensesAllowed: false })} /> No</label>
          <label><input type="radio" checked={t.expensesAllowed} onChange={() => set({ expensesAllowed: true })} /> Yes, up to $</label>
          {t.expensesAllowed && <input aria-label="Expenses cap" inputMode="decimal" value={t.expensesCap} onChange={(e) => set({ expensesCap: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="no cap" className="w-28 rounded-[8px] border border-line px-2 py-1.5" />}
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-[13.5px] font-semibold text-magenta-dark">{error}</p>}
      <div className="mt-5 border-t border-line pt-4">
        <button type="button" disabled={busy || !t.rate} onClick={submit} data-create-work-order className="inline-flex min-h-11 items-center bg-ink px-6 text-[14.5px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40">
          {busy ? "Working…" : d.erpOrigin ? "Submit" : "Create Work Order"}
        </button>
        {d.erpOrigin && <p className="mt-2 text-[12.5px] text-ink-2">This request came from your ERP — Submit returns it there to raise the PO.</p>}
      </div>
    </div>
  );
}
