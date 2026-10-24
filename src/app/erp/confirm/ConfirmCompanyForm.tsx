"use client";

import { useState } from "react";

const FIELD = "mt-1 block w-full rounded-[8px] border border-line bg-white px-3 py-2.5 text-[14.5px]";
const LABEL = "mt-3 block text-[13px] font-bold";

export function ConfirmCompanyForm({ token, companyName }: { token: string; companyName: string }) {
  const [v, setV] = useState({ companyName, line1: "", city: "", state: "", postalCode: "", country: "US", password: "", acceptTerms: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof v, x: string | boolean) => setV((o) => ({ ...o, [k]: x }));
  const submit = async () => {
    setBusy(true); setError(null);
    const r = await fetch("/api/erp/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...v }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string; email?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "Couldn't confirm — try again."); return; }
    setDone(j.email ?? "");
  };
  if (done !== null) return <p className="mt-6 rounded-[10px] bg-state-accepted-bg px-4 py-3 text-[15px] font-semibold text-state-accepted">Confirmed. <a href="/login" className="underline">Sign in</a> as {done} with your new password.</p>;
  return (
    <div className="mt-5" data-confirm-company>
      <label className={LABEL}>Company Name<input value={v.companyName} onChange={(e) => set("companyName", e.target.value)} className={FIELD} /></label>
      <label className={LABEL}>Street Address<input value={v.line1} onChange={(e) => set("line1", e.target.value)} className={FIELD} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className={LABEL}>City<input value={v.city} onChange={(e) => set("city", e.target.value)} className={FIELD} /></label>
        <label className={LABEL}>State<input value={v.state} onChange={(e) => set("state", e.target.value)} className={FIELD} /></label>
        <label className={LABEL}>Postal Code<input value={v.postalCode} onChange={(e) => set("postalCode", e.target.value)} className={FIELD} /></label>
        <label className={LABEL}>Country<input value={v.country} onChange={(e) => set("country", e.target.value)} className={FIELD} /></label>
      </div>
      <label className={LABEL}>Password<input type="password" autoComplete="new-password" value={v.password} onChange={(e) => set("password", e.target.value)} className={FIELD} /></label>
      <label className="mt-4 flex items-start gap-2 text-[14px]"><input type="checkbox" checked={v.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)} className="mt-1" /><span>I accept the <a href="/legal/terms" target="_blank" className="underline">Panameer Terms</a> for buyers on behalf of my company.</span></label>
      {error && <p role="alert" className="mt-3 text-[13.5px] font-semibold text-state-declined">{error}</p>}
      <button type="button" disabled={busy || !v.acceptTerms || v.password.length < 8} onClick={submit} className="mt-5 inline-flex min-h-11 items-center bg-ink px-6 text-[14.5px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40" data-confirm-submit>{busy ? "Confirming…" : "Confirm Company"}</button>
    </div>
  );
}
