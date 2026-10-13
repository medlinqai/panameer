"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// WN-E001: what a buyer's company needs to place an order — billing address + invoice email (legal name is in Legal & Tax).
type Addr = { line1: string; city: string; state: string; postalCode: string; country: string };
const IN = "w-full border border-line bg-surface px-2.5 py-2 text-[13.5px]";
const L = "flex flex-col gap-1 text-[12px] font-bold text-ink-2";

export function BillingDetails({ initial, invoiceEmail }: { initial: Addr; invoiceEmail: string }) {
  const router = useRouter();
  const [a, setA] = useState(initial);
  const [email, setEmail] = useState(invoiceEmail);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Addr, v: string) => setA((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/company/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceEmail: email, address: a }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? "Saved." : j.error ?? "Could not save that");
    if (r.ok) router.refresh();
  };
  return (
    <div data-billing-details className="mt-3 grid gap-3">
      <label className={L}>Billing address<input value={a.line1} onChange={(e) => set("line1", e.target.value)} className={IN} aria-label="Billing address" placeholder="Street address" /></label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className={L}>City<input value={a.city} onChange={(e) => set("city", e.target.value)} className={IN} aria-label="City" /></label>
        <label className={L}>State / Region<input value={a.state} onChange={(e) => set("state", e.target.value)} className={IN} aria-label="State" /></label>
        <label className={L}>Postal code<input value={a.postalCode} onChange={(e) => set("postalCode", e.target.value)} className={IN} aria-label="Postal code" /></label>
        <label className={L}>Country<input value={a.country} onChange={(e) => set("country", e.target.value)} className={IN} aria-label="Country" /></label>
      </div>
      <label className={L}>Invoice email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={IN} aria-label="Invoice email" placeholder="ap@yourcompany.com" /></label>
      <div className="flex items-center justify-end gap-3">
        {msg && <span role="status" className="text-[13px] font-semibold">{msg}</span>}
        <button type="button" disabled={busy} onClick={save} className="inline-flex min-h-10 items-center bg-ink px-4 text-[13.5px] font-bold text-surface disabled:opacity-40">{busy ? "Saving…" : "Save Billing Details"}</button>
      </div>
    </div>
  );
}
