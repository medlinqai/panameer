import Link from "next/link";
import type { CommunitySignal } from "@/lib/community-signal";

/**
 * The Community block on a profile (brief_community_signal WS2).
 *
 * ── ⚠ IT RENDERS NOTHING WHEN THERE IS NOTHING ───────────────────────────────
 *
 * Same rule as `TaughtPaths`: a null signal produces no markup at all, not a row
 * of zeroes. A zero on a public profile is a claim about a person and it is the
 * wrong one — "0 replies" reads as disengaged where "no block" reads as "this
 * isn't part of how they show up here".
 *
 * ── THE ORDER IS THE ARGUMENT ────────────────────────────────────────────────
 *
 * Answers marked helpful LEADS, big. Replies and threads are context, small and
 * grey. A raw reply count promoted to the headline is a volume signal, and a
 * badge that rewards posting is a badge that produces posting.
 *
 * ⚠ NO RANK, NO PERCENTILE, NO "TOP CONTRIBUTOR". Those need a population, and
 * `P1-J3-E004` established the population is two-digit at best — measured
 * 2026-08-19 it is ZERO. A percentile of nobody is not a compliment.
 *
 * ⚠ AND NOTHING HERE SAYS "MESSAGES". There is no messaging model in the
 * schema; `check:community` fails the build if any surface labels a post count
 * that way.
 */
export function CommunitySignalBlock({
  signal,
  firstName,
  isOwner = false,
}: {
  signal: CommunitySignal | null;
  firstName: string;
  isOwner?: boolean;
}) {
  if (!signal) return null;

  const { helpfulAnswers, replies, threads, boards, lastActive } = signal;

  return (
    <section className="rounded-brand border border-line bg-white p-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-[20px] font-bold">
          {isOwner ? "Your Community Activity" : `${firstName} in the Community`}
        </h2>
        {lastActive && <p className="text-[13.5px] text-ink-2">{lastActive}</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
        {/*
          ⚠ THE HELPFUL COUNT IS THE ONLY ONE GIVEN WEIGHT, and it is stated in
          terms of who decided: the person who asked. That phrasing is the whole
          defence against it being read as a popularity number.
        */}
        <div>
          <p className="font-display text-[30px] font-bold leading-none text-magenta">
            {helpfulAnswers}
          </p>
          <p className="mt-1 max-w-[220px] text-[13px] leading-snug text-ink-2">
            answer{helpfulAnswers === 1 ? "" : "s"} marked helpful by the person who asked
          </p>
        </div>

        <dl className="flex flex-wrap gap-x-7 gap-y-2 text-[13.5px]">
          <div>
            <dt className="text-ink-2">Replies</dt>
            <dd className="font-display text-[17px] font-bold">{replies}</dd>
          </div>
          <div>
            <dt className="text-ink-2">Threads started</dt>
            <dd className="font-display text-[17px] font-bold">{threads}</dd>
          </div>
        </dl>
      </div>

      {boards.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-ink-2">
          <span className="font-semibold">Active in:</span>
          {boards.map((b) => (
            <span
              key={b}
              className="rounded-full border border-line bg-bg-soft px-2.5 py-1 text-[12.5px]"
            >
              {b}
            </span>
          ))}
        </p>
      )}

      {isOwner && (
        <Link
          href="/community/forums"
          className="mt-4 inline-block text-[13px] font-semibold text-magenta hover:underline"
        >
          Go to the forums <span aria-hidden>→</span>
        </Link>
      )}
    </section>
  );
}
