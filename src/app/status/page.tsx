import Link from "next/link";
import { headers } from "next/headers";
import { isStatusHost } from "@/lib/host";
import { formatInstant, todayInSiteZone } from "@/lib/work-tracker/public-time";
import { redirect } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { BuildLine } from "@/components/status/BuildLine";
import { planBuildLine } from "@/lib/plan/build-line";
import { PlanView } from "@/components/plan/PlanView";
import { prisma } from "@/lib/prisma";
import { getPanameerPlan } from "@/lib/plan/store";
import { publicPlan, releaseProgressByCode } from "@/lib/plan/public";
import { phaseCard } from "@/lib/plan/status-card";
import { StatusPhaseCard } from "@/components/status/StatusPhaseCard";
import { firstReleasedAt } from "@/lib/plan/model";
import { releasedSupportCounts } from "@/lib/support-released";
import { getPublicTracker } from "@/lib/work-tracker/public-view";
import { getSessionViewer } from "@/lib/session";
import {
  FOLLOWER_COUNT_FLOOR,
  follow as applyFollow,
  followerCount,
  isFollowing,
} from "@/lib/work-tracker/followers";
import { FollowButton } from "@/components/status/FollowButton";
import { ROUTES } from "@/lib/routes";

export const revalidate = 60;

export const metadata = {
  title: "Panameer Work Tracker",
  description: "Daily progress on the Panameer build, from first idea to public beta.",
};

