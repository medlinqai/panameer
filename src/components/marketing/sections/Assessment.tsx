import Link from "next/link";
import { ASSESSMENT_COPY } from "@/lib/brand";
import {
  ASSESSMENT_AREAS,
  MATURITY_STAGES,
  type ProcessArea,
} from "@/lib/assessment-data";
import { AssessmentTabs } from "@/components/marketing/AssessmentTabs";

/**
 * "Assess Your Adoption by Capability Domain" (buyer §7).
 *
 * A SERVER COMPONENT that renders one client island. The header, the CTA and
 * all four panels — forty domain rows, sixteen KPI tiles, four maturity bars —
 * are built here and passed to <AssessmentTabs> as props, so they are in the
 * prerendered HTML and out of the client bundle.
 *
 * ── WHAT IS REAL AND WHAT IS NOT ─────────────────────────────────────────────
 *
 * ⚠ NOTHING HERE MEASURES ANYTHING. There is no assessment engine, no scoring,
 * no customer data. This section sells the SHAPE of a diagnostic: these are the
 * domains we would look at, this is the read you would get. Three things keep
 * that honest rather than implied:
 *
 *   · The dashboard is labelled "Sample Read", not "● Live". The mockup shows a
 *     green Live pill, and on invented numbers that is the one element that
 *     would actively lie — it says "this is your data, now". Changed
 *     deliberately; it is the only place this section departs from the mockup.
 *   · A caption under the tiles says the figures are illustrative, keyed off
 *     `area.sample` so it disappears on its own when real data arrives.
 *   · The checklist ticks are `aria-hidden` decoration with no checkbox
 *     semantics — nobody can mistake them for something they have completed.
 *
 * ⚠ AND THE CTA PROMISES MORE THAN EXISTS. "Sign in to run your assessment" is
 * the brief's approved copy and the funnel entry, and it routes to a real
 * sign-in — but there is no assessment behind that login yet. Flagged rather
 * than silently shipped: either the assessment gets built before this page goes
 * live, or that sub-label needs to become "Sign in to be first in line".
 */

function Panel({ area }: { area: ProcessArea }) {
  return (
    <div className="mt-9 grid items-start gap-10 lg:grid-cols-[1fr_1.12fr]">
      {/* Left: the capability-domain checklist. */}
      <div>
        <h3 className="mb-4 text-[23px]">{area.name} Capability Domains</h3>
        <ul>
          {area.domains.map((d) => (
            <li
              key={d}
              className="flex items-center gap-3 py-[7px] text-[15px] text-ink"
            >
              <span
                aria-hidden
                className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-magenta text-[12px] text-white"
              >
                ✓
              </span>
              {d}
            </li>
          ))}
        </ul>
      </div>

      {/* Right: the maturity dashboard. */}
      <div className="rounded-[18px] bg-ink p-6 text-white shadow-[0_22px_50px_rgba(23,30,62,0.28)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a7a3c6]">
              AI Maturity Dashboard
            </p>
            <p className="mt-0.5 font-display text-[18px] font-semibold">
              {area.name}
            </p>
          </div>
          {area.sample && (
            <span className="self-center whitespace-nowrap rounded-full border border-white/25 px-2.5 py-[3px] text-[11px] text-[#cdc9e6]">
              Sample Read
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {area.tiles.map((tile) => (
            <div
              key={tile.label}
              className="rounded-[12px] border border-white/[0.08] bg-white/5 p-4"
            >
              <p className="font-display text-[26px] font-bold">{tile.value}</p>
              <p className="mt-0.5 text-[12px] text-[#a7a3c6]">{tile.label}</p>
              <p className="mt-2 text-[11px] text-[#7CF5C0]">{tile.delta}</p>
            </div>
          ))}
        </div>

        <div className="mt-3.5 rounded-[12px] border border-white/[0.08] bg-white/5 px-[18px] py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-[14px] font-semibold">
              AI Maturity Score
            </span>
            <span className="font-display text-[20px] font-bold text-magenta">
              {area.score} / 100
            </span>
          </div>
          {/*
            A meter, not a bar: `role="progressbar"` with the value on it, so a
            screen reader gets the number rather than a decorative div.
          */}
          <div
            role="progressbar"
            aria-valuenow={area.score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${area.name} AI maturity score`}
            className="mb-2 h-2 overflow-hidden rounded-[5px] bg-white/[0.12]"
          >
            <span
              className="block h-full rounded-[5px] bg-magenta"
              style={{ width: `${area.score}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#8f8caa]">
            {MATURITY_STAGES.map((stage, i) => (
              <span
                key={stage}
                className={i === area.stage ? "font-display text-magenta" : ""}
              >
                {stage}
                {i === area.stage && <span aria-hidden> ▲</span>}
              </span>
            ))}
          </div>
        </div>

        {area.sample && (
          <p className="mt-3 text-[11.5px] leading-relaxed text-[#8f8caa]">
            Illustrative figures — they show the read a completed assessment
            produces, not your organisation&apos;s data.
          </p>
        )}
      </div>
    </div>
  );
}

export function Assessment() {
  return (
    <section id="assessment" className="border-t border-line bg-white py-16">
      <div className="mx-auto max-w-[1120px] px-7">
        <div className="grid items-start gap-9 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="mb-3 font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-magenta">
              {ASSESSMENT_COPY.eyebrow}
            </p>
            <h2 className="text-[30px] font-semibold leading-[1.1] sm:text-[36px]">
              {ASSESSMENT_COPY.headline}
            </h2>
          </div>

          <div className="pt-1.5">
            <p className="mb-[18px] text-[16px] text-[#3a4266]">
              <strong className="text-ink">{ASSESSMENT_COPY.leadStrong}</strong>{" "}
              {ASSESSMENT_COPY.lead}
            </p>
            {/*
              The funnel entry. A real sign-in with a callback back to this
              section, so someone who signs in returns to what they were reading
              rather than being dropped on a dashboard with no context.
            */}
            <Link
              href={`/login?callbackUrl=${encodeURIComponent("/#assessment")}`}
              className="inline-block rounded-[14px] bg-magenta px-[26px] py-3.5 text-left font-display text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(215,44,214,0.28)] transition-colors hover:bg-magenta-dark"
            >
              {ASSESSMENT_COPY.cta}
              <span className="mt-0.5 block font-body text-[11.5px] font-normal opacity-90">
                {ASSESSMENT_COPY.ctaSub}
              </span>
            </Link>
          </div>
        </div>

        <AssessmentTabs
          tabs={ASSESSMENT_AREAS.map((a) => ({
            key: a.key,
            label: a.name,
            glyph: a.glyph,
          }))}
          panels={ASSESSMENT_AREAS.map((a) => (
            <Panel key={a.key} area={a} />
          ))}
        />
      </div>
    </section>
  );
}
