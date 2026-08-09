import { GO_DIRECT } from "@/lib/brand";
import { SectionHead } from "@/components/marketing/sections/SectionHead";

/**
 * "Stop Being the Marked-Up Resource" + the Bionic Consultant (seller §5).
 *
 * The mirror of the buyer page's three-ways: same critique of the same model,
 * from the other side of it. The buyer is told they pay 2–3× for the pyramid;
 * the seller is told they ARE the marked-up resource in it.
 *
 * ⚠ THE BIONIC PANEL SAYS "BRING YOUR AI", NOT "WE GIVE YOU AI", and that
 * distinction is the whole reason it is worded carefully. Panameer does not
 * supply the consultant with a model, an agent or a toolchain. What it offers
 * is help packaging and LABELLING services the consultant already delivers with
 * their own AI. Claiming the platform makes them bionic would be a product
 * promise nothing behind this page can keep.
 */
export function GoDirectBionic() {
  return (
    <section id="go-direct" className="bg-ink py-16 text-white">
      <div className="mx-auto max-w-[1120px] px-7">
        <SectionHead
          eyebrow={GO_DIRECT.eyebrow}
          headline={GO_DIRECT.headline}
          tone="dark"
        />

        <div className="mt-[34px] grid items-stretch gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-[16px] border border-white/10 bg-white/5 p-[30px]">
            <h3 className="mb-3 text-[24px] text-white">{GO_DIRECT.main.title}</h3>
            <p className="mb-3.5 text-[15px] text-[#c7c4de]">{GO_DIRECT.main.body}</p>
            <ul>
              {GO_DIRECT.main.points.map((pt) => (
                <li
                  key={pt}
                  className="relative border-t border-white/[0.08] py-2 pl-[26px] text-[14.5px] text-[#e4e1f2]"
                >
                  <span aria-hidden className="absolute left-0 font-bold text-magenta">
                    ✓
                  </span>
                  {pt}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center rounded-[16px] bg-[linear-gradient(150deg,#3a1c53,#6d2c8e)] p-[30px]">
            <p className="mb-2.5 font-display text-[12px] font-bold uppercase tracking-[0.14em] text-[#f0a6ef]">
              {GO_DIRECT.bionic.tag}
            </p>
            <h3 className="mb-3 text-[24px] leading-[1.15] text-white sm:text-[26px]">
              {GO_DIRECT.bionic.title}
            </h3>
            <p className="text-[15px] text-[#e9d6f2]">{GO_DIRECT.bionic.body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
