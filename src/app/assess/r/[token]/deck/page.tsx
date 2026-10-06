import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { buildReport, formatRange } from "@/lib/assessment/report";
import { PrintButton } from "@/components/assessment/PrintButton";
import "@/components/assessment/deck.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const m = await buildReport(token);
  return { title: m ? `${m.companyName} — your AI opportunity` : "Deck — Panameer" };
}

/** THE OUTBOUND PRESENTATION (WS-F) — six slides, generated from the assessment. */
export default async function DeckPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const m = await buildReport(token);
  if (!m) notFound();

  const top = m.moves.slice(0, 3);

  return (
    <div className="deck-page">
      {/* Screen-only toolbar. `print:hidden` keeps it out of the PDF. */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-white/95 px-6 py-3 backdrop-blur">
        <Link
          href={`/assess/r/${m.shareToken}`}
          className="text-[14px] font-bold text-ink-2 underline underline-offset-2 hover:text-magenta"
        >
          ← Back to the report
        </Link>
        <span className="ml-auto text-[13.5px] text-ink-2">
          Share this link — it opens for anyone you send it to.
        </span>
        <PrintButton />
      </div>

      <div className="deck">
        {/* 1 — TITLE */}
        <section className="slide slide-dark">
          <p className="eyebrow">
            PANAMEER · FOR {m.companyName.toUpperCase()}
          </p>
          <h1>Your AI Opportunity — funded, not spent.</h1>
          <p className="lede">
            {m.processName} · estimated Year-1, built to pay for itself
          </p>
        </section>

        {/* 2 — THE NUMBER */}
        <section className="slide slide-dark">
          <p className="eyebrow">THE NUMBER</p>
          <h2>Net-positive from day one.</h2>
          <p className="big">{formatRange(m.funding)}</p>
          <p className="lede">
            estimated funding the tax code can cover — before a dollar of operational
            savings.
          </p>
        </section>

        {/* 3 — THE MOVES */}
        <section className="slide">
          <p className="eyebrow">THE MOVES</p>
          <h2>A few high-impact places to start.</h2>
          <ul className="moves">
            {top.map((mv) => (
              <li key={mv.domain}>
                <span className="move-title">{mv.title}</span>
                <span className="move-detail">
                  {mv.timeline} · {mv.resource}
                </span>
              </li>
            ))}
            {top.length === 0 && (
              <li>
                <span className="move-title">Already at the top of the ladder</span>
                <span className="move-detail">
                  Worth a conversation about what comes after automation.
                </span>
              </li>
            )}
          </ul>
        </section>

        {/* 4 — HOW IT'S FUNDED */}
        <section className="slide">
          <p className="eyebrow">HOW IT&rsquo;S FUNDED</p>
          <h2>Mostly on the government&rsquo;s dime.</h2>
          <p className="lede">
            AI R&amp;D credits · accelerated depreciation on the tech · straight
            deductibility. Conservative, and your CPA signs off.
          </p>
          {/* The one line that keeps the aggressive half of the story off a */}
          <p className="footnote">(Advanced structuring we cover 1:1.)</p>
        </section>

        {/* 5 — THE PROMISE */}
        <section className="slide slide-dark">
          <p className="eyebrow">THE PROMISE</p>
          <h2>We only take work that pays for itself.</h2>
          <p className="lede">
            The funding plus the savings are designed to cover our fees and put you ahead
            — or we don&rsquo;t scope it.
          </p>
        </section>

        {/* 6 — NEXT */}
        <section className="slide">
          <p className="eyebrow">NEXT</p>
          <h2>Let&rsquo;s talk. 20 minutes.</h2>
          <p className="lede">
            We&rsquo;ll walk your numbers, confirm the funding path, and pick the first
            move.
          </p>
          <Link href="/assess/scope" className="deck-cta no-print">
            Book a time ›
          </Link>
        </section>
      </div>
    </div>
  );
}
