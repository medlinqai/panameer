"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/learn/ProgressBar";

type Question = { id: string; question: string; options: string[]; courseTitle: string };

type State = {
  questions: Question[];
  threshold: number;
  maxAttempts: number;
  attemptsUsed: number;
  best: number;
  passed: boolean;
};

type Result = {
  score: number;
  passed: boolean;
  threshold: number;
  correct: number;
  total: number;
  attemptsUsed: number;
  attemptsAllowed: number;
  review: {
    id: string;
    question: string;
    options: string[];
    chosen: number | null;
    correctIndex: number;
    correct: boolean;
    explanation: string;
  }[];
  credential: { id: string; url: string } | null;
};

/**
 * The path test (WS5).
 *
 * One question per screen rather than a scrolling wall. The set is 5–20
 * questions and a learner has just finished a course, so the job is to keep
 * them moving; a long form invites skimming and abandonment, and the progress
 * dots make the length honest up front.
 *
 * The review after submitting is the point as much as the score. Every question
 * comes back with what they chose, what was right, and WHY — a test that only
 * returns a number teaches nothing, and this one is generated from the course
 * material, so the explanation is the last piece of teaching in the path.
 */
export function TestRunner({
  pathId,
  pathSlug,
  pathTitle,
}: {
  pathId: string;
  pathSlug: string;
  pathTitle: string;
}) {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [at, setAt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/learn/test/${pathId}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!live) return;
        if (!r.ok) setError(body.error ?? "Could not load the test.");
        else setState(body);
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [pathId]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/learn/test/${pathId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not submit that.");
        return;
      }
      setResult(body);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-[15px] text-ink-2">Preparing your test…</p>;

  if (error && !state) {
    return (
      <div className="rounded-brand border border-amber-500/30 bg-amber-500/5 p-6">
        <p className="text-[15px] font-bold">The test isn&apos;t ready.</p>
        <p className="mt-1 text-[14.5px] text-ink-2">{error}</p>
        <Link
          href={`/learn/${pathSlug}`}
          className="mt-3 inline-block text-[14px] font-bold text-magenta hover:underline"
        >
          ← Back to {pathTitle}
        </Link>
      </div>
    );
  }
  if (!state) return null;

  if (result) return <ResultPanel result={result} pathSlug={pathSlug} pathTitle={pathTitle} />;

  const q = state.questions[at];
  const answered = Object.keys(answers).length;
  const last = at === state.questions.length - 1;

  return (
    <div>
      <div className="mb-6">
        <ProgressBar
          percent={(answered / state.questions.length) * 100}
          label={`${answered} of ${state.questions.length} answered · ${state.threshold}% to pass`}
        />
      </div>

      <div className="rounded-brand border border-line p-6">
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-ink-2">
          Question {at + 1} of {state.questions.length}
          {q.courseTitle && ` · ${q.courseTitle}`}
        </p>
        <h2 className="mt-2 text-[19px] font-bold leading-snug">{q.question}</h2>

        <div className="mt-5 space-y-2">
          {q.options.map((opt, i) => {
            const chosen = answers[q.id] === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                className={
                  "flex w-full items-start gap-3 rounded-[12px] border-[1.5px] px-4 py-3 text-left text-[15px] transition-colors " +
                  (chosen
                    ? "border-magenta bg-magenta/[0.06] font-semibold"
                    : "border-line hover:border-magenta/50")
                }
              >
                <span
                  className={
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[11px] font-bold " +
                    (chosen ? "border-magenta bg-magenta text-white" : "border-line text-ink-2")
                  }
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={at === 0}
          onClick={() => setAt((n) => n - 1)}
          className="rounded-full border-[1.5px] border-line px-6 py-2.5 text-[14px] font-bold transition-colors hover:border-magenta hover:text-magenta disabled:opacity-40"
        >
          Previous
        </button>

        <span className="flex flex-wrap gap-1.5">
          {state.questions.map((qq, i) => (
            <button
              key={qq.id}
              type="button"
              onClick={() => setAt(i)}
              aria-label={`Question ${i + 1}`}
              className={
                "h-2.5 w-2.5 rounded-full transition-colors " +
                (i === at
                  ? "bg-magenta"
                  : answers[qq.id] !== undefined
                    ? "bg-magenta/40"
                    : "bg-line")
              }
            />
          ))}
        </span>

        {last ? (
          <button
            type="button"
            onClick={submit}
            disabled={busy || answered < state.questions.length}
            title={
              answered < state.questions.length
                ? "Answer every question before submitting."
                : undefined
            }
            className="rounded-full bg-magenta px-6 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-40"
          >
            {busy ? "Marking…" : "Submit Test"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setAt((n) => n + 1)}
            className="rounded-full bg-magenta px-6 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Next
          </button>
        )}
      </div>

      {error && <p className="mt-4 text-[14px] text-red-700">{error}</p>}
    </div>
  );
}

function ResultPanel({
  result,
  pathSlug,
  pathTitle,
}: {
  result: Result;
  pathSlug: string;
  pathTitle: string;
}) {
  const verifyUrl = result.credential
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${result.credential.url}`
    : null;

  return (
    <div>
      <div
        className={
          "rounded-brand border-2 p-7 text-center " +
          (result.passed
            ? "border-emerald-500/40 bg-emerald-500/[0.06]"
            : "border-amber-500/40 bg-amber-500/[0.06]")
        }
      >
        <p className="font-display text-[42px] font-bold leading-none">{result.score}%</p>
        <p className="mt-2 text-[18px] font-bold">
          {result.passed ? "Passed — nice work." : "Not quite this time."}
        </p>
        <p className="mt-1 text-[14.5px] text-ink-2">
          {result.correct} of {result.total} correct · {result.threshold}% needed
          {!result.passed &&
            ` · attempt ${result.attemptsUsed} of ${result.attemptsAllowed}`}
        </p>

        {result.passed && result.credential && (
          <div className="mx-auto mt-5 max-w-md rounded-brand border border-line bg-white p-5 text-left">
            <p className="text-[15px] font-bold">Your certificate is issued.</p>
            <p className="mt-1 text-[14px] text-ink-2">
              It&apos;s on your profile under Certifications, and anyone can check it
              here:
            </p>
            <Link
              href={result.credential.url}
              className="mt-2 block break-all font-mono text-[13px] font-bold text-magenta hover:underline"
            >
              {verifyUrl ?? result.credential.url}
            </Link>
            <p className="mt-3 text-[13px] text-ink-2">
              Paste that link into LinkedIn&apos;s &ldquo;Add licence or
              certification&rdquo; as the credential URL.
            </p>
          </div>
        )}

        {result.passed && !result.credential && (
          <p className="mx-auto mt-5 max-w-md rounded-[10px] bg-white px-4 py-3 text-[14px] text-ink-2">
            You passed, and the attempt is on your record. Certificates hang off a
            provider profile — set one up and this becomes a credential you can share.
          </p>
        )}

        {!result.passed && result.attemptsUsed < result.attemptsAllowed && (
          <p className="mt-4 text-[14px] text-ink-2">
            Look through the answers below, then have another go.
          </p>
        )}
      </div>

      <h2 className="mt-8 text-[19px] font-bold">Your answers</h2>
      <div className="mt-3 space-y-3">
        {result.review.map((r, i) => (
          <div
            key={r.id}
            className={
              "rounded-brand border p-5 " +
              (r.correct ? "border-emerald-500/30" : "border-red-500/30 bg-red-500/[0.03]")
            }
          >
            <p className="text-[12.5px] font-bold uppercase tracking-wide text-ink-2">
              Question {i + 1} · {r.correct ? "Correct" : "Missed"}
            </p>
            <p className="mt-1 text-[15.5px] font-semibold">{r.question}</p>
            <ul className="mt-3 space-y-1.5 text-[14.5px]">
              {r.options.map((opt, oi) => {
                const isRight = oi === r.correctIndex;
                const isMine = oi === r.chosen;
                return (
                  <li
                    key={oi}
                    className={
                      "rounded-[8px] px-3 py-1.5 " +
                      (isRight
                        ? "bg-emerald-500/10 font-semibold text-emerald-800"
                        : isMine
                          ? "bg-red-500/10 text-red-800"
                          : "text-ink-2")
                    }
                  >
                    {isRight && "✓ "}
                    {isMine && !isRight && "✗ "}
                    {opt}
                    {isMine && <span className="ml-2 text-[12.5px]">(your answer)</span>}
                  </li>
                );
              })}
            </ul>
            {r.explanation && (
              <p className="mt-3 text-[14px] text-ink-2">{r.explanation}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
        <Link
          href={`/learn/${pathSlug}`}
          className="rounded-full border-[1.5px] border-line px-6 py-2.5 text-[14.5px] font-bold transition-colors hover:border-magenta hover:text-magenta"
        >
          Back to {pathTitle}
        </Link>
        {!result.passed && result.attemptsUsed < result.attemptsAllowed && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-magenta px-6 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
