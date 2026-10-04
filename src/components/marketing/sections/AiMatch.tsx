import { AI_MATCH_COPY } from "@/lib/brand";

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

          {}
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
