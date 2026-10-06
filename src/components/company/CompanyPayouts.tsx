"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 3 · Payout Account: owned by the company; label + last 4 only. Any change emails every admin.
type Method = { id: string; kind: string; label: string; last4: string | null; country: string; isDefault: boolean };
const KIND: Record<string, string> = { BANK_ACCOUNT: "Bank (ACH)", WIRE: "Wire", PAYPAL: "PayPal" };
const INPUT = "mt-1 min-h-[42px] w-full border border-line bg-surface px-3 text-[14px] text-ink focus:border-ink focus:outline-none";
const BTN = "min-h-[42px] px-4 text-[13px] font-bold disabled:opacity-50";

export function CompanyPayouts({ methods, canAdd, legalName }: { methods: Method[]; canAdd: string | null; legalName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ kind: "BANK_ACCOUNT", label: "", last4: "", country: "United States", holderName: legalName });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const post = async (body: unknown) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/company/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    if (!r?.ok) {
      setError(b?.error ?? "That didn't save.");
      return false;
    }
    router.refresh();
    return true;
  };
  return (
    <div className="mt-2" data-company-payouts={methods.length}>
      {methods.length === 0 ? (
        <div className="border border-dashed border-line p-4">
          <b className="block text-[14.5px]">No payout account yet</b>
          <span className="text-[13.5px] text-ink-2">Bank (ACH), wire or PayPal. Panameer keeps only the bank name and last 4 — never the full account number.</span>
        </div>
      ) : (
        methods.map((m) => (
          <div key={m.id} data-payout className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line/60 py-3">
            <span className="min-w-0">
              <b className="block text-[14.5px]">{m.label}</b>
              <span className="text-[12.5px] text-ink-3">
                {KIND[m.kind] ?? m.kind}
                {m.last4 ? ` · ending ${m.last4}` : ""} · {m.country}
                {m.isDefault ? " · default" : ""}
              </span>
            </span>
            {removing === m.id ? (
              <span className="flex gap-2">
                <button type="button" disabled={busy} onClick={async () => (await post({ action: "remove", id: m.id })) && setRemoving(null)} className={`${BTN} bg-ink text-surface`}>Remove</button>
                <button type="button" onClick={() => setRemoving(null)} className={`${BTN} border border-ink`}>Cancel</button>
              </span>
            ) : (
              <button type="button" onClick={() => setRemoving(m.id)} className={`${BTN} border border-ink`}>Remove</button>
            )}
          </div>
        ))
      )}
      {open ? (
        <div data-add-payout className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-[13px] font-semibold">
            Type
            <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} name="kind" className={INPUT}>
              {Object.entries(KIND).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="block text-[13px] font-semibold">
            Name you&apos;ll recognize
            <input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} name="label" placeholder="Operating account" className={INPUT} />
          </label>
          <label className="block text-[13px] font-semibold sm:col-span-2">
            Account holder name
            <span className="block text-[12.5px] font-normal text-ink-3">Must be the company&apos;s legal name: {legalName}.</span>
            <input value={f.holderName} onChange={(e) => setF({ ...f, holderName: e.target.value })} name="holderName" className={INPUT} />
          </label>
          <label className="block text-[13px] font-semibold">
            Last 4 of the account
            <input value={f.last4} onChange={(e) => setF({ ...f, last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} name="last4" inputMode="numeric" className={INPUT} />
          </label>
          <label className="block text-[13px] font-semibold">
            Country
            <input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} name="country" className={INPUT} />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" disabled={busy || !f.label.trim()} onClick={async () => { if (await post({ action: "add", ...f, last4: f.last4 || null })) { setOpen(false); setF({ ...f, label: "", last4: "" }); } }} className={`${BTN} bg-ink text-surface`}>
              {busy ? "Saving…" : "Save Payout Account"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={`${BTN} border border-ink`}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" data-add-payout-open disabled={!!canAdd} onClick={() => setOpen(true)} className={`${BTN} mt-3 bg-ink text-surface`}>
          Add Payout Account
        </button>
      )}
      {canAdd && <p className="mt-2 text-[13px] text-ink-2">{canAdd}</p>}
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{error}</p>}
      <p className="mt-3 text-[12.5px] text-ink-3">Only admins can add or change it. A change emails every admin.</p>
    </div>
  );
}
