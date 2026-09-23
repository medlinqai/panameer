import Link from "next/link";
import { StatFigureRow } from "@/components/console/StatFigureRow";
import { FlipCard } from "@/components/motion/FlipCard";
import { ActionBack, TrendBack, allZero, type TrendPeriod } from "@/components/console/StatCardBacks";
import type { Statistics } from "@/lib/statistics";
import "@/components/motion/flip-card.css";

/**
 * ── ⚠⚠ THE CARDS THE STATISTICS PAGE GAINED (`P2-A2-E603` WS-A) ──────────
 *
 * ⚠ SCOTT, ruling 1 (`E600`): *"Usage is part of Statistics — one tab, one
 * page."* ⚠ MEASURED: `/usage` NEVER EXISTED AS A ROUTE, so the fold left no
 * orphan.
 * ⚠⚠⚠ THIS **EXTENDS** `/stats`; the page's seven existing cards are untouched.
 *
 * ── ⚠⚠⚠ THE FRONT-FACE PERIOD SWITCH IS GONE (correction 4) ──────────────
 *
 * ⚠ SCOTT, 2026-09-23: *"The back face owns every time window — one card, one
 * place where time is chosen."*
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the front-face control and its
 * two-period model:
 * //   function PeriodSwitch({ window }: { window: StatWindow }) {
 * //     const tabs: { key: StatWindow; label: string }[] = [
 * //       { key: "month", label: "This Month" },
 * //       { key: "all", label: "All Time" },
 * //     ];
 * //     … <Link href={t.key === "month" ? "/stats" : `/stats?period=${t.key}`} …>
 * //   }
 * //   <Card title="Your Network" aside={<PeriodSwitch window={s.window} />} …>
 * ⚠⚠ AND THE PER-ROW FOOTNOTE WENT WITH IT (correction 5). It existed only to
 * explain that two of four rows ignored the front switch:
 * //   note="Lessons and enrolments follow the period; certifications and paths
 * //         you teach are all-time."
 * ⚠⚠⚠ NO ROW NEEDS ONE FOR ANY OTHER REASON — every front figure is now simply
 * "as it stands today", which needs no tag at all.
 */

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
    <div className="h-full">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        {/* ⚠ Title Case (`E568` / rule 11). */}
        <h2 className="font-display text-[16px] font-bold">{title}</h2>
        {aside}
      </div>
      {children}
      {note && <div className="mt-3 border-t border-line pt-2 text-[12.5px] text-ink-3">{note}</div>}
    </div>
  );
}

