"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT } from "@/components/hire/HireUI";
import { INTERVIEW_GUIDELINES } from "@/lib/interview-guidelines";
import type { ProviderQuestions } from "@/lib/job-questions";

// AQ-E003: the buyer's written questions — a box per question (1,000 characters), Save Draft, Send Answers.
const FIELD = "mt-1 block w-full rounded-[8px] border border-line bg-white px-3 py-2 text-[14px]";

export function AnswerQuestions({ set }: { set: ProviderQuestions }) {
  const router = useRouter();
  const [answers, setAnswers] = useState(set.questions.map((_, i) => set.answers[i] ?? ""));
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const post = async (action: "save" | "sendAnswers") => {
    setBusy(action); setError(null); setMsg(null);
    const r = await fetch("/api/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, answerId: set.answerId, answers }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!r?.ok) { setError(j.error ?? "Couldn't save — try again."); return; }
    if (action === "save") setMsg("Draft saved.");
    router.refresh();
  };
  const due = set.dueAt ? new Date(set.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
  if (set.submittedAt) {
    return (
      <section className="rounded-brand border border-line bg-white p-5" data-questions-sent>
        <h3 className="text-[16px] font-extrabold">Your Answers · Sent</h3>
        <ol className="mt-2 flex flex-col gap-2 text-[14px]">{set.questions.map((q, i) => <li key={i}><b>{q}</b><p className="whitespace-pre-wrap text-ink-2">{set.answers[i]}</p></li>)}</ol>
      </section>
    );
  }
  return (
    <section id="questions" className="rounded-brand border border-line bg-white p-5" data-answer-questions>
      <h3 className="text-[16px] font-extrabold">The Buyer Has {set.questions.length} Question{set.questions.length === 1 ? "" : "s"}</h3>
      {due && <p className="mt-0.5 text-[13px] text-ink-2">Answer by {due}</p>}
      <ol className="mt-3 flex flex-col gap-3">
        {set.questions.map((q, i) => (
          <li key={i}>
            <label className="block text-[14px] font-semibold">{i + 1}. {q}
              <textarea value={answers[i]} rows={3} maxLength={1000} onChange={(e) => setAnswers((a) => a.map((x, k) => (k === i ? e.target.value : x)))} className={FIELD} />
            </label>
            <span className="text-[11.5px] text-ink-3">{answers[i].length}/1,000</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={!!busy || answers.some((a) => !a.trim())} onClick={() => post("sendAnswers")} className={`${BTN} disabled:opacity-40`} data-send-answers>{busy === "sendAnswers" ? "Sending…" : "Send Answers"}</button>
        <button type="button" disabled={!!busy} onClick={() => post("save")} className={BTN_OUT}>Save Draft</button>
        {msg && <span className="text-[13px] text-state-inactive">{msg}</span>}
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-state-declined">{error}</p>}
      <p className="mt-3 text-[11.5px] leading-snug text-ink-3"><b>Interview guidelines:</b> {INTERVIEW_GUIDELINES}</p>
    </section>
  );
}
