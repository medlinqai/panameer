import { PAGE_BEATS } from "@/lib/brand";
import { SectionCta, type CtaVariant } from "@/components/marketing/SectionCta";

/**
 * LEARN · CONNECT · CREATE · SETTLE — the through-line, per page
 * (brief_public_pages_ia).
 *
 * One component, three readings. The four beats are the same four beats on
 * every page and they mean something different to each audience, so each page
 * passes its key and gets its own version: on the home, "Learn" is the free
 * assessment; on Hire Talent it is seeing an expert's rated past work; on Find
 * Work it is the free training that keeps a profile ranked.
 *
 * ONE COMPONENT RATHER THAN THREE, because the whole point of a through-line is
 * that it reads as the same idea across the three pages. Three separately
 * written versions would drift in tone within a month, which is precisely how a
 * brand line stops being one.
 *
 * VOICE CHECK: every body line is second person and says what YOU get. "You
 * learn where you stand", never "we assess your maturity" — the second
 * describes our activity and leaves the reader to work out the benefit.
 */
export function FourBeats({
  page,
  cta,
}: {
  page: keyof typeof PAGE_BEATS;
  /**
   * WS-2 — the section's exit, on the home.
   *
   * Optional because the two-exits rule is a HOME rule: `/` is a funnel whose
   * only job is to move somebody to the assessment or to the experts, so a
   * section that ends without an ask is a leak. Hire Talent and Find Work have
   * their own closing bands and a CTA under every section there would be four
   * asks stacked on one page.
   */
  cta?: CtaVariant;
}) {
  const copy = PAGE_BEATS[page];

  return (
    <section className="border-t border-line bg-canvas py-16">
      <div className="mx-auto max-w-[1120px] px-7">
        <p className="mb-3 font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-magenta">
          {copy.eyebrow}
        </p>
        <h2 className="max-w-[620px] text-balance text-[30px] font-semibold leading-[1.1] sm:text-[36px]">
          {copy.headline}
        </h2>

        <ol className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {copy.beats.map((b, i) => (
            <li
              key={b.beat}
              className="rounded-[16px] border border-line bg-white p-6"
            >
              <span
                aria-hidden
                className="font-display text-[12px] font-semibold text-[#9aa0b8]"
              >
                0{i + 1}
              </span>
              <h3 className="mt-1 font-display text-[20px] font-bold text-magenta">
                {b.beat}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#3a4266]">
                {b.body}
              </p>
            </li>
          ))}
        </ol>

        {cta && <SectionCta variant={cta} />}
      </div>
    </section>
  );
}
