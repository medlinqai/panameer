import { TWO_PAINS } from "@/lib/brand";
import { SectionHead } from "@/components/marketing/sections/SectionHead";

/**
 * "The Two Hardest Parts of Going Independent — Solved" (seller §2).
 *
 * LEADS THE PAGE BECAUSE THE PAIN DOES. A consultant deciding whether to go
 * independent has exactly two fears — where the next job comes from, and the
 * ceiling on trading hours for money — and every other benefit on this page is
 * downstream of one of them. Naming both before offering anything is what earns
 * the rest of the scroll.
 *
 * Two cards, not four: the pair is the point, and a third would dilute it.
 */
export function TwoPains() {
  return (
    <section id="pains" className="bg-[#f6f4fb] py-16">
      <div className="mx-auto max-w-[1120px] px-7">
        <SectionHead eyebrow={TWO_PAINS.eyebrow} headline={TWO_PAINS.headline} />

        <div className="mt-[34px] grid gap-[18px] md:grid-cols-2">
          {TWO_PAINS.pains.map((pain) => (
            <div
              key={pain.title}
              className="relative overflow-hidden rounded-[18px] border border-line bg-white px-[30px] py-8"
            >
              {/* The corner bloom from the mockup — decorative, magenta at 18%. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(215,44,214,0.18),transparent_65%)]"
              />
              <p className="relative mb-2 font-display text-[24px] font-bold text-ink sm:text-[26px]">
                {pain.title}
              </p>
              <p className="relative text-[15.5px] text-[#3a4266]">{pain.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
