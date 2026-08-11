import { AI_MATCH_COPY } from "@/lib/brand";

/**
 * THE MATCHING ENGINE, described honestly (brief_public_pages_ia WS-2).
 *
 * Lives on Hire Talent rather than the home: it answers "how will you find me
 * the right person", which is a question somebody asks once they have already
 * decided to hire. On the home it would have been an answer to a question the
 * reader had not asked yet.
 *
 * ── WHAT IS TRUE HERE ────────────────────────────────────────────────────────
 *
 * This is the one AI claim on the marketing site with real machinery behind it,
 * and the wording is chosen to claim exactly that and no more. Ranking runs
 * against each expert's dated work history — the systems they ran, how deep,
 * how recently — which is a property of the per-job skill model, not a
 * marketing flourish.
 *
 * WHAT IT DOES NOT SAY: nothing about accuracy, nothing about how many experts,
 * no "instantly", and no number anywhere. Those would all be inventions. The
 * strip describes the MECHANISM, which is the honest thing to sell before
 * there is a track record to point at.
 *
 * Presentational and server-rendered — three static steps, no island.
 */
export function AiMatch() {
  return (
    <section id="ai-match" className="border-t border-line bg-canvas py-16">
      <div className="mx-auto max-w-[1120px] px-7">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <p className="mb-3 font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-magenta">
              {AI_MATCH_COPY.eyebrow}
            </p>
            <h2 className="text-balance text-[30px] font-semibold leading-[1.1] sm:text-[36px]">
              {AI_MATCH_COPY.headline}
            </h2>
            <p className="mt-4 max-w-[540px] text-[16.5px] leading-relaxed text-[#3a4266]">
              {AI_MATCH_COPY.lead}
            </p>
            <p className="mt-4 text-[13.5px] text-[#6b7191]">
              {AI_MATCH_COPY.note}
            </p>
          </div>

          {/*
            The mechanism as three stacked cards rather than a diagram. A
            flow-chart would have needed arrows, a viewBox and a mobile
            fallback to say the same three sentences.
          */}
          <ol className="space-y-3">
            {AI_MATCH_COPY.steps.map((s, i) => (
              <li
                key={s.label}
                className="flex gap-4 rounded-[16px] border border-line bg-white p-5"
              >
                <span
                  aria-hidden
                  className="grid h-8 w-8 flex-none place-items-center rounded-full bg-magenta/10 font-display text-[14px] font-bold text-magenta"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[16.5px] font-bold">{s.label}</h3>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-[#3a4266]">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
