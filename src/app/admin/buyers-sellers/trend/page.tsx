import Link from "next/link";
import { JOB_TILES, holdsJob, type AdminFlags } from "@/lib/user-jobs";
import { weeklyJoins } from "@/lib/onboarding-trend";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/console/BackLink";
import {
  ONBOARDING_STATUSES,
  type OnboardingStatus,
} from "@/lib/onboarding-status";
import {
  getAllTrends,
  getStatusTrend,
  PERIODS,
  type Period,
} from "@/lib/onboarding-trend";
import { StatusTrendChart } from "@/components/admin/StatusTrendChart";

export const dynamic = "force-dynamic";

/**
 * Admin → Buyers/Sellers → TREND (`P1-J1.1-E257`).
 *
 * Scott, 2026-08-30: *"do trending."* Clicking a status tile on the board lands
 * here with that status selected; `?status=all` is the across-all-steps view.
 *
 * ⚠⚠ THIS SHIPPED ONE BRIEF LATE AND THE REASON IS RECORDED, because the stop
 * was correct behaviour. `E257` originally required reading
 * `.claude/skills/dataviz` before writing any chart code, AND stopping if a
 * status had no timestamp to trend on. Both conditions fired: the skill path did
 * not exist anywhere (it was chat's error, later withdrawn — *"THAT PATH DOES
 * NOT EXIST AND NEVER DID"*), and the buyer-side `Validated` genuinely had no
 * column. `E269b` added `RequesterProfile.validated_at` and the skill
 * requirement was withdrawn, so both blockers are gone and this is built.
 *
 * ⚠ NO EVENT LOG — see `lib/onboarding-trend.ts`. Every series reads a state
 * column, so the four are cumulative-by-nature rather than exclusive buckets and
 * a user who moved BACKWARDS is invisible. Stated on the page itself, not just
 * here, because the person reading the chart is the one who needs to know.
 */
