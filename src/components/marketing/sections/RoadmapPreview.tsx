import Link from "next/link";
import { ROADMAP_COPY, HOME_TEASER } from "@/lib/brand";

/**
 * "…and then here's the plan" — the roadmap preview (WS-1).
 *
 * Sits directly after the assessment, because a maturity score on its own is a
 * diagnosis without a treatment: the reader's very next thought is "so what do
 * I do about it", and a page that does not answer it there loses them.
 *
 * ⚠ ILLUSTRATIVE, AND IT SAYS SO ON THE PAGE. The AIM roadmap tool is a later
 * brief. This is the SHAPE of what an assessment turns into — four phases with
 * example work in them — not a plan anybody's data produced. The caption under
 * the timeline states that plainly rather than hiding it in a tooltip, because
 * a reader who assumes this is generated and later finds out it is not has been
 * misled by us, not by their own optimism.
 *
 * IT CLOSES ON TALENT, like every value block on this page. The home's job is
 * to hand a warmed-up buyer to Hire Talent; a section that ends on its own
 * argument is a dead end on a funnel page.
 */
export function RoadmapPreview() {
  return (
    <section className="border-t border-line bg-white py-16">
      <div className="mx-auto max-w-[1120px] px-7">
        <p className="mb-3 font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-magenta">
          {ROADMAP_COPY.eyebrow}
        </p>
        <h2 className="max-w-[620px] text-balance text-[30px] font-semibold leading-[1.1] sm:text-[36px]">
          {ROADMAP_COPY.headline}
        </h2>
        <p className="mt-4 max-w-[640px] text-[16.5px] leading-relaxed text-[#3a4266]">
          {ROADMAP_COPY.lead}
        </p>

        <ol className="mt-9 grid gap-4 lg:grid-cols-4">
          {ROADMAP_COPY.steps.map((s, i) => (
            <li
              key={s.title}
              className="relative rounded-[16px] border border-line bg-canvas p-6"
            >
              {/* The connector, desktop only — decoration, so aria-hidden. */}
              {i < ROADMAP_COPY.steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute right-[-10px] top-1/2 hidden h-px w-5 bg-line lg:block"
                />
              )}
              <p className="font-display text-[11.5px] font-semibold uppercase tracking-[0.14em] text-magenta">
                {s.phase}
              </p>
              <h3 className="mt-2 text-[17px] font-bold">{s.title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#3a4266]">
                {s.body}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-[13px] text-[#6b7191]">{ROADMAP_COPY.note}</p>

        <p className="mt-8 text-[17px] font-semibold text-ink">
          {HOME_TEASER.close}{" "}
          <Link
            href="/hire-talent"
            className="text-magenta underline underline-offset-4 hover:text-magenta-dark"
          >
            {HOME_TEASER.closeCta} →
          </Link>
        </p>
      </div>
    </section>
  );
}
