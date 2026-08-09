import { VALUE_STACK } from "@/lib/brand";
import { SectionHead } from "@/components/marketing/sections/SectionHead";

/**
 * "What Procurement Gets" (buyer §5) — the six-cell value stack, on ink.
 *
 * THE TWO MONEY CELLS COME FIRST AND ARE THE ONLY ONES IN MAGENTA. Direct
 * pricing and zero-risk-to-connect are the two facts that decide whether a
 * procurement lead keeps reading; the other four are the reassurance that makes
 * it survivable. Ordering and colour do that argument, so neither is decorative
 * — the numbering starting at 01 on the third cell is deliberate for the same
 * reason: the money cells are not steps in a list, they are the headline.
 *
 * `#value` is what the header's "Pricing" link resolves to. There is no pricing
 * PAGE, and this is the section that honestly answers the question.
 */
export function ValueStack() {
  return (
    <section id="value" className="bg-ink py-16 text-white">
      <div className="mx-auto max-w-[1120px] px-7">
        <SectionHead
          eyebrow={VALUE_STACK.eyebrow}
          headline={VALUE_STACK.headline}
          tone="dark"
        />

        <div className="mt-[34px] grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VALUE_STACK.cells.map((cell) => (
            <div
              key={cell.title}
              className={
                "rounded-[14px] px-[18px] py-[22px] " +
                (cell.money
                  ? "border-[1.5px] border-magenta bg-magenta/[0.16]"
                  : "border border-white/10 bg-white/5")
              }
            >
              <span
                aria-hidden
                className="font-display text-[13px] font-bold text-magenta"
              >
                {cell.mark}
              </span>
              <h3 className="mb-2 mt-1.5 text-[17px] font-semibold text-white">
                {cell.title}
              </h3>
              <p className="text-[13.5px] text-[#c7c4de]">{cell.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-[26px] rounded-r-[12px] border-l-4 border-magenta bg-magenta/[0.12] px-5 py-3.5 font-display text-[19px] font-medium text-white">
          {VALUE_STACK.reconcile}
        </p>
      </div>
    </section>
  );
}
