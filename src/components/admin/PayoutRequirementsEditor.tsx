"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PayoutRule } from "@/lib/payout-requirements";

// RV-E004: one row per country ("*" = everyone else). Changes save at once.
const TH = "border-b border-line px-2 py-2 text-left text-[10.5px] font-bold tracking-[0.1em] text-ink-3";
const TD = "border-b border-state-sunken px-2 py-2.5 text-[13.5px]";

export function PayoutRequirementsEditor({ rules }: { rules: PayoutRule[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [add, setAdd] = useState("");
  const call = async (body: object) => {
    setErr(null);
    const r = await fetch("/api/admin/payout-requirements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErr(j.error ?? "Could not save that");
    else router.refresh();
    return r.ok;
  };
  const save = (r: PayoutRule, patch: Partial<PayoutRule>) => call({ action: "save", rule: { ...r, ...patch } });
  return (
    <div data-payout-requirements>
      {err && <p role="alert" className="mb-2 text-[13px] font-semibold text-magenta-dark">{err}</p>}
      <table className="w-full border-collapse bg-white">
        <thead><tr><th className={TH}>COUNTRY</th><th className={TH}>PAYOUT ACCOUNT</th><th className={TH}>TAX ID</th><th className={TH}>TAX FORM</th><th className={TH}>FORM NAME</th><th className={TH} /></tr></thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.country_code} data-rule={r.country_code}>
              <td className={TD}><b>{r.country_code === "*" ? "Everyone else" : r.country_code}</b></td>
              <td className={TD}><input type="checkbox" aria-label={`${r.country_code} payout account`} checked={r.needs_payout_account} onChange={(e) => save(r, { needs_payout_account: e.target.checked })} /></td>
              <td className={TD}><input type="checkbox" aria-label={`${r.country_code} tax ID`} checked={r.needs_tax_id} onChange={(e) => save(r, { needs_tax_id: e.target.checked })} /></td>
              <td className={TD}><input type="checkbox" aria-label={`${r.country_code} tax form`} checked={r.needs_tax_form} onChange={(e) => save(r, { needs_tax_form: e.target.checked })} /></td>
              <td className={TD}><input defaultValue={r.tax_form_label ?? ""} aria-label={`${r.country_code} form name`} placeholder="e.g. W-9" onBlur={(e) => e.target.value !== (r.tax_form_label ?? "") && save(r, { tax_form_label: e.target.value.trim() || null })} className="h-8 w-28 border border-line px-2 text-[13px]" /></td>
              <td className={`${TD} text-right`}>{r.country_code !== "*" && <button type="button" onClick={() => window.confirm(`Remove the ${r.country_code} rule? It falls back to Everyone else.`) && call({ action: "delete", country_code: r.country_code })} className="text-[12px] font-bold text-state-declined underline">Remove</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="mt-3 flex items-center gap-2" onSubmit={async (e) => { e.preventDefault(); if (add.trim() && (await call({ action: "save", rule: { country_code: add.trim(), needs_tax_id: false, needs_tax_form: false, tax_form_label: null, needs_payout_account: true } }))) setAdd(""); }}>
        <input value={add} onChange={(e) => setAdd(e.target.value.toUpperCase().slice(0, 2))} placeholder="CA" aria-label="Country code" className="h-9 w-16 border border-line px-2 text-[13px]" />
        <button type="submit" className="min-h-9 border border-ink bg-white px-3 text-[13px] font-bold">+ Add Country</button>
      </form>
    </div>
  );
}
