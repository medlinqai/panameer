"use client";

import { useState } from "react";
import type { SetupValues } from "@/lib/erp/setup-create";

const FIELD = "mt-1 block w-full rounded-[8px] border border-line bg-white px-3 py-2.5 text-[14.5px]";
const LABEL = "mt-3 block text-[13px] font-bold";

function Copy({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" onClick={() => { void navigator.clipboard?.writeText(value).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }); }} className="shrink-0 border border-ink px-2.5 py-1 text-[12.5px] font-semibold">{ok ? "Copied" : "Copy"}</button>;
}

export function SetupForm({ initial }: { initial: { firstName: string; lastName: string; email: string; companyName: string } }) {
  const [v, setV] = useState({ companyName: initial.companyName, line1: "", city: "", state: "", postalCode: "", country: "US", firstName: initial.firstName, lastName: initial.lastName, email: initial.email, erpAdminEmail: "", acceptTerms: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<string | null>(null);
  const [values, setValues] = useState<SetupValues | null>(null);
  const set = (k: keyof typeof v, x: string | boolean) => setV((o) => ({ ...o, [k]: x }));
  const submit = async () => {
    setBusy(true); setError(null);
    const r = await fetch("/punchout/setup/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string; existing?: boolean; companyName?: string; values?: SetupValues };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "Couldn't create your company — try again."); return; }
    if (j.existing) { setExisting(j.companyName ?? "your company"); return; }
    setValues(j.values ?? null);
  };
  if (existing) return <p className="mt-6 rounded-[10px] bg-state-pending-bg px-4 py-3 text-[15px] font-semibold text-state-pending" data-setup-existing>Your company is already on Panameer ({existing}) — ask your admin. We&apos;ve let them know you tried.</p>;
  if (values) {
    const rows: [string, string][] = [["Identity", values.identity], ["Password", values.secret], ["Punchout URL", values.punchoutUrl], ["Supplier ID", values.supplierId], ["Domain", values.domain]];
    return (
      <section className="mt-6 rounded-[12px] border border-magenta p-5" data-setup-values>
        <h2 className="text-[18px] font-extrabold">{values.companyName} Is Set Up</h2>
        <p className="mt-1 text-[14px] text-ink-2">Paste these into your Panameer punchout catalog in Oracle (Manage Punchout Catalogs), Save, then Test Connection. <b className="text-ink">The password is shown once</b> — we&apos;ve also emailed it to you.</p>
        <dl className="mt-4 divide-y divide-line border-y border-line">
          {rows.map(([k, x]) => (
            <div key={k} className="flex items-center gap-3 py-2.5">
              <dt className="w-[130px] shrink-0 text-[13px] font-bold">{k}</dt>
              <dd className="min-w-0 flex-1 break-all font-mono text-[13.5px]">{x}</dd>
              <Copy value={x} />
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[13px] text-ink-2">Setup guide and videos: <a href="/erp/connect" className="font-semibold underline">Connect Your ERP</a>.</p>
      </section>
    );
  }
  return (
    <div className="mt-6" data-setup-form>
      <label className={LABEL}>Company Name<input value={v.companyName} onChange={(e) => set("companyName", e.target.value)} className={FIELD} /></label>
      <label className={LABEL}>Street Address<input value={v.line1} onChange={(e) => set("line1", e.target.value)} className={FIELD} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className={LABEL}>City<input value={v.city} onChange={(e) => set("city", e.target.value)} className={FIELD} /></label>
        <label className={LABEL}>State<input value={v.state} onChange={(e) => set("state", e.target.value)} className={FIELD} /></label>
        <label className={LABEL}>Postal Code<input value={v.postalCode} onChange={(e) => set("postalCode", e.target.value)} className={FIELD} /></label>
        <label className={LABEL}>Country<input value={v.country} onChange={(e) => set("country", e.target.value)} className={FIELD} /></label>
        <label className={LABEL}>First Name<input value={v.firstName} onChange={(e) => set("firstName", e.target.value)} className={FIELD} /></label>
        <label className={LABEL}>Last Name<input value={v.lastName} onChange={(e) => set("lastName", e.target.value)} className={FIELD} /></label>
      </div>
      <label className={LABEL}>Your Email<input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} className={FIELD} /></label>
      <label className={LABEL}>ERP Admin Email (Optional — Can Be the Same)<input type="email" value={v.erpAdminEmail} onChange={(e) => set("erpAdminEmail", e.target.value)} className={FIELD} /></label>
      <label className="mt-4 flex items-start gap-2 text-[14px]"><input type="checkbox" checked={v.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)} className="mt-1" /><span>I accept the <a href="/legal/terms" target="_blank" className="underline">Panameer Terms</a> for buyers on behalf of my company.</span></label>
      {error && <p role="alert" className="mt-3 text-[13.5px] font-semibold text-state-declined">{error}</p>}
      <button type="button" disabled={busy || !v.acceptTerms} onClick={submit} className="mt-5 inline-flex min-h-11 items-center bg-ink px-6 text-[14.5px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40" data-create-company>{busy ? "Creating…" : "Create My Company"}</button>
    </div>
  );
}
