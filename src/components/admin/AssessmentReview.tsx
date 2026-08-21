"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ── ⚠ READ · DROP · PUBLISH. NOT AN EDITOR (P1-J3-E020, WS1) ─────────────────
 *
 * Scott will not hand-build question banks, so this screen deliberately offers no
 * way to author: no rich text, no "add a question", no editing a stem or an option.
 * The only destructive act is dropping a whole question, and the remedy for a bad
 * set is REGENERATE — which lives on this screen too, and is the one button that
 * throws the reviewer's work away, so it is styled and worded as such.
 *
 * ⚠ THE DROP IS STAGED, NOT IMMEDIATE. A reviewer reads twenty questions and forms
 * a view; making each checkbox a write would mean twenty requests, twenty chances
 * to fall below the floor mid-read, and no way to change their mind. Selections
 * accumulate and one "Drop N" commits them.
 *
 * ⚠ AND THE FLOOR IS ENFORCED IN THE UI **AND** ON THE SERVER. `dropQuestions` and
 * `publishAssessment` both check it, because they are separate requests and a
 * regenerate can shrink a set between them. The UI check exists to tell the
 * reviewer BEFORE they click, which is the half a 409 cannot do.
 */

type Q = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  lessonTitle: string | null;
  courseTitle: string | null;
  /** ⚠ Whether the lesson this question tests has a description at all. */
  described: boolean;
  sourceKind: string;
};

