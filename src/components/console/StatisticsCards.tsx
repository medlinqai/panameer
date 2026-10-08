import Link from "next/link";
import { StatFigureRow } from "@/components/console/StatFigureRow";
import { FlipCard } from "@/components/motion/FlipCard";
import { ActionBack, BreakdownBack, TrendBack, allZero, type TrendPeriod } from "@/components/console/StatCardBacks";
import { type HoneyCell } from "@/components/console/Honeycomb";
import type { Figure, Statistics } from "@/lib/statistics";
import "@/components/motion/flip-card.css";

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
        {}
        <h2 className="font-display text-[16px] font-bold">{title}</h2>
        {aside}
      </div>
      {children}
      {note && <div className="mt-3 border-t border-line pt-2 text-[12.5px] text-ink-3">{note}</div>}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-brand border border-line bg-white px-[18px] py-4">{children}</section>
  );
}

const trendHref = (card: string) => (p: TrendPeriod) => `/usage?trend=${card}&period=${p}`;

export function StatisticsCards({
  s,
  period,
  cards = "all",
}: {
  s: Statistics;
  /** Which trend period the back faces show. Front faces have none. */
  period: TrendPeriod;
  /** WHICH CARDS RENDER */
  cards?: "all" | "teaching-only";
}) {
  const onlyTeaching = cards === "teaching-only";
  // THE DATA PICKS THE VARIANT AND WHICH FACE IS UP (Scott).
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
      {/* THE HONEYCOMB MOVED INTO THE HEADER WS-B) */}

      {/* The four cards Scott named. Hidden on `/usage` since ; still rendered */}
      {!onlyTeaching && (
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* YOUR PROFILE — USAGE ONLY, NO COMPLETION (correction 2). */}
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

        {/* YOUR NETWORK — a trend back, because every figure is dated. */}
        <Shell>
          <FlipCard
            title="Your Network"
            backLabel={networkHasHistory ? "Trend" : "What to do next"}
            initialBack={networkEmpty}
            front={
              <Card
                title="Your Network"
                note={
                  <Link href="/connect/leaders" className="font-bold text-magenta hover:underline">
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
              // DATED FIGURES EARN A TREND BACK; a card with nothing to plot
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
                  /* A COUNT, NOT A COMPLIMENT. */
                  credit={creditLine(s)}
                  links={[
                    { label: "Join Panameer", href: "/connect/invite" },
                    { label: "Grow Your Community", href: "/connect/leaders" },
                    { label: "Find a Mentor", href: "/connect/mentors" },
                  ]}
                />
              )
            }
          />
        </Shell>

        {/* YOUR LEARNING — *"this was the Usage page"* ( 's fold). */}
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
                    { label: "See Your Score", href: "/connect/score" },
                  ]}
                />
              )
            }
          />
        </Shell>
        {/* YOUR WORK — SHIPPED BECAUSE UNRENDERED CODE IS UNREVIEWED CODE */}
        <Shell>
          <FlipCard
            title="Your Work"
            backLabel="The detail"
            front={
              <Card
                title="Your Work"
                note="Work you were invited to, and what came of it."
              >
                <StatFigureRow
                  label="Work Requests"
                  figure={s.work.requestsReceived}
                  hint="Buyers who invited you to bid"
                />
                <StatFigureRow
                  label="Proposals Sent"
                  figure={s.work.proposalsSent}
                  hint="Bids you submitted — a draft is not a proposal"
                />
                <StatFigureRow
                  label="Invitations to Propose"
                  figure={s.work.invitationsToPropose}
                />
                <StatFigureRow label="Interviews" figure={s.work.interviews} />
                <StatFigureRow label="Work Orders" figure={s.work.workOrders} />
                <StatFigureRow label="Earnings" figure={s.work.earnings} />
              </Card>
            }
            back={
              // THE BACK IS NOW THE BREAKDOWN THE OLD TILES CARRIED
              <BreakdownBack
                title="Your Work"
                totalLabel="Interviews offered"
                total={s.work.interviews}
                parts={[
                  { label: "Taken", figure: s.work.interviewsTaken },
                  { label: "Declined or cancelled", figure: s.work.interviewsDeclined },
                ]}
                remainderLabel="Still in progress"
                note="An invitation counts whether or not you bid — a buyer asking you directly is the signal."
                links={[
                  { label: "Find Work", href: "/find-work" },
                  { label: "Manage Service Products", href: "/my-services" },
                  { label: "See Your Orders", href: "/orders" },
                ]}
              />
            }
          />
        </Shell>
      </div>
      )}

      {/* TEACHING RENDERS ONLY FOR SOMEBODY WHO TEACHES — the ONE card that */}
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

