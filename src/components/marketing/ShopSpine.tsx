import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import { SHOP_STEPS, SHOP_SPINE_HEADING } from "@/lib/shop-steps";

export function ShopSpine() {
  return (
    <>
      <section className="border-t border-line bg-white pb-[80px] pt-14 min-[900px]:pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-8">
          <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
            {SHOP_SPINE_HEADING}
          </p>
          {}
        </div>
      </section>
      <StepDisclosures
        steps={SHOP_STEPS.map((step) => ({
          n: step.n,
          summary: step.summary,
          panel: (
            <>
              {}
              <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
                {`Step ${step.n} - ${step.summary}`}
              </p>
              {/* apart on panel type. */}
              <h2 className="stepd-h2">{step.description}</h2>
              {/* NO GRAPHIC, ON PURPOSE, ON ALL FIVE. See the header. */}
            </>
          ),
        }))}
      />
    </>
  );
}
