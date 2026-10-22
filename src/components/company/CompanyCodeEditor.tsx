"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// NB-E000: the company code in every transaction number (WR-STRAT-26-00000001). Numbers already issued keep their code.
export function CompanyCodeEditor({ companyId, initial, canEdit }: { companyId: string; initial: string | null; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(initial ?? "");
  const [check, setCheck] = useState<{ ok: boolean; reason: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!editing) return;
    const v = code.trim();
    const t = setTimeout(async () => {
      if (!v || v.toUpperCase() === initial) { setCheck(null); return; }
      const r = await fetch(`/api/company/code?code=${encodeURIComponent(v)}&companyId=${companyId}`).catch(() => null);
      setCheck(((await r?.json().catch(() => null)) as { ok: boolean; reason: string | null } | null) ?? null);
    }, 300);
    return () => clearTimeout(t);
  }, [code, editing, companyId, initial]);
  const save = async () => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/company/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, code }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { code?: string; error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "That didn't save."); return; }
    setEditing(false);
    setCode(j.code ?? code);
    router.refresh();
  };
  return (
    <section className="mt-4 rounded-brand border border-line bg-white p-4 text-[14px]" data-company-code>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">Company Code</span>
        {!editing ? (
          <>
            <b className="font-mono text-[15px]">{initial ?? "—"}</b>
            <span className="text-ink-2">in every number, e.g. RQ-{initial ?? "CODE"}-26-00000001</span>
            {canEdit && <button type="button" onClick={() => { setEditing(true); setCode(initial ?? ""); }} className="font-semibold text-magenta-dark underline underline-offset-4">Change</button>}
          </>
        ) : (
          <>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} aria-label="Company code" className="w-28 rounded-[8px] border border-line px-2.5 py-1.5 font-mono text-[15px]" />
            {check && <span className={check.ok ? "font-semibold text-ink" : "font-semibold text-magenta-dark"} data-code-check>{check.ok ? "Available" : check.reason}</span>}
            <button type="button" disabled={busy || !check?.ok} onClick={save} className="inline-flex min-h-9 items-center bg-ink px-4 text-[13px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="text-[13px] font-semibold text-ink-2 underline">Cancel</button>
          </>
        )}
      </div>
      {editing && <p className="mt-1 text-[12.5px] text-ink-3">3 to 6 letters or digits. Numbers already issued keep the old code; new ones use the new code and keep counting.</p>}
      {error && <p role="alert" className="mt-1 text-[13px] font-semibold text-magenta-dark">{error}</p>}
    </section>
  );
}
