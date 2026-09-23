import Link from "next/link";
import { StatFigureRow } from "@/components/console/StatFigureRow";
import { FlipCard } from "@/components/motion/FlipCard";
import { ActionBack, TrendBack, allZero, type TrendPeriod } from "@/components/console/StatCardBacks";
import { Honeycomb, type HoneyCell } from "@/components/console/Honeycomb";
import type { Figure, Statistics } from "@/lib/statistics";
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
  const workHasHistory =
    Array.isArray(s.work.orderSeries) && s.work.orderSeries.some((n) => n > 0);
  /* ⚠⚠ ONLY COUNTED FIGURES VOTE — Proposals and Earnings are dashes, and a
     dash is not a zero. `allZero` enforces that; it is repeated here only to
     say which three are actually being asked. */
  const workEmpty = allZero([s.work.requestsReceived, s.work.interviews, s.work.workOrders]);

  return (
    <>
      {/* ⚠⚠ THE HONEYCOMB LEADS (WS-B) — one cell per area, on `E600` WS-D's
          shared 15-second rebuild. ⚠⚠⚠ ITS CELLS ARE DERIVED FROM THE SAME `s`
          THE CARDS BELOW DRAW, so a cell and its card cannot disagree about the
          same member in the same render. */}
      <Honeycomb cells={honeyCells(s)} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
        {/*
          ── ⚠⚠⚠ YOUR WORK — SHIPPED BECAUSE UNRENDERED CODE IS UNREVIEWED CODE ──

          ⚠ SCOTT, 2026-09-23: *"Unrendered code is unreviewed code — `s.work`
          computing five figures that reach no screen is exactly how defect 3
          survived."*
          ⚠⚠ THE DEFECT HE MEANS: `workOrders` was `prisma.workOrder.count()`
          with **no `where` at all** — the platform total, presented as one
          member's figure. It survived review because nothing drew it. ⚠⚠⚠ A
          FIGURE NOBODY SEES IS A FIGURE NOBODY CHECKS.

          ⚠ ALL FIVE ARE SCOPED OR DASHED, AND `check:statistics` §13 ASSERTS
          THE SCOPE BY SHAPE rather than trusting an empty result — the three
          counted ones all filter `provider_person_id`, which is the PROVIDER
          column on each model (each also carries a separate buyer-side column,
          `invited_by_person_id` / `requested_by_person_id`).
        */}
        <Shell>
          <FlipCard
            title="Your Work"
            backLabel={workHasHistory ? "Trend" : "What to do next"}
            /* ⚠ Three of the five are counted zeros, so the card is not "all
               zero" in the sense that turns it face-down — but with no orders
               on record there is no line to draw, so the back is the ACTION
               back and the front still leads. */
            initialBack={workEmpty && !workHasHistory}
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
                <StatFigureRow label="Proposals Sent" figure={s.work.proposalsSent} />
                <StatFigureRow label="Interviews" figure={s.work.interviews} />
                <StatFigureRow label="Work Orders" figure={s.work.workOrders} />
                <StatFigureRow label="Earnings" figure={s.work.earnings} />
              </Card>
            }
            back={
              /*
                ⚠⚠⚠ DOES THIS CARD EARN A CONTROL? YES — AND THE REASON IS THAT
                ITS BACK IS NOT THIN EITHER WAY (`E579`).
                ⚠ THE SERIES IS **WORK ORDERS STARTED**, not work requests
                received: a request is something a BUYER does TO the member, so
                charting it would chart somebody else's behaviour and teach the
                member nothing they can act on.
                ⚠⚠ AND THE TWO FIGURES A MEMBER WOULD MOST WANT A TREND OF —
                Proposals and Earnings — ARE UNCOUNTABLE, so a trend cannot
                pretend to cover them. **The data picks the variant**, and with
                `WorkOrder` holding zero rows platform-wide, every member sees
                the action back today.
              */
              workHasHistory ? (
                <TrendBack
                  title="Your Work"
                  series={s.work.orderSeries}
                  period={period}
                  subject="Work orders started"
                  hrefFor={trendHref("work")}
                />
              ) : (
                <ActionBack
                  title="Your Work"
                  credit={workCreditLine(s)}
                  /* ⚠⚠ EVERY LINK HERE ALSO LIVES IN THE APPLICATION MENU — a
                     link that exists only behind a flip is a hidden door.
                     `Work` → /find-work · `Sell` → /my-services ·
                     `Orders` → /orders. Verified against `PROVIDER_NAV`. */
                  links={[
                    { label: "Find Work", href: "/find-work" },
                    { label: "Manage Service Products", href: "/my-services" },
                    { label: "See Your Orders", href: "/orders" },
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
/**
 * ── ⚠⚠⚠ ONE CELL PER AREA, DERIVED FROM THE FIGURES THE CARDS DRAW ───────
 *
 * ⚠ Each area's HEADLINE figure — the one a member would name if asked how that
 * area is going. ⚠⚠ THEY COME FROM `s`, NOT FROM A SECOND QUERY: a honeycomb
 * that counted for itself would be a second definition of every figure on the
 * page, and the two would disagree the first time one of them changed
 * (`E585`).
 *
 * ⚠⚠⚠ `Teaching` FOLLOWS THE CARD'S RULE AND HIDES ON THE **CAPABILITY**, not
 * on emptiness — a teacher with no learners still gets a cell showing `0`,
 * because a zero is information. Somebody who does not teach gets no cell,
 * because the area does not exist for them.
 *
 * ⚠ AN UNCOUNTABLE HEADLINE IS PASSED THROUGH AS THE DASH IT IS. `Your
 * Profile`'s headline is views, which is uncountable for a member with no
 * provider profile — that cell then carries its reason, and the honeycomb has
 * a worked example of the two-dashes rule on ordinary data rather than only in
 * a gate.
 */
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
      href: "/community",
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

/**
 * ⚠⚠ THE WORK CARD'S CREDIT LINE — the same rule as the network one: a COUNT,
 * never a compliment, and it reads only the figures the card prints.
 * ⚠⚠⚠ IT CANNOT CREDIT A DASH. Proposals and Earnings are uncountable, so they
 * are absent from this sentence entirely — crediting *"0 proposals sent"* would
 * report a result where there is no mechanism.
 * ⚠ At genuine zero it names the FIRST MOVE rather than reporting emptiness
 * (Scott, 2026-09-23) — and the first move for work is being findable, which is
 * what the links beneath it go to.
 */
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
