import { ProgressRing } from "@/components/learn/app/ProgressRing";
import { CoverageRow } from "@/components/learn/app/CoverageRow";
import type { MyLearning } from "@/lib/learn-dashboard";

/**
 * COVERAGE — the piece Scott asked for by name: *"Seeing total learning paths vs
 * the LPs, courses, and lesson i have taken."*
 *
 * ── THE TRIPLE RING IS `ProgressRing` THREE TIMES ────────────────────────────
 *
 * Not a fourth variant. Three instances at one `size` with three `radius` values,
 * stacked absolutely, and the centre text owned by this container — which is why
 * `ProgressRing` takes `radius` and `bare`.
 *
 * ── THE TILE GRID TURNS DEAD SPACE INTO INFORMATION ──────────────────────────
 *
 * One tile per path. Certified fills; in-progress outlines with a proportional
 * fill and its percentage; NOT STARTED CARRIES ITS LESSON COUNT, so the 17 grey
 * squares a new learner sees are still telling them how big each path is.
 *
 * ⚠ 23 IS TODAY'S COUNT, NOT A CONSTANT. Nothing here knows how many paths
 * there are and nothing assumes a number of rows. `check:learn` fails the build
 * if 23, 54 or 522 turn up as a literal in a component.
 *
 * ⚠⚠ SUPERSEDED BY `P1-J3-E045`, quoted rather than deleted: the tiles were a
 * reflowing `grid grid-cols-8 min-[520px]:grid-cols-12` that wrapped onto as
 * many rows as it needed, and this note used to read *"The grid is 12 columns
 * of `minmax(0,1fr)` and reflows"*. Scott asked for ONE row showing what the
 * width fits with an arrow to the rest, so the tiles now live in
 * `CoverageRow.tsx` — a horizontally scrollable row. The tile STATES are
 * unchanged and moved verbatim.
 */
export function CoverageCard({ data }: { data: MyLearning }) {
  const { totals, mine, paths, nextCertificate } = data;
  const pct = totals.lessons > 0 ? Math.round((mine.lessonsCompleted / totals.lessons) * 100) : 0;

  return (
    <div className="grid gap-7 rounded-brand border border-line bg-white p-5 shadow-[0_20px_44px_-28px_rgba(23,30,62,0.45)] sm:p-6 min-[900px]:grid-cols-[296px_1fr]">
      <div className="flex flex-col items-center gap-3.5">
        <div className="relative h-[196px] w-[196px] shrink-0">
          {/* Outer: paths certified. Middle: courses finished. Inner: lessons. */}
          <span className="absolute inset-0">
            <ProgressRing
              value={mine.pathsCertified}
              max={totals.paths}
              size={196}
              radius={86}
              stroke={15}
              color="var(--color-magenta)"
              trackColor="var(--color-line)"
              bare
            />
          </span>
          <span className="absolute inset-0">
            <ProgressRing
              value={mine.coursesFinished}
              max={totals.courses}
              size={196}
              radius={66}
              stroke={15}
              color="#8b1fa8"
              trackColor="var(--color-line)"
              bare
            />
          </span>
          <span className="absolute inset-0">
            <ProgressRing
              value={mine.lessonsCompleted}
              max={totals.lessons}
              size={196}
              radius={46}
              stroke={15}
              color="var(--color-learn-blue)"
              trackColor="var(--color-line)"
              bare
            />
          </span>
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <span>
              <span className="block font-display text-[27px] font-bold leading-none">{pct}%</span>
              <span className="mt-1 block text-[10px] text-ink-2">of all lessons</span>
            </span>
          </span>
        </div>

        <div className="flex w-full flex-col gap-2.5">
          <LegendRow swatch="var(--color-magenta)" name="Learning Paths" state="certified" value={`${mine.pathsCertified} / ${totals.paths}`} />
          <LegendRow swatch="#8b1fa8" name="Courses" state="finished" value={`${mine.coursesFinished} / ${totals.courses}`} />
          <LegendRow swatch="var(--color-learn-blue)" name="Lessons" state="watched" value={`${mine.lessonsCompleted} / ${totals.lessons}`} />
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h4 className="font-display text-[15px] font-bold">Every path on Panameer</h4>
          <span className="text-[11.5px] text-ink-2">
            one tile per learning path — where you stand on all {totals.paths}
          </span>
        </div>

        <CoverageRow paths={paths} />

        <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[linear-gradient(140deg,var(--color-magenta),#8b1fa8)]" />
            Certified
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-[3px] border-2 border-magenta bg-white" />
            In progress
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-[3px] border border-line bg-bg-soft" />
            Not started — number is its lesson count
          </span>
        </div>

        {/*
          THE CLOSING STRIP. Omitted entirely when nothing is enrolled: a "next
          certificate" panel on an account with no enrollments would have to
          invent a target.
        */}
        {/*
          ⚠ IT STACKS BELOW 640px, AND THAT IS A FIX. As a `flex-wrap` row the text
          block was `min-w-0 flex-1` beside a 190px bar and a percentage; inside
          this card's right column at 390px that left the prose about 30px wide and
          it rendered ONE WORD PER LINE. `flex-wrap` does not help when a flex
          child is allowed to shrink to nothing instead of wrapping. Caught in a
          390px screenshot, NOT by a scrollWidth check — nothing overflowed, it
          just became unreadable, which is why the phone screenshots are part of
          the verification and not a nicety.
        */}
        {nextCertificate && (
          <div className="mt-4 flex flex-col items-start gap-3 rounded-[12px] border border-line bg-bg-soft px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-3">
            <div className="min-w-0 sm:flex-1">
              <b className="block font-display text-[13px]">
                Next certificate — {nextCertificate.title}
              </b>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
                {nextCertificate.remaining} lesson{nextCertificate.remaining === 1 ? "" : "s"} and
                the path test to go.
                {nextCertificate.courses > 1 && (
                  <>
                    {" "}
                    {nextCertificate.coursesFinished} of its {nextCertificate.courses} courses{" "}
                    {nextCertificate.coursesFinished === 1 ? "is" : "are"} already done.
                  </>
                )}
              </p>
            </div>
            <span className="h-[7px] w-full overflow-hidden rounded-full bg-line sm:max-w-[190px]">
              <span
                className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-magenta),#8b1fa8)]"
                style={{ width: `${nextCertificate.percent}%` }}
              />
            </span>
            <span className="font-display text-[13px] font-bold text-magenta">
              {nextCertificate.percent}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendRow({
  swatch,
  name,
  state,
  value,
}: {
  swatch: string;
  name: string;
  state: string;
  value: string;
}) {
  return (
    <span className="flex items-center gap-2.5 text-[12px]">
      <i className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: swatch }} />
      {name} <span className="text-[11px] text-ink-2">{state}</span>
      <b className="ml-auto font-display text-[13px]">{value}</b>
    </span>
  );
}
