"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT, LABEL } from "@/components/hire/HireUI";

// JS-E005: Edit while Comparing = an Amendment — the changes side by side, a required reason, and a fair-sourcing warning.
export type AmendValues = Record<string, string>;
const FIELDS: [string, string, "text" | "area" | "date" | "number" | "worksite"][] = [
  ["title", "Title", "text"], ["summary", "Description", "area"], ["budgetMin", "Rate From", "number"], ["budgetMax", "Rate To", "number"],
  ["startDate", "Start Date", "date"], ["endDate", "End Date", "date"], ["worksite", "Worksite", "worksite"], ["city", "City", "text"], ["state", "State", "text"],
  ["required", "Must Have", "area"], ["niceToHave", "Nice to Have", "area"],
];
const FIELD = "mt-1 block w-full rounded-[8px] border border-state-border bg-white px-3 py-2 text-[14px] font-normal";

export function AmendJob({ jobId, initial, asked }: { jobId: string; initial: AmendValues; asked: number }) {
  const router = useRouter();
  const [v, setV] = useState<AmendValues>(initial);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = FIELDS.filter(([k]) => (v[k] ?? "") !== (initial[k] ?? ""));
  const save = async () => {
    setBusy(true); setError(null);
    const patch = Object.fromEntries(changed.map(([k]) => [k, v[k]]));
    const r = await fetch("/api/job-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "amend", jobId, patch, reason }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string; number?: number };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "Couldn't save the Amendment."); return; }
    router.push(`/work-requests/${jobId}?tab=details`);
    router.refresh();
  };
  return (
    <section className="rounded-[12px] border border-magenta p-5" data-amend-job>
      <h2 className="text-[18px] font-extrabold">Edit (Amendment)</h2>
      <p className="mt-1 rounded-[8px] bg-state-pending-bg px-3 py-2 text-[13.5px] font-semibold text-state-pending">Everyone asked must review and re-confirm{asked ? ` (${asked})` : ""}. Hire waits until a provider re-confirms, and the answer deadline moves to at least 24 hours from now.</p>
      <div className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {FIELDS.map(([k, label, kind]) => (
          <label key={k} className={`${LABEL} ${kind === "area" ? "sm:col-span-2" : ""}`}>{label}
            {kind === "area" ? <textarea rows={3} value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} className={FIELD} />
              : kind === "worksite" ? <select value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} className={FIELD}><option value="OFFSITE">Offsite</option><option value="ONSITE">Onsite</option><option value="HYBRID">Hybrid</option></select>
              : <input type={kind === "date" ? "date" : "text"} inputMode={kind === "number" ? "decimal" : undefined} value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: kind === "number" ? e.target.value.replace(/[^0-9.]/g, "") : e.target.value })} className={FIELD} />}
          </label>
        ))}
      </div>
      {changed.length > 0 && (
        <div className="mt-4 overflow-x-auto" data-amend-changes>
          <table className="w-full min-w-[480px] text-[13.5px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-[0.08em] text-state-inactive"><th className="py-1.5">Field</th><th>Before</th><th>After</th></tr></thead>
            <tbody>{changed.map(([k, label]) => <tr key={k} className="border-t border-state-sunken align-top"><td className="py-1.5 font-semibold">{label}</td><td className="pr-3 text-state-inactive line-through">{initial[k] || "—"}</td><td className="font-semibold">{v[k] || "—"}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <label className={`${LABEL} mt-4 block`}>Reason (Required — Providers See It)<textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className={FIELD} /></label>
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-state-declined">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" disabled={busy || !changed.length || !reason.trim()} onClick={save} className={`${BTN} disabled:opacity-40`} data-save-amendment>Save Amendment</button>
        <button type="button" onClick={() => router.push(`/work-requests/${jobId}?tab=details`)} className={BTN_OUT}>Cancel</button>
      </div>
    </section>
  );
}

/** JS-E005 (provider): keep my rate and answers after reviewing the Amendment. */
export function ReconfirmButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={busy} onClick={async () => { setBusy(true); const r = await fetch("/api/job-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reconfirm", jobId }) }).catch(() => null); setBusy(false); if (!r?.ok) { setError(((await r?.json().catch(() => ({}))) as { error?: string }).error ?? "That didn't work."); return; } router.refresh(); }} className={BTN} data-reconfirm>Re-Confirm My Answer</button>
      {error && <span role="alert" className="text-[13px] font-semibold text-state-declined">{error}</span>}
    </span>
  );
}
