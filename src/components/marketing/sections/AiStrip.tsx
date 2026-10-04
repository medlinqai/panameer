import { AI_STRIP } from "@/lib/brand";

export function AiStrip({ audience }: { audience: "buyer" | "provider" }) {
  return (
    <section className="border-y border-line bg-[#faf7ff] py-[22px]">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-5 gap-y-3 px-7">
        <p className="font-display text-[16px] font-semibold text-ink">
          <span aria-hidden className="text-magenta">
            ✦
          </span>{" "}
          Panameer is <b className="text-magenta">AI-native</b>
        </p>
        <ul className="flex flex-wrap gap-2.5">
          {AI_STRIP.tags[audience].map((tag) => (
            <li
              key={tag.text}
              className={
                "rounded-full px-3.5 py-[7px] text-[13px] " +
                (tag.soon
                  ? "border border-magenta bg-[#fbeafb] text-magenta"
                  : "border border-line bg-white text-[#3a4266]")
              }
            >
              {tag.text}
              {tag.soon && (
                <span className="ml-[5px] text-[10px] font-bold uppercase tracking-[0.05em] opacity-85">
                  soon
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