export default async function TrendPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; period?: string; job?: string }>;
}) {
  const sp = await searchParams;

  /*
    ── ⚠⚠ THE PER-JOB VIEW (`P1-A1.5-E456`) ──────────────────────────────────

    > **SCOTT:** *"please create reports for each of the footer tiles (like
    > medlinq) showing how many were added each week over the last 90 days."*

    ⚠⚠ THIS IS WHERE THE TREND LINK WENT. `E457` deleted the sentence that was
    this route's ONLY entry point, and Part 1 stopped rather than strand it.
    Scott's answer is the FOOTER: five job tiles, five links, into here.

    ⚠ A NEW PARAMETER, NOT A NEW ROUTE, and ⚠⚠ IT NEVER TOUCHES `?status=`.
    Handing a JOB to `getStatusTrend` would fall through to its `else` branch and
    render the Validated series under a Providers heading — silently. Two axes,
    two parameters. `?job=` is checked FIRST and returns its own page, so the
    two code paths never meet.
  */
  const jobTile = JOB_TILES.find((t) => t.key === sp.job);
  if (jobTile) return <JobTrend tile={jobTile} />;
  const period: Period = PERIODS.includes(sp.period as Period)
    ? (sp.period as Period)
    : "month";
  const wantsAll = sp.status === "all";
  const status: OnboardingStatus = ONBOARDING_STATUSES.includes(
    sp.status as OnboardingStatus
  )
    ? (sp.status as OnboardingStatus)
    : "Created";

  const series = wantsAll
    ? await getAllTrends(period)
    : [await getStatusTrend(status, period)];

  const tab = (label: string, key: string, active: boolean) => (
    <Link
      key={key}
      href={`/admin/buyers-sellers/trend?status=${key}&period=${period}`}
      className={
        "rounded-full border-[1.5px] px-4 py-1.5 text-[13.5px] font-bold transition-colors " +
        (active
          ? "border-magenta bg-magenta text-white"
          : "border-line text-ink hover:border-magenta")
      }
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/buyers-sellers"
          className="text-[13.5px] font-bold text-magenta hover:underline"
        >
          ← Back to the Board
        </Link>
      </div>

      <h1 className="font-display text-[26px] font-bold text-ink">
        Onboarding Trend
      </h1>
      <p className="mt-1 text-[14px] text-ink-2">
        Users entering each status over time.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {ONBOARDING_STATUSES.map((s) => tab(s, s, !wantsAll && s === status))}
        {tab("All Steps", "all", wantsAll)}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-ink-2">Period:</span>
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/admin/buyers-sellers/trend?status=${wantsAll ? "all" : status}&period=${p}`}
            className={
              "rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors " +
              (p === period
                ? "border-magenta text-magenta"
                : "border-line text-ink-2 hover:border-magenta")
            }
          >
            {p === "day" ? "Daily" : p === "week" ? "Weekly" : "Monthly"}
          </Link>
        ))}
      </div>

      <div className="mt-5 space-y-8">
        {series.map((s) => (
          <section key={s.status}>
            <h2 className="mb-2 font-display text-[18px] font-bold text-ink">
              {s.status}{" "}
              <span className="font-body text-[13px] font-normal text-ink-2">
                — {s.total} total
              </span>
            </h2>
            <StatusTrendChart series={s} />
            <p className="mt-2 text-[12px] text-ink-2">
              Read from {s.sources.join(" + ")}.
            </p>
          </section>
        ))}
      </div>

      {/*
        ⚠ THE CAVEAT BELONGS ON THE PAGE, not only in the source. Somebody
        reading a chart will act on it, and these three facts change what it
        means.
      */}
      <div className="mt-8 rounded-brand border border-line bg-white p-4">
        <p className="text-[13px] font-bold text-ink">How to read this</p>
        <ul className="mt-2 space-y-1 text-[12.5px] leading-relaxed text-ink-2">
          <li>
            · These are <b>state timestamps, not events</b> — there is no event
            log in this schema and one was deliberately not added.
          </li>
          <li>
            · The four series are <b>cumulative by nature, not exclusive</b>.
            Somebody Validated today also has a created date, so they appear in
            Created too.
          </li>
          <li>
            · <b>Moving backwards is invisible.</b> A column holds the current
            state, so a reset or a reversal leaves no trace here.
          </li>
          <li>
            · <b>Validated reads zero on the buyer side</b> until an admin sets
            it — there is still no buyer validation mechanism, by design
            (E269/E269b).
          </li>
        </ul>
      </div>
    </div>
  );
}


/**
 * ONE JOB, THIRTEEN WEEKS (`P1-A1.5-E456` WS-7).
 *
 * ⚠⚠ NO CHART LIBRARY AND NO NEW CHART. `package.json` carries no recharts /
 * chart.js / d3 / visx / nivo, and the brief forbids adding one for thirteen
 * rectangles. This reuses `StatusTrendChart` — its axes, its tick-stride rule,
 * its inward-anchored end labels, its `role="img"` summary and its readable
 * table — through the `variant="bar"` opt-in, and reuses `onboarding-trend.ts`'s
 * Monday-start week rule so two charts cannot disagree about the same fortnight.
 *
 * ⚠ COUNTED ON `Person.created_at`, the only timestamp every row reliably
 * carries. A job flag has no timestamp of its own, so this is **people who hold
 * this job today, by when they joined** — not when they acquired the job. That
 * is stated on the page rather than buried here.
 *
 * ⚠⚠ EXPECT IT LUMPY AND DO NOT SMOOTH IT. Most of these rows were seeded in a
 * few bursts, so most weeks are legitimately zero. A chart that looks plausible
 * because it was smoothed is worse than an ugly honest one.
 */
async function JobTrend({ tile }: { tile: (typeof JOB_TILES)[number] }) {
  const people = await prisma.person.findMany({
    select: {
      created_at: true,
      is_service_provider: true,
      is_service_coordinator: true,
      is_support: true,
      requesterProfile: { select: { id: true } },
      buyerProfile: { select: { id: true } },
      user: { select: { is_system_admin: true } },
    },
  });

  const mine = people.filter((p) => {
    const admin: AdminFlags = {
      isSystemAdmin: p.user?.is_system_admin ?? false,
      isSupport: p.is_support,
    };
    return holdsJob(tile.key, p, admin);
  });

  const { points, total, inWindow } = weeklyJoins(mine.map((p) => p.created_at));

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* ⚠ SAME `BackLink` AS `E455`/`E460` — one component, or they diverge. */}
      <BackLink href="/admin/buyers-sellers" label="Users" />
      <h1 className="mt-1 font-display text-[26px] font-bold text-ink">
        {tile.label}
      </h1>
      <p className="mt-1 text-[14px] text-ink-2">
        {total} {total === 1 ? "person holds" : "people hold"} this job.{" "}
        {inWindow} joined in the last 13 weeks.
      </p>

      <div className="mt-5">
        <StatusTrendChart
          variant="bar"
          verb="joining"
          series={{
            status: tile.label,
            period: "week",
            points,
            /* ⚠ THE CHART'S EMPTY STATE KEYS OFF `total`, so this is the count
               IN THE WINDOW, not the all-time count. 139 providers who all
               joined 6 months ago must render "none joined in this period"
               rather than 13 empty bars under a total of 139. */
            total: inWindow,
            sources: ["Person.created_at"],
            missing: [],
          }}
        />
      </div>

      <p className="mt-3 text-[12.5px] text-ink-2">
        ⚠ Counted on <code>Person.created_at</code> — the only timestamp every
        row reliably carries. A job flag has no timestamp of its own, so this is
        <b> people who hold this job today, by when they joined</b>, not when
        they acquired the job. ⚠ Weeks start Monday, the same rule{" "}
        <code>onboarding-trend.ts</code> uses for the status view. ⚠ Most of this
        population was seeded in a few bursts, so empty weeks are real and are
        not smoothed.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {JOB_TILES.map((t) => (
          <Link
            key={t.key}
            href={`/admin/buyers-sellers/trend?job=${t.key}`}
            className={
              "rounded-full border-[1.5px] px-4 py-1.5 text-[13.5px] font-bold transition-colors " +
              (t.key === tile.key
                ? "border-magenta bg-magenta text-white"
                : "border-line text-ink hover:border-magenta")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
