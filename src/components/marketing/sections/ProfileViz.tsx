import { PROFILE_VIZ_COPY } from "@/lib/brand";

/**
 * "Bring your résumé alive" — the weighted-skills profile visual (WS-3).
 *
 * This is where a provider sees what their profile BECOMES. The pitch on this
 * page is "go direct, be your own brand"; the obvious next question is what
 * that brand looks like when a buyer sees it, and until now the page never
 * answered it.
 *
 * ── WHAT IT IS SHOWING ───────────────────────────────────────────────────────
 *
 * The real model: each job in a résumé is read for the system it ran on and the
 * modules used on it, and the profile is the weighted rollup — cumulative time
 * per skill, decayed by how recently it was used, plus a centre of gravity
 * across suites. So a bar is not "how good you say you are", it is how long you
 * actually did it and how recently. That is worth showing precisely because it
 * is the opposite of a self-scored checklist.
 *
 * ⚠ EXAMPLE FIGURES. The parser and the weighting are built; the numbers below
 * are an illustrative profile, not anybody's. The caption says so, in the same
 * place the numbers are, for the same reason the maturity dashboard does.
 *
 * Static markup — the bars are divs with a width, no chart library and no
 * client JS, so /for-providers stays prerendered.
 */

/** An example rollup, in the shape the real one produces. */
const EXAMPLE_SKILLS = [
  { name: "General Ledger", suite: "Oracle Cloud", years: "8 yrs", recent: "current", pct: 100 },
  { name: "Payables", suite: "Oracle Cloud", years: "8 yrs", recent: "current", pct: 94 },
  { name: "Self-Service Procurement", suite: "Oracle Cloud", years: "5 yrs", recent: "2024", pct: 61 },
  { name: "iProcurement", suite: "Oracle EBS", years: "6 yrs", recent: "2019", pct: 34 },
  { name: "Purchasing", suite: "Oracle EBS", years: "4 yrs", recent: "2018", pct: 22 },
];

const EXAMPLE_SUITES = [
  { suite: "Oracle Cloud", pct: 78 },
  { suite: "Oracle EBS", pct: 22 },
];

export function ProfileViz() {
  return (
    <section className="border-t border-line bg-canvas py-16">
      <div className="mx-auto max-w-[1120px] px-7">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="mb-3 font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-magenta">
              {PROFILE_VIZ_COPY.eyebrow}
            </p>
            <h2 className="text-balance text-[30px] font-semibold leading-[1.1] sm:text-[36px]">
              {PROFILE_VIZ_COPY.headline}
            </h2>
            <p className="mt-4 max-w-[520px] text-[16.5px] leading-relaxed text-[#3a4266]">
              {PROFILE_VIZ_COPY.lead}
            </p>

            <div className="mt-7 rounded-[14px] border border-line bg-white p-5">
              <p className="font-display text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#6b7191]">
                {PROFILE_VIZ_COPY.centerOfGravity}
              </p>
              <div className="mt-3 space-y-2.5">
                {EXAMPLE_SUITES.map((s) => (
                  <div key={s.suite} className="flex items-center gap-3">
                    <span className="w-[104px] shrink-0 text-[14px] font-semibold text-ink">
                      {s.suite}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                      <span
                        className="block h-full rounded-full bg-magenta"
                        style={{ width: `${s.pct}%` }}
                      />
                    </span>
                    <span className="w-9 shrink-0 text-right font-display text-[13px] font-bold text-magenta">
                      {s.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* The weighted skill bars. */}
          <div className="rounded-[18px] bg-ink p-6 text-white shadow-[0_22px_50px_rgba(23,30,62,0.28)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a7a3c6]">
                  Weighted skills
                </p>
                <p className="mt-0.5 font-display text-[18px] font-semibold">
                  From your work history
                </p>
              </div>
              <span className="self-center whitespace-nowrap rounded-full border border-white/25 px-2.5 py-[3px] text-[11px] text-[#cdc9e6]">
                Example
              </span>
            </div>

            <ul className="space-y-3.5">
              {EXAMPLE_SKILLS.map((s) => (
                <li key={`${s.suite}-${s.name}`}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="truncate text-[14.5px] font-semibold">
                      {s.name}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-[#a7a3c6]">
                      {s.suite} · {s.years} · {s.recent}
                    </span>
                  </div>
                  <span className="block h-2 overflow-hidden rounded-full bg-white/[0.12]">
                    <span
                      className="block h-full rounded-full bg-magenta"
                      style={{ width: `${s.pct}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-[11.5px] leading-relaxed text-[#8f8caa]">
              Depth and recency, not a self-rating — a skill you ran for years and
              used last month outranks one you touched once.
            </p>
          </div>
        </div>

        <p className="mt-6 text-[13px] text-[#6b7191]">
          {PROFILE_VIZ_COPY.note}
        </p>
      </div>
    </section>
  );
}