export function AssessmentReview({
  pathId,
  pathTitle,
  pathSlug,
  status,
  model,
  generatedAt,
  sourceNote,
  reviewedBy,
  reviewedAt,
  threshold,
  minQuestions,
  lessonTotal,
  lessonDescribed,
  questions,
}: {
  pathId: string;
  pathTitle: string;
  pathSlug: string;
  status: string | null;
  model: string | null;
  generatedAt: string | null;
  sourceNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  threshold: number;
  minQuestions: number;
  lessonTotal: number;
  lessonDescribed: number;
  questions: Q[];
}) {
  const router = useRouter();
  const [drop, setDrop] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = questions.length - drop.size;
  const belowFloor = remaining < minQuestions;
  const published = status === "PUBLISHED";

  /* ⚠ THE HONEST QUALITY SIGNAL, and it is the number to read first. A question
     whose lesson has no description was written from a TITLE. */
  const titleOnly = questions.filter((q) => !q.described).length;

  async function act(action: "publish" | "unpublish" | "drop" | "regenerate") {
    setBusy(action);
    setError(null);
    try {
      const r =
        action === "regenerate"
          ? await fetch(`/api/admin/learn/paths/${pathId}/assessment`, { method: "POST" })
          : await fetch(`/api/admin/learn/paths/${pathId}/assessment`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action, dropIds: [...drop] }),
            });
      const body = await r.json().catch(() => null);
      if (!r.ok) {
        setError(body?.error ?? "That didn't work.");
        return;
      }
      setDrop(new Set());
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (questions.length === 0) {
    return (
      <div className="mt-4 rounded-[14px] border border-line bg-white p-6">
        <h1 className="text-[22px] font-bold text-ink">{pathTitle}</h1>
        <p className="mt-2 text-[14px] text-ink-2">
          No question set has been generated for this path yet.
        </p>
        {/*
          ⚠ NO "GENERATE" BUTTON WHEN THERE IS NOTHING. Generation is a deliberate
          act with a model call behind it and it belongs in the batch script, where
          the operator can see the per-path source quality before spending it. The
          admin trigger exists for REgenerating a set somebody has read and rejected.
        */}
        <p className="mt-4 rounded-[10px] bg-bg-soft p-3 text-[13px] text-ink-2">
          Generate it with{" "}
          <code className="rounded bg-white px-1.5 py-0.5">
            npm run learn:assessments -- --path={pathSlug} --apply
          </code>
          , then come back here to read it.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-[14px] border border-line bg-white p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold text-ink">{pathTitle}</h1>
            <p className="mt-1 text-[13px] text-ink-2">
              {questions.length} question{questions.length === 1 ? "" : "s"} · pass mark{" "}
              {threshold}% · {model ?? "unknown model"}
              {generatedAt ? ` · generated ${generatedAt.slice(0, 10)}` : ""}
            </p>
          </div>
          <span
            className={
              "ml-auto rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] " +
              (published ? "bg-[#eaf7f1] text-[#137a51]" : "bg-[#fff4e0] text-[#8a5a00]")
            }
          >
            {status ?? "—"}
          </span>
        </div>

        {/*
          ── ⚠ THE RATIO A REVIEWER SHOULD READ BEFORE A SINGLE QUESTION ─────────

          `P1-J3-E006`: with no lesson description the model writes from the title
          and produces twenty plausible, confidently-wrong questions. They READ
          FINE, which is why this is stated as a number at the top rather than left
          for the reviewer to notice question by question.
        */}
        <div className="mt-4 grid gap-3 min-[720px]:grid-cols-2">
          <div className="rounded-[10px] bg-bg-soft p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">
              Questions from a described lesson
            </p>
            <p className="mt-1 text-[15px] font-bold text-ink">
              {questions.length - titleOnly} of {questions.length}
              {titleOnly > 0 && (
                <span className="ml-2 text-[13px] font-semibold text-magenta">
                  {titleOnly} written from a title only
                </span>
              )}
            </p>
          </div>
          <div className="rounded-[10px] bg-bg-soft p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">
              Lessons in this path with a description
            </p>
            <p className="mt-1 text-[15px] font-bold text-ink">
              {lessonDescribed} of {lessonTotal}
            </p>
          </div>
        </div>

        {titleOnly > 0 && (
          <p className="mt-3 rounded-[10px] border border-magenta/40 bg-magenta/5 p-3 text-[13px] leading-[1.55] text-ink-2">
            <b className="text-ink">Read the title-only questions hardest.</b> With no
            lesson description the model had only the lesson&rsquo;s name to work from, so
            these are the ones most likely to be well-formed and wrong. Certifying
            someone against those is worse than certifying nobody.
          </p>
        )}

        {sourceNote && (
          <p className="mt-3 break-words text-[12px] text-ink-2">
            <span className="font-bold uppercase tracking-[0.08em]">Sources</span>{" "}
            {sourceNote}
          </p>
        )}
        {reviewedBy && (
          <p className="mt-2 text-[12px] text-ink-2">
            Reviewed by <b className="text-ink">{reviewedBy}</b>
            {reviewedAt ? ` on ${reviewedAt.slice(0, 10)}` : ""}
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-[10px] border border-magenta bg-magenta/5 p-3 text-[13px] font-semibold text-magenta-dark">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {drop.size > 0 && (
            <button
              type="button"
              disabled={busy !== null || belowFloor}
              onClick={() => act("drop")}
              className="rounded-[10px] border-[1.5px] border-magenta px-4 py-2 text-[14px] font-bold text-magenta-dark disabled:opacity-40"
            >
              Drop {drop.size}
            </button>
          )}
          {published ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => act("unpublish")}
              className="rounded-[10px] border border-line px-4 py-2 text-[14px] font-bold text-ink disabled:opacity-40"
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              disabled={busy !== null || belowFloor}
              onClick={() => act("publish")}
              className="rounded-[10px] bg-magenta px-5 py-2 text-[14px] font-bold text-white disabled:opacity-40"
            >
              Publish
            </button>
          )}
          {/*
            ⚠ THE ONLY DESTRUCTIVE ACTION, AND IT IS LAST AND QUIET. Regenerating
            replaces every question — including any the reviewer has just decided to
            keep — and leaves past attempts standing. It is the remedy for a bad set,
            not a refresh.
          */}
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => act("regenerate")}
            className="ml-auto text-[13px] font-bold text-ink-2 underline underline-offset-4 disabled:opacity-40"
          >
            {busy === "regenerate" ? "Regenerating…" : "Regenerate (replaces all questions)"}
          </button>
        </div>

        {belowFloor && (
          <p className="mt-3 text-[13px] font-semibold text-magenta">
            {/*
              ⚠ THE SCREEN SAYS SO AND REFUSES, rather than letting Publish fail with
              a 409 the reviewer has to interpret. The floor is the generator's own.
            */}
            That leaves {remaining} question{remaining === 1 ? "" : "s"}. A set needs at
            least {minQuestions} — regenerate it instead of publishing a short one.
          </p>
        )}
      </div>

      <ol className="m-0 list-none space-y-3 p-0">
        {questions.map((q, i) => {
          const marked = drop.has(q.id);
          return (
            <li
              key={q.id}
              className={
                "rounded-[14px] border bg-white p-5 " +
                (marked ? "border-magenta opacity-60" : "border-line")
              }
            >
              <div className="flex flex-wrap items-start gap-3">
                <span className="text-[13px] font-bold text-ink-2">{i + 1}.</span>
                <p className="min-w-0 flex-1 text-[15px] font-semibold leading-[1.45] text-ink">
                  {q.question}
                </p>
                <label className="flex flex-none items-center gap-2 text-[13px] font-semibold text-ink-2">
                  <input
                    type="checkbox"
                    checked={marked}
                    onChange={(e) =>
                      setDrop((d) => {
                        const next = new Set(d);
                        if (e.target.checked) next.add(q.id);
                        else next.delete(q.id);
                        return next;
                      })
                    }
                  />
                  Drop
                </label>
              </div>

              {/*
                ⚠ THE EXPECTED ANSWER IS MARKED, not hidden behind a reveal. The
                reason is already recorded in the API: you cannot judge whether a
                generated question is fair without seeing which answer it expects.
              */}
              <ul className="mt-3 list-none space-y-1.5 p-0">
                {q.options.map((o, oi) => (
                  <li
                    key={oi}
                    className={
                      "flex gap-2.5 rounded-[8px] px-3 py-2 text-[14px] " +
                      (oi === q.correctIndex
                        ? "bg-[#eaf7f1] font-semibold text-[#137a51]"
                        : "text-ink-2")
                    }
                  >
                    <span className="flex-none font-bold">
                      {oi === q.correctIndex ? "✓" : String.fromCharCode(65 + oi)}
                    </span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>

              {q.explanation && (
                <p className="mt-3 text-[13px] leading-[1.55] text-ink-2">{q.explanation}</p>
              )}

              <p className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[12px] text-ink-2">
                <span>
                  <span className="font-bold uppercase tracking-[0.08em]">Lesson</span>{" "}
                  {q.lessonTitle ?? (
                    /* ⚠ The catalog moved under a stored set — worth showing, not hiding. */
                    <span className="font-semibold text-magenta">unknown lesson</span>
                  )}
                  {q.courseTitle ? ` · ${q.courseTitle}` : ""}
                </span>
                {/*
                  ⚠ THE PER-QUESTION VERDICT ON ITS SOURCE. This is the column that
                  makes `P1-J3-E006` visible one question at a time.
                */}
                <span
                  className={
                    "ml-auto rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] " +
                    (q.described
                      ? "bg-[#eaf7f1] text-[#137a51]"
                      : "bg-magenta/10 text-magenta-dark")
                  }
                >
                  {q.described ? "Lesson described" : "Title only"}
                </span>
                {q.sourceKind === "LESSON_PLUS_DOCS" && (
                  <span className="rounded-full bg-[#fff4e0] px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#8a5a00]">
                    Used vendor docs
                  </span>
                )}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
