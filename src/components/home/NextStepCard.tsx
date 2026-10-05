import Link from "next/link";
import type { FirstPage } from "@/lib/next-step";

// First page (mockup first_page_next_step 2026-10-05): greeting, "Your next step" + "Why you landed here first", "Then".
export function NextStepCard({ page }: { page: FirstPage }) {
  const { greeting, card, then } = page;
  return (
    <section data-testid="next-step" data-rule={card.rule} className="mb-8 font-body text-ink">
      <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-ink-2">{greeting.eyebrow}</p>
      <h1 className="mt-1.5 text-[23px] font-extrabold leading-tight sm:text-[30px]">
        {greeting.short ? (
          <>
            <span className="sm:hidden">{greeting.short}</span>
            <span className="hidden sm:inline">{greeting.title}</span>
          </>
        ) : (
          greeting.title
        )}
      </h1>
      <p className="mt-1.5 hidden text-[15px] text-ink-2 sm:block">Here&apos;s the best place to start.</p>

      <div className="mt-6 grid border border-ink md:grid-cols-[1fr_300px]">
        <div className="p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-magenta">Your next step</p>
          <h2 data-next-title className="mt-1.5 text-[20px] font-extrabold leading-snug sm:text-[24px]">{card.title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{card.line}</p>
          <Link
            href={card.cta.href}
            className="mt-[18px] block bg-ink px-[22px] py-[13px] text-center text-[15px] font-bold text-surface hover:bg-ink-hover sm:inline-block"
          >
            {card.cta.label}
          </Link>
        </div>
        <div data-next-why className="border-t border-line bg-bg-soft p-5 sm:p-6 md:border-l md:border-t-0">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.12em]">Why you landed here first</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed">{card.why}</p>
          {card.ticks.length > 0 && (
            <ul className="mt-2 text-[13px] leading-relaxed text-ink-2">
              {card.ticks.map((t) => (
                <li key={t.label} data-done={t.done}>
                  <span aria-hidden className="mr-1.5 text-ink">{t.done ? "✓" : "·"}</span>
                  {t.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {then.length > 0 && (
        <div data-next-then className="mt-6">
          <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Then</h3>
          <div className="border-t border-line">
            {then.map((r) => (
              <div key={r.title} className="flex items-center justify-between gap-4 border-b border-line px-0.5 py-3.5">
                <div className="min-w-0">
                  <b className="text-[15px]">{r.title}</b>
                  <span className="mt-0.5 block text-[13px] text-ink-2">{r.line}</span>
                </div>
                <Link href={r.href} className="whitespace-nowrap text-[13.5px] font-bold underline underline-offset-[3px]">
                  {r.link}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
