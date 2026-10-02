import { getPublicTracker } from "@/lib/work-tracker/public-view";

/**
 * `/status` — the public Work Tracker (`P2-ALL-E753`).
 *
 * ⚠⚠ **THIS IS A PLACEHOLDER ON PURPOSE.** Lane D builds the approved mockup
 * (`mockups/tracker_page_2026-10-02.html`) with the real `MarketingHeader`; it
 * waits on Scott's separate go. ⚠ What is here renders the SAME view model lane
 * D will, so the data contract is already proved by the leak test.
 *
 * ⚠ Reached two ways: by path on any host, and by a rewrite from
 * `status.panameer.com/` (`src/proxy.ts`). The path is what makes it walkable
 * locally without a hosts-file entry.
 *
 * ⚠⚠ `revalidate = 60` — the same minute the API uses. The tracker changes a few
 * times a day and the page is meant to be reloaded daily by strangers.
 */
export const revalidate = 60;

export const metadata = {
  title: "Panameer Work Tracker",
  description: "Panameer, being built in the open.",
};

export default async function StatusPage() {
  const t = await getPublicTracker();

  return (
    <main className="mx-auto max-w-[900px] px-5 py-10 sm:px-8">
      <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-magenta">Panameer Work Tracker</p>
      <h1 className="mt-1 font-display text-[30px] font-bold tracking-[-0.4px] text-ink">
        Panameer, being built in the open
      </h1>

      <p className="mt-3 text-[15px] text-ink-2">
        {/* ⚠ A real zero renders as 0; an uncountable figure renders as a dash WITH
            its reason. The two must not look the same. */}
        {t.overallPercent === null ? (
          <>— overall · nothing countable yet</>
        ) : (
          <>
            <span className="font-bold text-ink">{t.overallPercent}%</span> overall · {t.doneCount} of{" "}
            {t.taskCount} done
          </>
        )}
        {t.currentPhase && <> · now in {t.currentPhase}</>}
      </p>

      <section className="mt-8">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Phases</h2>
        <ul className="mt-2 border-t border-line">
          {t.phases.map((p) => (
            <li key={p.name} className="flex flex-wrap items-baseline gap-x-3 border-b border-line py-2.5">
              <span className="font-display text-[16px] font-bold text-ink">{p.name}</span>
              <span className="text-[13px] text-ink-2">
                {p.percent === null ? "— not countable" : `${p.percent}%`}
                {p.start && ` · from ${p.start}`}
                {p.end && ` to ${p.end}`}
              </span>
              {p.current && <span className="text-[12px] font-bold text-magenta">current</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Gates</h2>
        <ul className="mt-2 border-t border-line">
          {t.gates.map((g) => (
            <li key={g.id} className="flex flex-wrap items-baseline gap-x-3 border-b border-line py-2.5">
              <span className="font-bold text-ink">{g.id}</span>
              <span className="text-[14px] text-ink">{g.title}</span>
              <span className="ml-auto text-[13px] text-ink-2">
                {g.answered} of {g.criteriaCount} answered · {g.passed ? "passed" : "open"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {t.currentPhase && (
        <section className="mt-8">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">
            {t.currentPhase} — stages
          </h2>
          <ul className="mt-2 border-t border-line">
            {t.currentPhaseStages.map((s) => (
              <li key={s.name} className="flex flex-wrap items-baseline gap-x-3 border-b border-line py-2.5">
                <span className="text-[14px] text-ink">{s.name}</span>
                <span className="ml-auto text-[13px] text-ink-2">
                  {s.percent === null ? "— not countable" : `${s.percent}%`} · {s.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Shipped</h2>
        {t.shipped.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-2">Nothing published yet.</p>
        ) : (
          <ul className="mt-2 border-t border-line">
            {t.shipped.map((s, i) => (
              <li key={`${s.date}-${i}`} className="border-b border-line py-2.5">
                <span className="text-[13px] text-ink-2">{s.date}</span>
                <span className="ml-3 text-[14px] font-bold text-ink">{s.title}</span>
                {s.body && <span className="mt-0.5 block text-[14px] text-ink-2">{s.body}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 pb-10">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Support</h2>
        {/* ⚠ All three are MEASURED counts and render in ink, including 0. */}
        <p className="mt-2 text-[14px] text-ink-2">
          <span className="font-bold text-ink">{t.support.open}</span> open ·{" "}
          <span className="font-bold text-ink">{t.support.resolved}</span> resolved ·{" "}
          <span className="font-bold text-ink">{t.support.resolvedThisWeek}</span> resolved in the last 7
          days
        </p>
        {/* ⚠⚠ THE DASH CARRIES ITS REASON, and only this one figure needs it.
            A figure that cannot be counted must not look like a measured zero
            (`decisions_2026-09-23.md` §1 rule 2). */}
        <p className="mt-1 text-[13px] text-ink-2">
          Median first reply: — {t.support.medianFirstReplyReason.toLowerCase()}.
        </p>
      </section>
    </main>
  );
}
