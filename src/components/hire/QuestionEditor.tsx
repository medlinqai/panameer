"use client";

import { MAX_QUESTIONS, QTYPE_LABEL, QTYPES, hasOptions, normalizeQuestion, type QType, type Question } from "@/lib/question-types";

// QB-E001/E005: edit typed questions — a type per question, options for Pick types, optional points and knockouts.
const FIELD = "block w-full rounded-[8px] border border-state-border bg-white px-3 py-2 text-[14px]";
const SMALL = "rounded-[6px] border border-state-border bg-white px-2 py-1 text-[13px]";
export const blankQuestion = (type: QType = "YES_NO"): Question => normalizeQuestion({ text: "", type });

export function QuestionEditor({ questions, onChange }: { questions: Question[]; onChange: (qs: Question[]) => void }) {
  const set = (i: number, q: Question) => onChange(questions.map((x, k) => (k === i ? q : x)));
  return (
    <div data-question-editor>
      <ol className="flex flex-col gap-3">
        {questions.map((q, i) => (
          <li key={i} className="rounded-[10px] border border-state-border p-3" data-question={q.type}>
            <div className="flex items-start gap-2">
              <span className="mt-2 w-5 text-[13px] font-bold text-state-inactive">{i + 1}</span>
              <textarea value={q.text} rows={2} maxLength={500} onChange={(e) => set(i, { ...q, text: e.target.value })} className={FIELD} aria-label={`Question ${i + 1}`} placeholder="Ask something quick to answer" />
              <button type="button" onClick={() => onChange(questions.filter((_, k) => k !== i))} aria-label={`Remove question ${i + 1}`} className="mt-1.5 text-[18px] text-state-inactive hover:text-ink">×</button>
            </div>
            <div className="ml-7 mt-2 flex flex-wrap items-center gap-2 text-[13px]">
              <select value={q.type} onChange={(e) => { const t = e.target.value as QType; set(i, normalizeQuestion({ text: q.text, type: t, options: hasOptions(t) && t !== "YES_NO" ? q.options : undefined })); }} className={SMALL} aria-label="Answer type">
                {QTYPES.map((t) => <option key={t} value={t}>{QTYPE_LABEL[t]}</option>)}
              </select>
              {q.type === "SCALE" && <label className="flex items-center gap-1">Points <input inputMode="numeric" value={q.points ?? ""} onChange={(e) => set(i, { ...q, points: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} className={`${SMALL} w-14`} /></label>}
            </div>
            {hasOptions(q.type) && (
              <ul className="ml-7 mt-2 flex flex-col gap-1.5" data-options>
                {(q.options ?? []).map((o, k) => (
                  <li key={k} className="flex flex-wrap items-center gap-2 text-[13px]">
                    <input value={o.label} disabled={q.type === "YES_NO"} onChange={(e) => set(i, { ...q, options: q.options!.map((x, j) => (j === k ? { ...x, label: e.target.value } : x)) })} className={`${SMALL} min-w-0 flex-1`} aria-label={`Option ${k + 1}`} />
                    <label className="flex items-center gap-1">Points <input inputMode="numeric" value={o.points ?? ""} onChange={(e) => set(i, { ...q, options: q.options!.map((x, j) => (j === k ? { ...x, points: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null } : x)) })} className={`${SMALL} w-12`} /></label>
                    <label className="flex items-center gap-1" title="Picking this option knocks the provider out (you still decide)"><input type="checkbox" checked={!!o.knockout} onChange={(e) => set(i, { ...q, options: q.options!.map((x, j) => (j === k ? { ...x, knockout: e.target.checked } : x)) })} />Knockout</label>
                    {q.type !== "YES_NO" && <button type="button" onClick={() => set(i, { ...q, options: q.options!.filter((_, j) => j !== k) })} aria-label="Remove option" className="text-state-inactive hover:text-ink">×</button>}
                  </li>
                ))}
                {q.type !== "YES_NO" && <li><button type="button" onClick={() => set(i, { ...q, options: [...(q.options ?? []), { label: "" }] })} className="text-[13px] font-semibold">+ Add an Option</button></li>}
              </ul>
            )}
          </li>
        ))}
      </ol>
      {questions.length < MAX_QUESTIONS && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
          <button type="button" onClick={() => onChange([...questions, blankQuestion()])} className="font-semibold">+ Add a Question</button>
          <span className="text-state-inactive">· 3–5 quick ones get answered</span>
        </div>
      )}
    </div>
  );
}
