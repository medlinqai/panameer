"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT } from "@/components/hire/HireUI";
import { INTERVIEW_GUIDELINES } from "@/lib/interview-guidelines";
import { answerText, isAnswered, textLimit, type Answer, type Question } from "@/lib/question-types";
import type { ProviderQuestions } from "@/lib/job-questions";

// AQ-E003 / QB-E001: the buyer's questions — quick inputs by type (Yes/No, Pick, Scale, Number), text boxes only where asked.
const FIELD = "mt-1 block w-full rounded-[8px] border border-line bg-white px-3 py-2 text-[14px]";
const CHIP = "rounded-full border px-3 py-1 text-[13px] font-semibold";

function Input({ q, a, onChange }: { q: Question; a: Answer; onChange: (v: Answer["value"]) => void }) {
  if (q.type === "YES_NO" || q.type === "PICK_ONE") return (
    <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup">
      {(q.options ?? []).map((o) => <button key={o.label} type="button" role="radio" aria-checked={a.value === o.label} onClick={() => onChange(o.label)} className={a.value === o.label ? `${CHIP} border-magenta text-magenta-dark` : `${CHIP} border-line`}>{o.label}</button>)}
    </div>
  );
  if (q.type === "PICK_SEVERAL") { const v = Array.isArray(a.value) ? a.value : []; return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {(q.options ?? []).map((o) => { const on = v.includes(o.label); return <button key={o.label} type="button" aria-pressed={on} onClick={() => onChange(on ? v.filter((x) => x !== o.label) : [...v, o.label])} className={on ? `${CHIP} border-magenta text-magenta-dark` : `${CHIP} border-line`}>{o.label}</button>; })}
    </div>
  ); }
  if (q.type === "SCALE") return (
    <div className="mt-1.5 flex gap-2" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={a.value === n} onClick={() => onChange(n)} className={a.value === n ? `${CHIP} w-10 border-magenta text-magenta-dark` : `${CHIP} w-10 border-line`}>{n}</button>)}
    </div>
  );
  if (q.type === "NUMBER") return <input inputMode="decimal" value={a.value == null ? "" : String(a.value)} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))} className={`${FIELD} max-w-[140px]`} />;
  const max = textLimit(q.type), v = typeof a.value === "string" ? a.value : "";
  return <><textarea value={v} rows={q.type === "SHORT_TEXT" ? 2 : 4} maxLength={max} onChange={(e) => onChange(e.target.value)} className={FIELD} /><span className="text-[11.5px] text-ink-3">{v.length}/{max.toLocaleString()}</span></>;
}

export function AnswerQuestions({ set }: { set: ProviderQuestions }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answer[]>(set.answers);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const put = (i: number, value: Answer["value"]) => setAnswers((as) => as.map((a, k) => (k === i ? { ...a, value, edited: a.prefilled ? true : a.edited } : a)));
  const post = async (action: "save" | "sendAnswers") => {
    setBusy(action); setError(null); setMsg(null);
    const r = await fetch("/api/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, answerId: set.answerId, answers }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!r?.ok) { setError(j.error ?? "Couldn't save — try again."); return; }
    if (action === "save") setMsg("Draft saved.");
    router.refresh();
  };
  const fill = async () => {
    setBusy("prefill"); setError(null); setMsg(null);
    const r = await fetch("/api/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "prefill", answerId: set.answerId }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string; answers?: Answer[] };
    setBusy(null);
    if (!r?.ok || !j.answers) { setError(j.error ?? "Couldn't fill from your profile — try again."); return; }
    setAnswers(j.answers);
    setMsg("Filled from your profile — check each answer, then Send.");
  };
  const due = set.dueAt ? new Date(set.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
  if (set.submittedAt) {
    return (
      <section className="rounded-brand border border-line bg-white p-5" data-questions-sent>
        <h3 className="text-[16px] font-extrabold">Your Answers · Sent</h3>
        <ol className="mt-2 flex flex-col gap-2 text-[14px]">{set.questions.map((q, i) => <li key={i}><b>{q.text}</b><p className="whitespace-pre-wrap text-ink-2">{answerText(set.answers[i] ?? { value: null })}</p></li>)}</ol>
      </section>
    );
  }
  const done = set.questions.every((q, i) => isAnswered(q, answers[i] ?? { value: null }));
  return (
    <section id="questions" className="rounded-brand border border-line bg-white p-5" data-answer-questions>
      <h3 className="text-[16px] font-extrabold">The Buyer Has {set.questions.length} Question{set.questions.length === 1 ? "" : "s"}</h3>
      {due && <p className="mt-0.5 text-[13px] text-ink-2">Answer by {due}</p>}
      {/* QB-E003: AI drafts every answer from the provider's profile; they review and Send. */}
      <button type="button" disabled={!!busy} onClick={fill} className={`${BTN_OUT} mt-3 min-h-9`} data-fill-from-profile>{busy === "prefill" ? "Filling…" : "Fill From My Profile"}</button>
      <ol className="mt-3 flex flex-col gap-4">
        {set.questions.map((q, i) => (
          <li key={i}>
            <p className="text-[14px] font-semibold">{i + 1}. {q.text}{answers[i]?.prefilled && <span className="ml-2 rounded-full bg-state-inactive-bg px-2 py-0.5 text-[11px] font-bold text-state-inactive">{answers[i].edited ? "Edited" : "From Profile"}</span>}</p>
            <Input q={q} a={answers[i] ?? { value: null }} onChange={(v) => put(i, v)} />
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={!!busy || !done} onClick={() => post("sendAnswers")} className={`${BTN} disabled:opacity-40`} data-send-answers>{busy === "sendAnswers" ? "Sending…" : "Send Answers"}</button>
        <button type="button" disabled={!!busy} onClick={() => post("save")} className={BTN_OUT}>Save Draft</button>
        {msg && <span className="text-[13px] text-state-inactive">{msg}</span>}
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-state-declined">{error}</p>}
      <p className="mt-3 text-[11.5px] leading-snug text-ink-3"><b>Interview guidelines:</b> {INTERVIEW_GUIDELINES}</p>
    </section>
  );
}