/** ⚠ The shell is separate from the faces so BOTH faces sit inside one border
 *  and one padding box — the flip cannot change the card's shape. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-brand border border-line bg-white px-[18px] py-4">{children}</section>
  );
}

const trendHref = (card: string) => (p: TrendPeriod) => `/stats?trend=${card}&period=${p}`;

export function StatisticsCards({
  s,
  period,
}: {
  s: Statistics;
  /** ⚠ Which trend period the back faces show. Front faces have none. */
  period: TrendPeriod;
}) {
  /*
    ⚠⚠⚠ THE DATA PICKS THE VARIANT AND WHICH FACE IS UP (Scott).
    ⚠ `allZero` counts only COUNTED figures — a dash is not a zero and must not
    vote a card onto its action back.
  */
  const networkEmpty = allZero([
    s.network.colleagues,
    s.network.invitesSent,
    s.network.joined,
    s.network.growthScore,
  ]);
  const learningEmpty = allZero([
    s.learning.lessonsCompleted,
    s.learning.pathsEnrolled,
    s.learning.certifications,
    s.learning.pathsTaught,
  ]);
  const networkHasHistory =
    Array.isArray(s.network.inviteSeries) && s.network.inviteSeries.some((n) => n > 0);
  const learningHasHistory =
    Array.isArray(s.learning.lessonSeries) && s.learning.lessonSeries.some((n) => n > 0);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {/*
          ⚠⚠ YOUR PROFILE — USAGE ONLY, NO COMPLETION (correction 2).
          ⚠ Scott: *"Statistics measures what the application DID with the
          profile."* Completion lives on the Score page.
          ⚠⚠⚠ NO FLIP CONTROL: its other two figures are uncounted and profile
          views have no second dimension to show, so a back would be thin — and
          a flip onto a thin back is a door onto a wall (`E579`).
        */}
        <Shell>
          <FlipCard
            title="Your Profile"
            back={null}
            front={
              <Card
                title="Your Profile"
                note="Views are counted once per person per day. We never show you who."
              >
                <StatFigureRow label="Profile Views" figure={s.profile.views} hint="People who opened your profile" />
                <StatFigureRow label="Shown in Search" figure={s.profile.shownInSearch} />
                <StatFigureRow label="Rate Seen by Buyers" figure={s.profile.rateSeen} />
              </Card>
            }
          />
        </Shell>

        {/*
          ⚠⚠ YOUR NETWORK — a trend back, because every figure is dated.
          ⚠ `growthScore` is `E599`'s, re-asked rather than recomputed, so this
          page and `/community/grow` cannot disagree about the same member.
        */}
        <Shell>
          <FlipCard
            title="Your Network"
            backLabel={networkHasHistory ? "Trend" : "What to do next"}
            initialBack={networkEmpty}
            front={
              <Card
                title="Your Network"
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
            }
            back={
              /* ⚠⚠ DATED FIGURES EARN A TREND BACK; a card with nothing to plot
                 gets the action back instead — the data picks, not the author. */
              networkHasHistory ? (
                <TrendBack
                  title="Your Network"
                  series={s.network.inviteSeries}
                  period={period}
                  subject="Invitations sent"
                  hrefFor={trendHref("network")}
                />
              ) : (
                <ActionBack
                  title="Your Network"
                  /* ⚠ A COUNT, NOT A COMPLIMENT. */
                  credit={creditLine(s)}
                  links={[
                    { label: "Invite a Colleague", href: "/invite-colleague" },
                    { label: "Grow Your Community", href: "/community/grow" },
                    { label: "Find a Mentor", href: "/community/mentors" },
                  ]}
                />
              )
            }
          />
        </Shell>

        {/*
          ⚠⚠ YOUR LEARNING — *"this was the Usage page"* (`E600`'s fold).
          ⚠⚠⚠ THE SPARKLINE IS ON THE BACK, NOT THE FRONT (Scott).
        */}
        <Shell>
          <FlipCard
            title="Your Learning"
            backLabel={learningHasHistory ? "Trend" : "What to do next"}
            initialBack={learningEmpty && !learningHasHistory}
            front={
              <Card title="Your Learning">
                <StatFigureRow label="Lessons Completed" figure={s.learning.lessonsCompleted} />
                <StatFigureRow label="Paths Enrolled" figure={s.learning.pathsEnrolled} />
                <StatFigureRow label="Certifications Earned" figure={s.learning.certifications} />
                <StatFigureRow label="Paths You Teach" figure={s.learning.pathsTaught} />
              </Card>
            }
            back={
              learningHasHistory ? (
                <TrendBack
                  title="Your Learning"
                  series={s.learning.lessonSeries}
                  period={period}
                  subject="Lessons finished"
                  hrefFor={trendHref("learning")}
                />
              ) : (
                <ActionBack
                  title="Your Learning"
                  credit="No lessons finished yet."
                  links={[
                    { label: "Browse Learning Paths", href: "/learn" },
                    { label: "See Your Score", href: "/community/score" },
                  ]}
                />
              )
            }
          />
        </Shell>
      </div>

      {/*
        ⚠⚠⚠ TEACHING RENDERS ONLY FOR SOMEBODY WHO TEACHES — the ONE card that
        hides, and it hides on a CAPABILITY (`E593`'s `teachesPathWhere`), not on
        emptiness. ⚠ That is the rule correction 2 settled: a card hides only
        when the capability is absent.
      */}
      {s.teaching.teaches && (
        <Shell>
          <FlipCard
            title="Teaching"
            back={null}
            front={
              <Card
                title="Teaching"
                aside={<span className="text-[12.5px] text-ink-3">Shown because you teach</span>}
              >
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
            }
          />
        </Shell>
      )}
    </>
  );
}

