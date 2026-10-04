import Link from "next/link";
import type { Figure } from "@/lib/figure";
import { isCounted } from "@/lib/figure";
import type { Statistics } from "@/lib/statistics";

/**
 * /usage — SCOTT'S 09-23 LAYOUT IN TODAY'S STYLE (`P2-A1.1-E824`, R-E016).
 *
 * Approved 2026-10-04 against
 * `mockups/usage_mockup_current_style_2026-10-04.html`: rounded bordered cards
 * in two columns, each a list of label + number rows.
 *
 * EVERY FIGURE COMES FROM AN EXISTING WRITER. Nothing here counts anything —
 * `getStatistics` does, and a figure it reports as `{ uncounted }` renders as
 * "—" with a NOT COUNTED tag AND THE REASON, never as a zero. That is the
 * 2026-09-23 counting rule, and it is why the tag carries text at all.
 */

const CARD = "rounded-brand border border-line bg-surface p-5";
const HEAD = "font-display font-bold tracking-[-0.3px]";

/** One label + number row. The reason travels with the tag, never apart. */
function Row({
  label,
  hint,
  figure,
  money,
}: {
  label: string;
  hint?: string;
  figure: Figure;
  money?: boolean;
}) {
  const counted = isCounted(figure);
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/60 py-2.5 last:border-b-0">
      <span className="min-w-0">
        <span className="block text-[14px] text-ink">
          {label}
          {!counted && (
            <span className="ml-2 inline-block rounded-[3px] bg-ink/[0.06] px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] text-ink-3">
              NOT COUNTED
            </span>
          )}
        </span>
        {/* The hint, or — when there is no writer — the reason there is none. */}
        {(hint || !counted) && (
          <span className="mt-0.5 block text-[12px] text-ink-3">
            {counted ? hint : (figure as { uncounted: string }).uncounted}
          </span>
        )}
      </span>
      <span
        className={
          "shrink-0 tabular-nums text-[17px] font-bold " + (counted ? "text-ink" : "text-ink-3")
        }
      >
        {counted
          ? money
            ? `$${(figure / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
            : figure.toLocaleString()
          : "—"}
      </span>
    </div>
  );
}

/** The eight-week sparkline. Drawn only when the series is countable. */
function Spark({ series }: { series: number[] | { uncounted: string } }) {
  if (!Array.isArray(series) || series.length === 0) return null;
  const max = Math.max(...series, 1);
  const step = 320 / Math.max(series.length - 1, 1);
  const points = series.map((v, i) => `${i * step},${56 - (v / max) * 48}`).join(" ");
  return (
    <svg viewBox="0 0 320 56" width="100%" height="56" preserveAspectRatio="none" className="mt-3">
      <polyline points={points} fill="none" stroke="var(--color-magenta)" strokeWidth="2" />
    </svg>
  );
}

export function UsageCards({
  stats,
  searchScore,
}: {
  stats: Statistics;
  searchScore: Figure;
}) {
  return (
    <>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className={CARD}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className={`text-[17px] text-ink ${HEAD}`}>Your Profile</h3>
          </div>
          <div className="mt-2">
            <Row label="Profile Views" hint="People who opened your profile" figure={stats.profile.views} />
            <Row label="Profile Score" hint="Out of 100" figure={searchScore} />
            <Row label="Shown in Search" figure={stats.profile.shownInSearch} />
            <Row label="Rate Seen by Buyers" figure={stats.profile.rateSeen} />
          </div>
          <p className="mt-3 text-[12px] text-ink-3">
            Views are counted once per person per day. We never show you who.
          </p>
        </section>

        <section className={CARD}>
          <h3 className={`text-[17px] text-ink ${HEAD}`}>Your Network</h3>
          <div className="mt-2">
            <Row label="Colleagues" hint="Connected both ways" figure={stats.network.colleagues} />
            <Row label="Invites Sent" figure={stats.network.invitesSent} />
            <Row label="Joined From Your Invite" figure={stats.network.joined} />
            <Row label="Growth Score" hint="Resets on the 1st" figure={stats.network.growthScore} />
          </div>
          <p className="mt-3 text-[12px]">
            <Link href="/community" className="font-bold text-ink-2 underline-offset-4 hover:text-magenta hover:underline">
              Grow Your Community →
            </Link>
          </p>
        </section>

        <section className={CARD}>
          <h3 className={`text-[17px] text-ink ${HEAD}`}>Your Learning</h3>
          <div className="mt-2">
            <Row label="Lessons Completed" figure={stats.learning.lessonsCompleted} />
            <Row label="Paths Enrolled" figure={stats.learning.pathsEnrolled} />
            <Row label="Certifications Earned" figure={stats.learning.certifications} />
            <Row label="Paths You Teach" figure={stats.learning.pathsTaught} />
          </div>
          <Spark series={stats.learning.lessonSeries} />
          <p className="mt-1 text-[12px] text-ink-3">
            Lessons finished each week, last eight weeks.
          </p>
        </section>

        <section className={CARD}>
          <h3 className={`text-[17px] text-ink ${HEAD}`}>Your Work</h3>
          <div className="mt-2">
            <Row label="Work Requests Received" figure={stats.work.requestsReceived} />
            <Row label="Proposals Sent" figure={stats.work.proposalsSent} />
            <Row label="Interviews" figure={stats.work.interviews} />
            <Row label="Work Orders" figure={stats.work.workOrders} />
            <Row
              label="Earnings"
              hint="Starts counting when an order settles"
              figure={stats.work.earnings}
              money
            />
          </div>
          <p className="mt-3 text-[12px] text-ink-3">
            Nothing here is an estimate. Every figure is a row count.
          </p>
        </section>
      </div>

      {/*
        TEACHING RENDERS ONLY FOR SOMEONE WHO TEACHES. A card measuring teaching
        for a member with no paths is not an honest zero, it is a card about
        somebody else — and `teaches` is the capability test the 2026-09-23 rule
        asks for (hide only when the capability is absent).
      */}
      {stats.teaching.teaches && (
        <section className={`${CARD} mt-4`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className={`text-[17px] text-ink ${HEAD}`}>Teaching</h3>
            <span className="text-[12px] text-ink-3">Shown because you teach</span>
          </div>
          <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
            <div>
              <Row label="Learners in Your Paths" figure={stats.teaching.learners} />
              <Row label="Lessons Completed by Them" figure={stats.teaching.lessonsByThem} />
            </div>
            <div>
              <Row label="Questions in Your Groups" figure={stats.teaching.questions} />
              <Row label="Questions Waiting on You" figure={stats.teaching.questionsWaiting} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
