"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Q = { id: string; question: string; options: string[] };
type R = { id: string; question: string; options: string[]; chosen: number | null; correctIndex: number; right: boolean; explanation: string | null };

const BTN_K = "inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40";
const BTN = "inline-flex min-h-11 items-center border border-ink px-5 text-[14px] font-semibold hover:bg-surface-hover disabled:opacity-40";

// L-E042: admin preview of a draft test — answer it, see the score and every right answer, flag questions, publish. No certificate.
export function TestPreview({ pathId, pathSlug }: { pathId: string; pathSlug: string }) {
  const router = useRouter();
  const [qs, setQs] = useState<Q[] | null>(null);
  const [status, setStatus] = useState("DRAFT");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ score: number; correct: number; total: number; threshold: number; results: R[] } | null>(null);
  const [flag, setFlag] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const url = `/api/admin/learn/paths/${pathId}/preview`;
  useEffect(() => {
    fetch(url).then((r) => r.json()).then((j) => { setQs(j.questions ?? []); setStatus(j.status ?? "DRAFT"); }).catch(() => setMsg("Could not load the test."));
  }, [url]);
  const post = async (body: object) => {
    setBusy(true);
    setMsg(null);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) setMsg(j.error ?? "That didn't work.");
    return r.ok ? j : null;
  };
  if (!qs) return <p className="mt-6 text-[14px] text-ink-2">{msg ?? "Loading…"}</p>;
  return (
    <div data-test-preview className="mt-6">
      <p className="border-l-2 border-magenta pl-3 text-[13.5px] text-ink-2">Preview · {status === "PUBLISHED" ? "Published" : "Draft"} — this attempt isn&apos;t counted and issues no certificate. You&apos;ll see every right answer after you submit.</p>
      {!result ? (
        <>
          <ol className="mt-5 grid gap-5">
            {qs.map((q, i) => (
              <li key={q.id}>
                <p className="text-[15px] font-bold">{i + 1}. {q.question}</p>
                <div className="mt-2 grid gap-1.5">
                  {q.options.map((o, k) => (
                    <label key={k} className="flex items-start gap-2 text-[14px]"><input type="radio" name={q.id} checked={answers[q.id] === k} onChange={() => setAnswers({ ...answers, [q.id]: k })} className="mt-1" /> {o}</label>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <button type="button" disabled={busy} onClick={async () => { const j = await post({ action: "grade", answers }); if (j) setResult(j); }} className={`${BTN_K} mt-6`}>Submit Preview</button>
        </>
      ) : (
        <>
          <p className="mt-5 text-[22px] font-bold">{result.score}% <span className="text-[14px] font-normal text-ink-2">· {result.correct} of {result.total} right · {result.threshold}% to pass</span></p>
          <ol className="mt-4 grid gap-4">
            {result.results.map((r, i) => (
              <li key={r.id} data-preview-question={r.right ? "right" : "wrong"} className="border-b border-line pb-3">
                <p className="text-[14.5px] font-bold">{i + 1}. {r.question}</p>
                <ul className="mt-1.5 grid gap-1 text-[13.5px]">
                  {r.options.map((o, k) => (
                    <li key={k} className={k === r.correctIndex ? "font-bold" : k === r.chosen ? "text-magenta-dark line-through" : "text-ink-2"}>{k === r.correctIndex ? "✓ " : k === r.chosen ? "✕ " : "· "}{o}</li>
                  ))}
                </ul>
                {r.explanation && <p className="mt-1 text-[12.5px] text-ink-3">{r.explanation}</p>}
                {flagged.has(r.id) ? (
                  <p className="mt-1.5 text-[12.5px] font-semibold">Flagged ✓</p>
                ) : (
                  <div className="mt-1.5 flex gap-2">
                    <input value={flag[r.id] ?? ""} onChange={(e) => setFlag({ ...flag, [r.id]: e.target.value })} placeholder="What's wrong with this question?" aria-label="Flag note" className="h-9 min-w-0 flex-1 border border-line px-2.5 text-[13px]" />
                    <button type="button" disabled={busy || (flag[r.id] ?? "").trim().length < 2} onClick={async () => { if (await post({ action: "flag", questionId: r.id, note: flag[r.id] })) setFlagged(new Set(flagged).add(r.id)); }} className="border border-ink px-3 text-[12.5px] font-semibold disabled:opacity-40">Flag Question</button>
                  </div>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            {status !== "PUBLISHED" && <button type="button" disabled={busy} onClick={async () => { const j = await post({ action: "publish" }); if (j) { setStatus("PUBLISHED"); setMsg(`Published — ${j.told ?? 0} members told it's open.`); router.refresh(); } }} data-publish-test className={BTN_K}>Publish Test</button>}
            <button type="button" onClick={() => { setResult(null); setAnswers({}); }} className={BTN}>Take Again</button>
            <a href={`/learn/${pathSlug}`} className={BTN}>Back to the Path</a>
          </div>
        </>
      )}
      {msg && <p role="status" className="mt-3 text-[13.5px] font-semibold">{msg}</p>}
    </div>
  );
}
