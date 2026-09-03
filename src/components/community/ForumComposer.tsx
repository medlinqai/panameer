"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Start a thread, or reply to one (WS2-C).
 *
 * One component for both, because the difference is a title field and a verb —
 * two composers would be two places to fix the same posting bug.
 *
 * `router.refresh()` after a successful reply rather than optimistically
 * splicing the row in: the server component owns the query, and re-running it
 * is both less code and incapable of disagreeing with the database about what
 * was actually saved.
 */
/**
 * ⚠⚠ `identityGaps` MIRRORS THE WRITE GATE (`P1-ALL-E033`). Computed on the
 * server by the same function `lib/forums.ts` refuses with; empty means nothing
 * is missing. ⚠ IT IS NOT THE BOUNDARY — the route refuses regardless.
 */
export function ForumComposer({
  mode,
  boardSlug,
  threadId,
  identityGaps = [],
}: {
  mode: "thread" | "reply";
  boardSlug?: string;
  threadId?: string;
  identityGaps?: { key: string; field: string; reason: string; href: string }[];
}) {
  const blocked = identityGaps.length > 0;
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/community/forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "thread"
            ? { action: "thread", boardSlug, title, body }
            : { action: "reply", threadId, body }
        ),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "We couldn't post that.");
        return;
      }
      setTitle("");
      setBody("");
      if (mode === "thread" && data.id) {
        router.push(`/community/forums/thread/${data.id}`);
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-brand border border-line bg-white p-5">
      <h2 className="font-display text-[16px] font-bold">
        {mode === "thread" ? "Ask A Question" : "Reply"}
      </h2>
      {/* ⚠ CREDITS COPY PARKED 2026-09-03 (`P1-ALL-E375`) — the feature is commented
            out, so a live surface must not keep promising it. See `src/lib/credits.ts`.
          ⚠ THE WHOLE SENTENCE IS CREDITS COPY — both clauses are about earning,
          so nothing non-Credits was lost here. */}
      {/*
      {mode === "thread" && (
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
          Posting earns Community Credits once the ledger is switched on — and
          answering someone else&apos;s question earns more than asking.
        </p>
      )}
      */}

      {/*
        ── ⚠⚠ YOU POST AS A PERSON, NOT AN INBOX (`P1-ALL-E033`) ───────────────

        SCOTT: *"Anyone can give a BS email and verify it, no?"* — yes, and the
        answer is non-anonymity rather than vetting.

        ⚠⚠ THE COMPOSER IS DISABLED WITH THE REASON VISIBLE, NEVER HIDDEN. A
        missing composer reads as broken; a composer that says why reads as a
        next step. ⚠ AND NEVER `pointer-events: none` — that is the `E306` rule
        and it still stands even though its nav gate came out. The fields carry
        the `disabled` attribute, so a keyboard user reaches this explanation and
        every link in it by tabbing, which a pointer-events trap would deny them.

        ⚠ NOT STYLED AS AN ERROR. Nothing has gone wrong; three fields are not
        filled in. Red here would read as a fault and this is not one.
      */}
      {blocked && (
        <div className="mt-3 rounded-[10px] border border-line bg-bg-soft p-4">
          <p className="text-[14px] font-bold">
            Add a few details and you can post
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
            People answer people. Reading stays open either way — this is only
            about writing.
          </p>
          <ul className="mt-2.5 grid gap-2">
            {identityGaps.map((g) => (
              <li key={g.key} className="text-[13.5px] leading-relaxed">
                <Link href={g.href} className="font-bold text-magenta hover:underline">
                  {g.field}
                </Link>{" "}
                <span className="text-ink-2">— {g.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-[13.5px] text-red-700">
          {error}
        </p>
      )}

      {mode === "thread" && (
        <label className="mt-4 block">
          <span className="mb-1 block text-[13px] font-bold">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={blocked}
            maxLength={200}
            placeholder="What are you stuck on?"
            className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px] outline-none focus:border-magenta"
          />
        </label>
      )}

      <label className="mt-3 block">
        <span className="mb-1 block text-[13px] font-bold">
          {mode === "thread" ? "Details" : "Your reply"}
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={blocked}
          rows={mode === "thread" ? 6 : 4}
          maxLength={8000}
          placeholder={
            mode === "thread"
              ? "What have you tried, and what happened?"
              : "Answer, or add what you know…"
          }
          className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[14.5px] leading-relaxed outline-none focus:border-magenta"
        />
      </label>

      <button
        type="submit"
        disabled={
          blocked ||
          busy ||
          body.trim().length < 2 ||
          (mode === "thread" && title.trim().length < 5)
        }
        className="mt-4 rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
      >
        {busy ? "Posting…" : mode === "thread" ? "Post Question" : "Post Reply"}
      </button>
    </form>
  );
}
