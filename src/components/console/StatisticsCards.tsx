import Link from "next/link";
import { StatFigureRow } from "@/components/console/StatFigureRow";
import { isCounted, type Statistics, type StatWindow } from "@/lib/statistics";

/**
 * ── ⚠⚠ THE CARDS THE STATISTICS PAGE GAINED (`P2-A2-E603` WS-A) ──────────
 *
 * ⚠ SCOTT, ruling 1 (`E600`): *"Usage is part of Statistics — one tab, one
 * page. The learning figures are a card here, not a second page."*
 * ⚠⚠ MEASURED: `/usage` NEVER EXISTED AS A ROUTE and nothing links to one, so
 * the fold left no orphan to redirect.
 *
 * ⚠⚠⚠ THIS **EXTENDS** `/stats`, IT DOES NOT REPLACE IT. The page was already a
 * working 751 lines, and its own doctrine already carried this brief's central
 * rule — *"'$0 earned' is a claim we have not earned the right to make"*. ⚠ Its
 * existing cards (Service Products, Job Success, Proposals, Interviews, Confirm
 * Your Experience) are untouched.
 */

/**
 * ⚠⚠ THE PERIOD SWITCH RENDERS ONLY WHERE SOMETHING ON THE CARD HAS A DATE.
 * ⚠ SCOTT, WS-A item 3: *"applies to the figures that have a date, and is NOT
 * shown on cards where nothing does."* ⚠⚠⚠ A SWITCH THAT CHANGES NOTHING IS A
 * CONTROL THAT LIES — it promises the figures beneath it respond.
 * ⚠ It is a pair of LINKS, not buttons: each is a real URL, so a period is
 * shareable and survives a refresh. The same reasoning the Grow board records.
 */
function PeriodSwitch({ window }: { window: StatWindow }) {
  const tabs: { key: StatWindow; label: string }[] = [
    { key: "month", label: "This Month" },
    { key: "all", label: "All Time" },
  ];
  return (
    <span className="inline-flex overflow-hidden rounded-full border border-line">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.key === "month" ? "/stats" : `/stats?period=${t.key}`}
          className={
            "px-3 py-1 text-[12px] font-semibold transition-colors " +
            (window === t.key ? "bg-ink text-white" : "bg-white text-ink-2 hover:text-ink")
          }
        >
          {t.label}
        </Link>
      ))}
    </span>
  );
}

function Card({
  title,
  children,
  aside,
  note,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <section className="rounded-brand border border-line bg-white px-[18px] py-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        {/* ⚠ Title Case (`E568` / rule 11). */}
        <h2 className="font-display text-[16px] font-bold">{title}</h2>
        {aside}
      </div>
      {children}
      {note && <div className="mt-3 border-t border-line pt-2 text-[12.5px] text-ink-3">{note}</div>}
    </section>
  );
}

export function StatisticsCards({ s }: { s: Statistics }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {/*
          ⚠⚠ YOUR NETWORK — every figure dated, so it takes the switch.
          ⚠ `growthScore` is `E599`'s, re-asked rather than recomputed, so this
          page and `/community/grow` cannot disagree about the same member.
        */}
        <Card
          title="Your Network"
          aside={<PeriodSwitch window={s.window} />}
          note={
            <Link href="/community/grow" className="font-bold text-magenta hover:underline">
              Grow Your Community &rarr;
            </Link>
          }
        >
          <StatFigureRow label="Colleagues" figure={s.network.colleagues} hint="Connected both ways" />
          <StatFigureRow label="Invites Sent" figure={s.network.invitesSent} />
          <StatFigureRow label="Joined From Your Invite" figure={s.network.joined} />
          <StatFigureRow label="Growth Score" figure={s.network.growthScore} hint="Resets on the 1st" />
        </Card>

        {/*
          ⚠⚠ YOUR LEARNING — *"this was the Usage page"* (`E600`'s fold).
          ⚠ `Certifications` and `Paths You Teach` are NOT dated in a way the
          switch can use, so the card carries the switch for the two that are
          and says nothing about the two that are not — rather than pretending
          all four respond.
        */}
        <Card
          title="Your Learning"
          aside={<PeriodSwitch window={s.window} />}
          note="Lessons and enrolments follow the period; certifications and paths you teach are all-time."
        >
          <StatFigureRow label="Lessons Completed" figure={s.learning.lessonsCompleted} />
          <StatFigureRow label="Paths Enrolled" figure={s.learning.pathsEnrolled} />
          <StatFigureRow label="Certifications Earned" figure={s.learning.certifications} />
          <StatFigureRow label="Paths You Teach" figure={s.learning.pathsTaught} />
        </Card>
      </div>

      {/*
        ⚠⚠⚠ TEACHING RENDERS ONLY FOR SOMEBODY WHO TEACHES (WS-A item 4).
        ⚠ `teaches` is `E593`'s `teachesPathWhere` shape — expert on the path OR
        on any lesson inside it — so a card that appears here and a forum a
        person can reach agree about who teaches.
      */}
      {s.teaching.teaches && (
        <Card title="Teaching" aside={<span className="text-[12.5px] text-ink-3">Shown because you teach</span>}>
          <div className="grid gap-x-6 sm:grid-cols-2">
            <div>
              <StatFigureRow label="Learners in Your Paths" figure={s.teaching.learners} />
              <StatFigureRow label="Lessons Completed by Them" figure={s.teaching.lessonsByThem} />
            </div>
            <div>
              <StatFigureRow label="Questions in Your Groups" figure={s.teaching.questions} />
              <StatFigureRow label="Questions Waiting on You" figure={s.teaching.questionsWaiting} />
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

/**
 * ── ⚠⚠⚠ WHAT A BUYER SEES (WS-A item 5) ──────────────────────────────────
 *
 * ⚠ SCOTT: *"Cards a buyer has no use for don't render for a buyer."*
 * ⚠⚠ THE RULE IMPLEMENTED, STATED PLAINLY: **a card renders when the viewer has
 * the thing it measures, not when the viewer holds a capability.** Network and
 * Learning are measured for EVERY member — a buyer has colleagues, sends
 * invites and takes lessons — so they render for a buyer. The seller cards
 * (Service Products, Earnings, Proposals, Interviews) belong to a provider
 * profile and already gate on one.
 * ⚠⚠⚠ MEASURED BEFORE BUILDING: a buyer at `/stats` saw **one sentence** —
 * *"This account has no provider profile, so there is nothing to measure yet"*
 * — and no tab row. **That was wrong in the other direction:** it withheld
 * figures a buyer genuinely has.
 * ⚠ A capability test would have repeated that mistake; *"do you have any of
 * this?"* is the question the page is actually asking.
 */
export function BuyerStatistics({ s }: { s: Statistics }) {
  const nothing =
    isCounted(s.network.colleagues) &&
    s.network.colleagues === 0 &&
    isCounted(s.learning.lessonsCompleted) &&
    s.learning.lessonsCompleted === 0;
  return (
    <>
      <StatisticsCards s={s} />
      {/* ⚠ Still honest when there is genuinely nothing: it says what will fill
          it, rather than rendering four zeroes and calling that a report. */}
      {nothing && (
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          Nothing to measure yet. These fill in as you connect with colleagues
          and work through Learn.
        </p>
      )}
    </>
  );
}
