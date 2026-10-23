"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT, LABEL } from "@/components/hire/HireUI";
import { QuestionEditor, blankQuestion } from "@/components/hire/QuestionEditor";
import type { Question } from "@/lib/question-types";
import type { BankRow } from "@/lib/question-banks";

// AQ-E002 / QB-E001: up to 10 typed questions to one or many providers; Draft With AI fills 3–5 quick ones the buyer edits.
const FIELD = "mt-1 block w-full rounded-[8px] border border-state-border bg-white px-3 py-2 text-[14px]";

export function AskQuestionsDialog({ jobId, providerPersonIds, providerLabels = [], defaultDue, onClose, onSent }: { jobId: string; providerPersonIds: string[]; providerLabels?: string[]; defaultDue?: string | null; onClose: () => void; onSent?: (msg: string) => void }) {
  const router = useRouter();
  const [qs, setQs] = useState<Question[]>([blankQuestion(), blankQuestion(), blankQuestion("NUMBER")]);
  const [due, setDue] = useState((defaultDue ?? new Date(Date.now() + 48 * 3_600_000).toISOString()).slice(0, 10));
  const [busy, setBusy] = useState<"draft" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // QB-E004: Load From Bank (My · Company · Panameer Starters) and Save as Bank.
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [bankName, setBankName] = useState("");
  const [share, setShare] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const bankCall = (body: object) => fetch("/api/question-banks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  useEffect(() => { void (async () => { const r = await bankCall({ action: "list" }); if (r?.ok) setBanks(((await r.json()) as { banks: BankRow[] }).banks); })(); }, []);
  const saveBank = async () => {
    setSaved(null); setError(null);
    const r = await bankCall({ action: "save", name: bankName, questions: qs.filter((q) => q.text.trim()), shared: share });
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    if (!r?.ok) { setError(j.error ?? "Couldn't save the bank."); return; }
    setSaved(`Saved "${bankName.trim()}"${share ? " · shared with your company" : ""}.`);
  };
  const call = async (body: object) => {
    const r = await fetch("/api/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string; questions?: Question[]; sent?: number };
    return { ok: !!r?.ok, j };
  };
  const draft = async () => {
    setBusy("draft"); setError(null);
    const { ok, j } = await call({ action: "draft", jobId });
    setBusy(null);
    if (!ok || !j.questions?.length) { setError(j.error ?? "We couldn't draft questions right now."); return; }
    setQs(j.questions);
  };
  const send = async () => {
    setBusy("send"); setError(null);
    const { ok, j } = await call({ action: "send", jobId, providerPersonIds, questions: qs.filter((q) => q.text.trim()), dueAt: `${due}T23:00:00` });
    setBusy(null);
    if (!ok) { setError(j.error ?? "Couldn't send — try again."); return; }
    onSent?.(`Questions sent to ${j.sent ?? providerPersonIds.length}.`);
    router.refresh();
    onClose();
  };
  const n = providerPersonIds.length;
  const filled = qs.filter((q) => q.text.trim()).length;
  return (
    <div role="dialog" aria-label="Ask Questions" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose} data-ask-dialog>
      <div className="mt-10 w-full max-w-2xl rounded-[12px] bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-extrabold">Ask Questions</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[22px] leading-none text-state-inactive hover:text-ink">×</button>
        </div>
        {/* Scott 10-23: say who it goes to. */}
        {providerLabels.length > 0 && <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px]" data-ask-to><b>To:</b>{providerLabels.map((l) => <span key={l} className="rounded-full border border-state-border px-2 py-0.5 font-semibold">{l}</span>)}</p>}
        <p className="mt-1 text-[13px] text-state-inactive">Quick answers (Yes/No, Pick One, Number) often replace an interview. No names, companies or contact details.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" disabled={!!busy} onClick={draft} className={`${BTN_OUT} min-h-9`} data-draft-ai>{busy === "draft" ? "Drafting…" : "Draft With AI"}</button>
          {banks.length > 0 && (
            <select defaultValue="" onChange={(e) => { const b = banks.find((x) => x.id === e.target.value); if (b) setQs(b.questions); e.target.value = ""; }} aria-label="Load From Bank" className="min-h-9 rounded-[6px] border border-state-border bg-white px-2 text-[13px] font-semibold" data-load-bank>
              <option value="" disabled>Load From Bank…</option>
              {([["mine", "My Banks"], ["company", "Company Banks"], ["starter", "Panameer Starters"]] as const).map(([k, label]) => banks.some((b) => b.source === k) && <optgroup key={k} label={label}>{banks.filter((b) => b.source === k).map((b) => <option key={b.id} value={b.id}>{b.name} ({b.questions.length})</option>)}</optgroup>)}
            </select>
          )}
        </div>
        <div className="mt-3"><QuestionEditor questions={qs} onChange={setQs} /></div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-state-border pt-3 text-[13px]" data-save-bank>
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" aria-label="Bank name" className="min-h-9 rounded-[6px] border border-state-border px-2" />
          <label className="flex items-center gap-1"><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />Share With My Company</label>
          <button type="button" disabled={!bankName.trim() || !filled} onClick={saveBank} className={`${BTN_OUT} min-h-9 disabled:opacity-40`}>Save as Bank</button>
          {saved && <span className="text-state-accepted">{saved}</span>}
        </div>
        <label className={`${LABEL} mt-4 block`}>Answer By<input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${FIELD} max-w-[200px]`} /></label>
        {error && <p role="alert" className="mt-3 text-[13px] font-semibold text-state-declined">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={BTN_OUT}>Cancel</button>
          <button type="button" disabled={!!busy || !filled} onClick={send} className={`${BTN} disabled:opacity-40`} data-send-questions>{busy === "send" ? "Sending…" : (providerLabels.length === 1 ? `Send to ${providerLabels[0]}` : `Send to ${n} Providers`)}</button>
        </div>
      </div>
    </div>
  );
}
