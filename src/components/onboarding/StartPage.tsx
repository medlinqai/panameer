import Link from "next/link";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

// One start page for both user classes (Scott 2026-10-05): headline, lead line, numbered step cards, footer.
export function StartPage({
  headline,
  lead,
  icon,
  cards,
  footnote,
  href,
}: {
  headline: string;
  lead: string;
  icon: "person" | "people";
  cards: { title: string; blurb: string }[];
  footnote: string;
  href: string;
}) {
  const cols = Math.min(cards.length, 3);
  return (
    <OnboardingShell
      onboarding
      footer={
        <>
          <p className="max-w-md text-[14.5px] text-ink-2">{footnote}</p>
          <Link
            href={href}
            className="ml-auto inline-flex justify-center bg-ink px-8 py-3.5 text-[17px] font-semibold text-surface transition-colors hover:bg-ink-hover"
          >
            Get Started Now!
          </Link>
        </>
      }
    >
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-[34px] tracking-[-0.8px] sm:text-[40px]">{headline}</h1>
        <div className="mt-7 flex items-center gap-4">
          <StartIcon kind={icon} />
          <p className="text-[16.5px] leading-relaxed text-ink-2">{lead}</p>
        </div>
        <section
          data-testid="start-cards"
          className="mt-10 grid grid-cols-1 gap-4 sm:[grid-template-columns:var(--start-cols)]"
          style={{ ["--start-cols" as string]: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {cards.map((c, i) => (
            <div key={c.title} data-testid="start-card" className="rounded-brand border border-line p-5">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[13px] font-black text-surface">{i + 1}</span>
              <p className="mt-3 font-bold">{c.title}</p>
              <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">{c.blurb}</p>
            </div>
          ))}
        </section>
      </div>
    </OnboardingShell>
  );
}

function StartIcon({ kind }: { kind: "person" | "people" }) {
  return (
    <span aria-hidden className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-full bg-ink/5 text-ink">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {kind === "people" ? (
          <>
            <circle cx="9" cy="8" r="3.2" />
            <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
            <path d="M16 5.5a3.2 3.2 0 0 1 0 6.2M17.5 14.4A6.5 6.5 0 0 1 21.5 20" />
          </>
        ) : (
          <>
            <circle cx="12" cy="8" r="3.4" />
            <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
          </>
        )}
      </svg>
    </span>
  );
}
