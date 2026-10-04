import { PAGE_BEATS } from "@/lib/brand";
import { SectionCta, type CtaVariant } from "@/components/marketing/SectionCta";

export function FourBeats({
  page,
  cta,
}: {
  page: keyof typeof PAGE_BEATS;
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