const HEAD = "font-body font-extrabold tracking-[-0.03em]";

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ follow?: string }>;
}) {
  const t = await getPublicTracker();
  const viewer = await getSessionViewer();

  const { follow: followIntent } = await searchParams;
  if (viewer && followIntent === "1") {
    await applyFollow(viewer);
    const host =
      (await headers()).get("x-forwarded-host") ?? (await headers()).get("host");
    redirect(isStatusHost(host) ? "/" : "/status");
  }

  const [following, followers] = await Promise.all([isFollowing(viewer), followerCount()]);

  const todayIso = todayInSiteZone();
  const [plan, releaseIds] = await Promise.all([
    getPanameerPlan(),
    prisma.workTrackerRelease.findMany({ select: { id: true, code: true } }),
  ]);
  const planRows = plan?.rows ?? [];
  const pv = publicPlan(
    { title: plan?.plan.title ?? "Panameer build" },
    planRows,
    new Date(`${todayIso}T12:00:00Z`),
  );
  // RELEASE PERCENTAGES NOW COME FROM THE PLAN, KEYED BY CODE. A release's
  const planReleasePercent = releaseProgressByCode(planRows, releaseIds);
  /* `E806`'s journey list left with the Releases section (`E807`); the helper
     stays in `public.ts`, gated by check:plan, for the release heading to use
     if Scott wants the list back. */
  // THE SECONDARY FIGURES COME FROM THE PLAN TOO
  /** The Build Line's two inputs, from the plan's top-level rows. */
  const line = planBuildLine(planRows);
  /* Released work: the plan's own Deploy ◆ marked Done (`E810`). `null` until
     one is, which hides the support block rather than showing a zero. */
  const releasedAt = firstReleasedAt(planRows);
  const releasedSupport = releasedAt ? await releasedSupportCounts(releasedAt) : null;
  // THE MOVING COUNT COMES FROM `readiness()` NOW , not from a second
  // The CURRENT PHASE section it fed left this page with ; the plan's own
  // hero. Quoted rather than deleted , and `t.gates` itself is
  const rel = t.currentRelease;
  // The hero shows the RELEASE's percentage when there is one, and the whole
  // THE HERO IS THE R1 RELEASE ROW'S OWN PERCENTAGE .
  const releaseRow =
    pv.rows.find((r) => r.type === "release" && r.status === "In progress") ??
    pv.rows.find((r) => r.type === "release") ??
    null;
  const heroPercent =
    releaseRow?.progress?.percent ??
    (rel?.code && planReleasePercent[rel.code]
      ? planReleasePercent[rel.code].percent
      : pv.progress.percent);
  // TWO KINDS OF VALUE, TWO RULES — see `public-time.ts`.
  const card = phaseCard(pv.rows, todayIso);
  const updated = formatInstant(t.generatedAt);

  return (
    <div className="bg-surface">
      <MarketingHeader />

      {/* ── HERO (ink band) ─────────────────────────────────────────────── */}
      {/* THE BANDS ARE PINNED DARK IN BOTH SCHEMES (Scott, 2026-10-02) */}
      <section className="bg-rail px-5 py-12 text-white sm:px-8">
      {/* TWO COLUMNS AT ≥900px (Scott, walking the page 2026-10-02) */}
      <div className="mx-auto grid max-w-[1040px] gap-x-10 gap-y-8 min-[900px]:grid-cols-[1fr_400px] min-[900px]:items-start">
        {/* THE COPY COLUMN IS THE SIZING CONTAINER . See the */}
        <div className="@container">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/70">
            {/* 2026-10-02: *"no NaN, no invented date"*). The clause disappears */}
            Work Tracker · Building in the open
            {t.dayNumber !== null && <> · Day {t.dayNumber}</>}
          </p>
          {/* The page reports on ONE build — ours. *"Your platform"* addressed a */}
          {/* THE HEADLINE HOLDS ONE LINE */}
          <h1
            className={`mt-2 leading-[1.02] text-[clamp(34px,7.2cqw,52px)] ${HEAD}`}
          >
            Watch Panameer <em className="not-italic text-magenta">get built!</em>
          </h1>
          {/* REPLACED WHOLESALE . The old lede sold the tracker as a */}
          {/* THE SUBLINE SAYS WHY THIS PAGE IS PUBLIC AT ALL  */}
          <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-white/80">
            We&apos;re eating our own cooking — this is the project tracker you&apos;ll use on your
            Panameer work orders, and we&apos;re using it to build Panameer.
          </p>

          <p className="mt-7 flex flex-wrap items-center gap-4">
            <FollowButton signedIn={viewer !== null} initiallyFollowing={following} testId="follow-hero" />
            {/* THE COUNT IS HIDDEN BELOW 25 (the brief), not shown small. "3 */}
            {followers >= FOLLOWER_COUNT_FLOOR && (
              <span className="text-[14px] text-white/75">
                {followers} people following the build
              </span>
            )}
          </p>
        </div>

        {/* THE FIGURE, AT THE MOCKUP'S SCALE */}
        <StatusPhaseCard
          card={card}
          releaseLabel={rel ? `${rel.code ? `${rel.code} — ` : ""}${rel.name}` : null}
          releaseCode={rel?.code ?? null}
          releasePercent={heroPercent}
          planPercent={pv.progress.percent}
          counts={pv.progress}
          updated={updated}
        />
      </div>
      </section>

      <div className="mx-auto max-w-[1040px] px-5 sm:px-8">
        {/* THE PLAN REPLACES THE AIM PHASES, STAGES AND JOURNEYS */}
        {/* ORDER, AS SCOTT ASKED: Build Line on top → the plan's timeline */}
        {line.phases.length > 0 && (
          <BuildLine phases={line.phases} releases={line.releases} now={Date.parse(`${todayIso}T12:00:00Z`)} />
        )}
        <PlanView plan={pv} today={todayIso} />

        {/* THE SEPARATE RELEASES SECTION IS GONE (Scott, 2026-10-03, ). */}
        {/* TAKE A LOOK */}
        <section className="mt-12 border-t border-line pt-6">
          <h2 className={`text-[24px] text-ink ${HEAD}`}>Take a Look</h2>
          <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
            Everything is being built in the open. See what is being built and when above, then go
            check it out today.
          </p>
          <p className="mt-4">
            {/* The door changes with the visitor: a member already has an
                account, so "Register Free" would be a dead end for them. */}
            {viewer ? (
              <Link href="/dashboard" className={SQUARE_DARK}>
                Go to the App
              </Link>
            ) : (
              <Link href="/join" className={SQUARE_DARK}>
                Register for Free
              </Link>
            )}
          </p>
        </section>

        {/* SUPPORT, ONLY FOR RELEASED WORK */}
        {releasedAt && releasedSupport && (
        <section className="mt-12 border-t border-line pt-6">
          <h2 className={`text-[24px] text-ink ${HEAD}`}>
            Found a problem in a released feature? Tell us.
          </h2>
          <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
            Issues from testers and users, and how fast they close. What you write in a ticket stays
            private.
          </p>
          {/* TWO NUMBERS ONLY (Scott, final): Open and Resolved this week. */}
          <p className="mt-4 text-[15px] text-ink-2">
            {/* Released work only — see `support-released.ts` for the rule and
                for what it cannot yet do. */}
            <span className={`text-[30px] text-ink ${HEAD}`}>{releasedSupport.open}</span> open
            <span className="mx-3 text-ink-3">·</span>
            <span className={`text-[30px] text-ink ${HEAD}`}>
              {releasedSupport.resolvedThisWeek}
            </span>{" "}
            resolved this week
          </p>
          <p className="mt-4 flex flex-wrap gap-3">
            <Link href={ROUTES.reportProblem} className={SQUARE_DARK}>
              Report an Issue
            </Link>
            <Link href="/support/tickets" className={SQUARE_LIGHT}>
              See Your Tickets
            </Link>
          </p>
        </section>
        )}
      </div>

      {/* THE CLOSE BAND IS GONE, AND A PLAIN FOOTER TAKES ITS PLACE */}
      <footer className="mt-16 border-t border-line px-5 py-7 sm:px-8">
        <p className="mx-auto flex max-w-[1040px] flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
          <span>© {new Date(t.generatedAt).getFullYear()} Panameer Inc</span>
          <span aria-hidden className="text-ink-3">·</span>
          {/* The marketing root, not `app.` — a public page points at the public */}
          <a href="https://panameer.com" className="text-ink-2 underline underline-offset-4 hover:text-magenta">
            panameer.com
          </a>
          <span aria-hidden className="text-ink-3">·</span>
          <Link href={ROUTES.reportProblem} className="text-ink-2 underline underline-offset-4 hover:text-magenta">
            Report an issue
          </Link>
        </p>
      </footer>
    </div>
  );
}

const SQUARE_DARK =
  "inline-flex min-h-[44px] items-center bg-ink px-5 text-[14px] font-bold text-surface transition-opacity hover:opacity-85";
const SQUARE_LIGHT =
  "inline-flex min-h-[44px] items-center border border-ink bg-surface px-5 text-[14px] font-bold text-ink transition-colors hover:bg-ink/5";

/** FOUR SEGMENTS. `filled` is how many are ink; the one after them is magenta */
// It drew the four-segment stage bar for a journey cell and for the current
