import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PROVIDER_ROAD, ROAD_PHASES } from "@/lib/user-levels";
import { ROAD_FAQ } from "@/content/road-faq";

export const metadata = { title: "Questions About the Road · Panameer" };

// RD-E006: FAQ per provider-road stop (#<step-key>), each with Ask Us → a support ticket tagged with that step.
export default function RoadFaqPage() {
  return (
    <main className="min-h-screen bg-surface px-4 py-10 text-ink">
      <div className="mx-auto w-full max-w-[860px]" data-road-faq>
        <Logo />
        <p className="mt-10 text-[11px] font-bold uppercase tracking-[0.14em] text-magenta">Help · For Providers</p>
        <h1 className="mt-1.5 text-[34px] font-extrabold leading-[1.1]">Questions About the Road</h1>
        <p className="mt-2 text-[15px] text-ink-2">Short answers for each of the eight stops. Still stuck? Ask us and we&apos;ll reply on a support ticket.</p>
        <nav aria-label="Stops" className="mt-5 flex flex-wrap gap-2">
          {PROVIDER_ROAD.map((s, i) => (
            <a key={s.key} href={`#${s.key}`} className="border border-line px-3 py-1.5 text-[13px] font-semibold hover:border-ink">{i + 1} · {s.step}</a>
          ))}
        </nav>
        {PROVIDER_ROAD.map((s, i) => (
          <section key={s.key} id={s.key} data-faq-step={s.key} className="mt-8 scroll-mt-6 border-t border-line pt-5">
            <p className="text-[11px] font-extrabold tracking-[0.12em]" style={{ color: ROAD_PHASES[s.phase ?? "join"].color }}>
              STOP {i + 1} · {ROAD_PHASES[s.phase ?? "join"].label.toUpperCase()}
            </p>
            <h2 className="mt-1 text-[22px] font-bold">{s.step}</h2>
            <dl className="mt-3 space-y-3">
              {(ROAD_FAQ[s.key] ?? []).map((f) => (
                <div key={f.q}>
                  <dt className="text-[15px] font-bold">{f.q}</dt>
                  <dd className="mt-0.5 text-[14.5px] leading-relaxed text-ink-2">{f.a}</dd>
                </div>
              ))}
            </dl>
            <Link href={`/support/bug?step=${s.key}`} data-ask-us className="mt-4 inline-flex min-h-[44px] items-center border border-ink px-5 text-[14px] font-bold hover:bg-surface-hover">Ask Us</Link>
          </section>
        ))}
        <p className="mt-10 text-[14px]">
          <Link href="/join/provider/road" className="font-bold text-magenta-dark underline underline-offset-4">‹ The Detailed Road</Link>
        </p>
      </div>
    </main>
  );
}