/** CREDIT WHAT A MEMBER HAS DONE THE MOMENT THEY DO IT (correction 6). */
// EXPORTED FOR `check:statistics`, AND THE REASON IS A MEASUREMENT, NOT a
/** ONE CELL PER AREA, DERIVED FROM THE FIGURES THE CARDS DRAW */
export function honeyCells(s: Statistics): HoneyCell[] {
  const cells: HoneyCell[] = [
    {
      key: "profile",
      label: "Your Profile",
      figure: s.profile.views,
      counts: "profile views",
      href: "/profile",
    },
    {
      key: "network",
      label: "Your Network",
      figure: s.network.colleagues,
      counts: "colleagues",
      href: "/connect/community",
    },
    {
      key: "learning",
      label: "Your Learning",
      figure: s.learning.lessonsCompleted,
      counts: "lessons completed",
      href: "/learn",
    },
    {
      key: "work",
      label: "Your Work",
      figure: s.work.workOrders,
      counts: "work orders",
      href: "/find-work",
    },
  ];
  if (s.teaching.teaches) {
    cells.push({
      key: "teaching",
      label: "Teaching",
      figure: s.teaching.learners,
      counts: "learners",
      href: "/learn",
    });
  }
  return cells;
}

/** THE WORK CARD'S CREDIT LINE — the same rule as the network one: a COUNT */
export function workCreditLine(s: Statistics): string {
  const bits: string[] = [];
  const n = (f: Figure) => (typeof f === "number" ? f : 0);
  if (n(s.work.requestsReceived) > 0)
    bits.push(
      `${n(s.work.requestsReceived)} work request${n(s.work.requestsReceived) === 1 ? "" : "s"} received`
    );
  if (n(s.work.interviews) > 0)
    bits.push(`${n(s.work.interviews)} interview${n(s.work.interviews) === 1 ? "" : "s"}`);
  if (n(s.work.workOrders) > 0)
    bits.push(`${n(s.work.workOrders)} work order${n(s.work.workOrders) === 1 ? "" : "s"}`);
  return bits.length
    ? `${bits.join(", ")}.`
    : "No work has reached you yet. Buyers find you through your profile and your service products.";
}

export function creditLine(s: Statistics): string {
  const bits: string[] = [];
  const n = (f: typeof s.network.colleagues) => (typeof f === "number" ? f : 0);
  if (n(s.network.invitesSent) > 0)
    bits.push(`${n(s.network.invitesSent)} invitation${n(s.network.invitesSent) === 1 ? "" : "s"} sent`);
  if (n(s.network.colleagues) > 0)
    bits.push(`${n(s.network.colleagues)} colleague${n(s.network.colleagues) === 1 ? "" : "s"} connected`);
  if (n(s.network.joined) > 0) bits.push(`${n(s.network.joined)} joined from your invitations`);
  /* No trailing flourish. The sentence ends where the counting ends. */
  return bits.length ? `${bits.join(", ")}.` : "Nothing counted on this card yet.";
}

/** THE BUYER RULE, CORRECTED (correction 2) */
export function BuyerStatistics({ s, period }: { s: Statistics; period: TrendPeriod }) {
  return <StatisticsCards s={s} period={period} />;
}
