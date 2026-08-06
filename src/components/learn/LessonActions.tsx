"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The lesson foot: Back · Message the Instructor · Next Lesson, plus the
 * mark-complete control (WS3; design ref Learn-lesson-page-design.png).
 *
 * MESSAGE THE INSTRUCTOR IS STUBBED. The design gives it equal weight to Next
 * Lesson, but Messages is a Medlinq port still on the backlog — /messages
 * exists as a shell with nothing behind it. So the button renders in its
 * designed position, disabled, and SAYS why. A live-looking button that
 * silently does nothing is the worse failure: it costs the learner a click and
 * their trust, where this costs them neither and sets the expectation.
 */
export function LessonActions({
  lessonId,
  pathSlug,
  courseSlug,
  completed,
  next,
  instructorName,
}: {
  lessonId: string;
  pathSlug: string;
  courseSlug: string;
  completed: boolean;
  next: { id: string; title: string } | null;
  instructorName: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(completed);

  const mark = async (value: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/learn/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, completed: value }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Couldn't save that.");
        return;
      }
      setDone(value);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 border-t border-line pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/learn/${pathSlug}/course/${courseSlug}`}
          className="rounded-full border-[1.5px] border-line px-7 py-2.5 text-[14.5px] font-bold transition-colors hover:border-magenta hover:text-magenta"
        >
          Back
        </Link>

        <span className="flex flex-col items-center">
          <button
            type="button"
            disabled
            title="Messages isn't built yet — it's a Medlinq port on the backlog."
            /*
              E217 — A DISABLED GHOST, not a faded primary. This sat beside
              "Next Lesson" as a second solid magenta button at 35% — two
              primaries in one row, one of which does nothing. The live action
              on this row is Next Lesson; a control that is both unavailable AND
              the loudest thing next to it is the anti-pattern the button
              standard exists to stop.
            */
            className="cursor-not-allowed rounded-full border-[1.5px] border-line px-7 py-2.5 text-[14.5px] font-bold text-ink-2 opacity-60"
          >
            Message {instructorName ? "the Instructor" : "the Instructor"}
          </button>
          <span className="mt-1 text-[12px] text-ink-2">Coming soon</span>
        </span>

        {next ? (
          <Link
            href={`/learn/${pathSlug}/${next.id}`}
            className="rounded-full bg-magenta px-7 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Next Lesson
          </Link>
        ) : (
          <Link
            href={`/learn/${pathSlug}`}
            className="rounded-full bg-magenta px-7 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Finish Path
          </Link>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => mark(!done)}
          disabled={busy}
          className={
            "rounded-full px-5 py-2 text-[14px] font-bold transition-colors disabled:opacity-50 " +
            (done
              ? "border-[1.5px] border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/5"
              : "border-[1.5px] border-line text-ink hover:border-magenta hover:text-magenta")
          }
        >
          {busy ? "…" : done ? "✓ Completed — undo" : "Mark Complete"}
        </button>
        {error && <span className="text-[13px] text-red-700">{error}</span>}
      </div>
    </div>
  );
}
