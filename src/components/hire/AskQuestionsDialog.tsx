"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT, LABEL } from "@/components/hire/HireUI";

// AQ-E002: up to 5 written questions to one or many providers; Draft With AI fills 3–5 the buyer edits before sending.
const FIELD = "mt-1 block w-full rounded-[8px] border border-state-border bg-white px-3 py-2 text-[14px]";

export function AskQuestionsDialog({ jobId, providerPersonIds, defaultDue, onClose, onSent }: { jobId: string; providerPersonIds: string[]; defaultDue?: string | null; onClose: () => void; onSent?: (msg: string) => void }) {
  const router = useRouter();
  const [qs, setQs] = useState<string[]>(["", "", ""]);
  const [due, setDue] = useState((defaultDue ?? new Date(Date.now() + 48 * 3_600_000).toISOString()).slice(0, 10));
  const [busy, setBusy] = useState<"draft" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const call = async (body: object) => {
    const r = await fetch("/api/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string; questions?: string[]; sent?: number };
    return { ok: !!r?.ok, j };
  };
  const draft = async () => {
    setBusy("draft"); setError(null);
    const { ok, j } = await call({ action: "draft", jobId });
    setBusy(null);
    if (!ok || !j.questions?.length) { setError(j.error ?? "We couldn't draft questions right now."); return; }
    setQs(j.questions.slice(0, 5));
  };
  const send = async () => {
    setBusy("send"); setError(null);
    const { ok, j } = await call({ action: "send", jobId, providerPersonIds, questions: qs.filter((q) => q.trim()), dueAt: `${due}T23:00:00` });
    setBusy(null);
    if (!ok) { setError(j.error ?? "Couldn't send — try again."); return; }
    onSent?.(`Questions sent to ${j.sent ?? providerPersonIds.length}.`);
    router.refresh();
    onClose();
  };
  const n = providerPersonIds.length;
  const filled = qs.filter((q) => q.trim()).length;
  return (
    <div role="dialog" aria-label="Ask Questions" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose} data-ask-dialog>
      <div className="mt-10 w-full max-w-xl rounded-[12px] bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-extrabold">Ask Questions</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[22px] leading-none text-state-inactive hover:text-ink">×</button>
        </div>
        <p className="mt-1 text-[13px] text-state-inactive">Written answers often replace an interview. Up to 5 questions; no names, companies or contact details.</p>
        <button type="button" disabled={!!busy} onClick={draft} className={`${BTN_OUT} mt-3 min-h-9`} data-draft-ai>{busy === "draft" ? "Drafting…" : "Draft With AI"}</button>
        <ol className="mt-3 flex flex-col gap-2">
          {qs.map((q, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-2.5 w-5 text-[13px] font-bold text-state-inactive">{i + 1}</span>
              <textarea value={q} rows={2} maxLength={500} onChange={(e) => setQs((x) => x.map((y, k) => (k === i ? e.target.value : y)))} className={FIELD} aria-label={`Question ${i + 1}`} />
              <button type="button" onClick={() => setQs((x) => x.filter((_, k) => k !== i))} aria-label={`Remove question ${i + 1}`} className="mt-2 text-[18px] text-state-inactive hover:text-ink">×</button>
            </li>
          ))}
        </ol>
        {qs.length < 5 && <button type="button" onClick={() => setQs((x) => [...x, ""])} className="mt-2 text-[13px] font-semibold">+ Add a Question</button>}
        <label className={`${LABEL} mt-4 block`}>Answer By<input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${FIELD} max-w-[200px]`} /></label>
        {error && <p role="alert" className="mt-3 text-[13px] font-semibold text-state-declined">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={BTN_OUT}>Cancel</button>
          <button type="button" disabled={!!busy || !filled} onClick={send} className={`${BTN} disabled:opacity-40`} data-send-questions>{busy === "send" ? "Sending…" : `Send to ${n}`}</button>
        </div>
      </div>
    </div>
  );
}