/**
 * ⚠⚠⚠ CREDIT WHAT A MEMBER HAS DONE THE MOMENT THEY DO IT (correction 6).
 *
 * ⚠ SCOTT: the old zero-state predicate *"tested colleagues and lessons while
 * the card printed Invites Sent and Joined, so a buyer with five invites and no
 * colleagues was told there was nothing to measure."*
 * ⚠⚠ THIS NAMES WHAT THEY ACTUALLY DID, from the figures the card prints — it
 * cannot miss a dimension the card shows, because it reads the same four.
 */
/* ⚠⚠ EXPORTED FOR `check:statistics`, AND THE REASON IS A MEASUREMENT, NOT a
   preference: **NO SEEDED PERSONA REACHES THE NON-EMPTY BRANCH.** All 14 sellers
   sampled at 2026-09-23 are either all-zero (so the line reads *"Nothing counted
   on this card yet."*) or have invite history (so the card shows a TREND back and
   this function never runs). ⚠⚠⚠ A BRANCH NO RENDER CAN REACH IS PROVEN BY
   ASSERTION OR IT IS NOT PROVEN — the alternative is seeding, and seeding is
   forbidden during the test window. */
export function creditLine(s: Statistics): string {
  const bits: string[] = [];
  const n = (f: typeof s.network.colleagues) => (typeof f === "number" ? f : 0);
  if (n(s.network.invitesSent) > 0)
    bits.push(`${n(s.network.invitesSent)} invitation${n(s.network.invitesSent) === 1 ? "" : "s"} sent`);
  if (n(s.network.colleagues) > 0)
    bits.push(`${n(s.network.colleagues)} colleague${n(s.network.colleagues) === 1 ? "" : "s"} connected`);
  if (n(s.network.joined) > 0) bits.push(`${n(s.network.joined)} joined from your invitations`);
  /* ⚠ No trailing flourish. The sentence ends where the counting ends. */
  return bits.length ? `${bits.join(", ")}.` : "Nothing counted on this card yet.";
}

/**
 * ── ⚠⚠⚠ THE BUYER RULE, CORRECTED (correction 2) ─────────────────────────
 *
 * ⚠ SCOTT, 2026-09-23: *"A card renders for anyone who COULD have the thing it
 * measures, showing honest zeros. A card hides only when the CAPABILITY is
 * absent — Teaching on `teachesPathWhere`."*
 *
 * ⚠⚠ THE PREVIOUS COMMENT HERE SAID SOMETHING ELSE AND WAS WRONG — *"a card
 * renders when the viewer HAS the thing it measures"* — which would justify
 * hiding a buyer's empty Network card. ⚠⚠⚠ THE CODE WAS ALREADY RIGHT AND THE
 * STATED RULE WAS NOT, WHICH IS THE MORE DANGEROUS HALF: the next person
 * implements the comment.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   a card renders when the viewer HAS the thing it measures, not when the
 * //   viewer holds a capability
 *
 * ⚠⚠ THE REASON, IN SCOTT'S WORDS: *"a buyer with no colleagues who sees no
 * Network card loses the entrance to inviting anyone. Removing a card can remove
 * a capability's only entrance. A zero is information; an absent card is a dead
 * end."* ⚠ That is `OwnerResumeRerun`'s lesson again, one brief later.
 *
 * ⚠ The zero-state sentence is GONE (correction 6) — the action back replaces
 * it. ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   const nothing = isCounted(s.network.colleagues) && s.network.colleagues === 0 &&
 * //     isCounted(s.learning.lessonsCompleted) && s.learning.lessonsCompleted === 0;
 * //   {nothing && <p>Nothing to measure yet. These fill in as you connect…</p>}
 * ⚠⚠ ITS PREDICATE HAD A HOLE: it tested colleagues and lessons while the card
 * printed Invites Sent and Joined.
 *
 * ⚠ Seller cards still require the provider profile that branch lacks — that
 * part was right and is unchanged.
 */
export function BuyerStatistics({ s, period }: { s: Statistics; period: TrendPeriod }) {
  return <StatisticsCards s={s} period={period} />;
}
