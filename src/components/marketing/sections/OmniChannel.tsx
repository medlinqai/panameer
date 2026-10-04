import { OMNI_CHANNEL } from "@/lib/brand";
import { SectionHead } from "@/components/marketing/sections/SectionHead";

export function OmniChannel() {
  return (
    <section id="monetization" className="bg-white py-16">
      <div className="mx-auto max-w-[1120px] px-7">
        <SectionHead
          eyebrow={OMNI_CHANNEL.eyebrow}
          headline={OMNI_CHANNEL.headline}
          lead={OMNI_CHANNEL.lead}
        />

        <ul className="mt-[34px] grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {OMNI_CHANNEL.cards.map((card) => (
            <li
              key={card.title}
              className="rounded-[14px] border border-line bg-white px-4 py-[22px] text-center"
            >
              <span
                aria-hidden
                className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-[12px] bg-[#fbeafb] font-display text-[20px] font-bold text-magenta"
              >
                {card.icon}
              </span>
              <h3 className="mb-1.5 text-[15px] text-ink">{card.title}</h3>
              <p className="text-[12.5px] leading-[1.4] text-[#3a4266]">
                {card.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
