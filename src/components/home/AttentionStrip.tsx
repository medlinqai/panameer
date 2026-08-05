"use client";

import Link from "next/link";
import { useState } from "react";
import { RailIcon } from "@/components/casing/RailIcon";
import { formatCredits, type CreditsSummary } from "@/lib/credits";
import type { AttentionCard } from "@/lib/attention";

/**
 * "NEEDS YOUR ATTENTION" (brief_sp_dashboard WS-A/WS-D).
 *
 * ONE COMPACT LINE, ALWAYS, in both modes. That is the load-bearing constraint:
 * the work feed is the body of this page and a strip that wraps to a second row
 * pushes it below the fold. So the visible cards are capped and the remainder
 * collapses into "+N more" rather than reflowing.
 *
 * TWO MODES:
 *   ACTION — at least one card fired. Triggered cards only, money-first, capped.
 *   CALM   — nothing fired. NOT blank, and not a wall of zeros: a quiet
 *            "all caught up" line, then value tiles that give the space back to
 *            something worth reading.
 *
 * THE VALUE TILES ARE THE FALLBACK, NOT FURNITURE. They appear only in calm
 * mode, because action always wins the space — a Credits tile sitting beside
 * "3 work orders to accept" competes with the thing the provider should do
 * next.
 */
const VISIBLE_CAP = 4;

export function AttentionStrip({
  cards,
  credits,
  completeness,
}: {
  cards: AttentionCard[];
  credits: CreditsSummary;
  /** Null when the viewer has no provider profile. */
  completeness: number | null;
}) {
  /*
    The celebration card is dismissible — good news you cannot dismiss becomes
    nagging by the third day. Local state only: there is no Payment model yet,
    so there is nothing to persist a dismissal against. When one lands, this
    becomes a write, and the card's `tone` already marks which one it is.
  */
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  const live = cards.filter((c) => !dismissed.includes(c.id));

  if (live.length === 0) {
    return <CalmStrip credits={credits} completeness={completeness} />;
  }

  const visible = expanded ? live : live.slice(0, VISIBLE_CAP);
  const overflow = live.length - visible.length;

  return (
    <section aria-label="Needs your attention" className="mb-5">
      <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-2">
        Needs Your Attention
      </h2>

      {/*
        Horizontal scroll below sm, a single row above it. `overflow-x-auto`
        with `shrink-0` children is what makes the mobile behaviour a swipe
        rather than a squeeze — labels never wrap and never truncate to
        nonsense.
      */}
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {visible.map((card) => (
          <ActionCard
            key={card.id}
            card={card}
            onDismiss={
              card.tone === "celebrate"
                ? () => setDismissed((d) => [...d, card.id])
                : undefined
            }
          />
        ))}

        {overflow > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex w-[132px] shrink-0 flex-col justify-center rounded-brand border border-dashed border-line bg-white px-4 py-3 text-left transition-colors hover:border-magenta/50"
          >
            <span className="font-display text-[20px] font-bold text-magenta">
              +{overflow}
            </span>
            <span className="text-[13px] font-semibold text-ink-2">more</span>
          </button>
        )}
      </div>
    </section>
  );
}

function ActionCard({
  card,
  onDismiss,
}: {
  card: AttentionCard;
  onDismiss?: () => void;
}) {
  const celebrate = card.tone === "celebrate";
  return (
    <div
      className={
        "relative flex w-[210px] shrink-0 items-start gap-3 rounded-brand border p-4 " +
        (celebrate
          ? "border-emerald-500/40 bg-emerald-50/70"
          : "border-line bg-white")
      }
    >
      <span
        className={
          "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full " +
          (celebrate ? "bg-emerald-500/15 text-emerald-700" : "bg-magenta/10 text-magenta")
        }
      >
        <RailIcon name={card.icon} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-1.5">
          <span
            className={
              "font-display text-[20px] font-bold leading-none " +
              (celebrate ? "text-emerald-700" : "text-magenta")
            }
          >
            {card.count}
          </span>
          <span className="truncate text-[13.5px] font-bold">{card.label}</span>
        </p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{card.detail}</p>
        {/*
          THE WHOLE CARD IS THE TAP TARGET via an overlay link, so a thumb on a
          phone hits it rather than hunting for a 40px "View" button. The
          dismiss control sits above it in z-order so it stays clickable.
        */}
        <Link
          href={card.href}
          className="absolute inset-0 rounded-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta"
        >
          <span className="sr-only">
            {card.count} {card.label} — {card.detail}
          </span>
        </Link>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss ${card.label}`}
          className="relative z-10 -mr-1 -mt-1 shrink-0 rounded-full px-1.5 text-[15px] leading-none text-emerald-700/60 hover:text-emerald-800"
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * CALM MODE — "all caught up", then the value tiles.
 *
 * The tiles answer "there is nothing to do, so what is worth knowing?" rather
 * than leaving a gap where the strip was. Credits leads because earning is the
 * behaviour the platform most wants and the one a provider can act on right
 * now; earnings is second and honestly stubbed; profile strength is third
 * because it is the thing most likely to already be done.
 */
function CalmStrip({
  credits,
  completeness,
}: {
  credits: CreditsSummary;
  completeness: number | null;
}) {
  return (
    <section aria-label="Needs your attention" className="mb-5">
      <p className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-emerald-700">
        <span aria-hidden>✓</span> You&apos;re all caught up
      </p>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {/* Credits — the earn-more nudge. Deliberately NOT the header pill's
            job: that is an at-a-glance balance, this says what to do next. */}
        <Link
          href="/community"
          className="w-[248px] shrink-0 rounded-brand border border-magenta/25 bg-magenta/[0.04] p-4 transition-colors hover:border-magenta/50"
        >
          <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-ink-2">
            Community Credits
          </p>
          <p className="mt-1 font-display text-[24px] font-bold leading-none text-magenta">
            {formatCredits(credits.balance)}
            <span className="ml-2 align-middle text-[13px] font-semibold text-ink-2">
              +{formatCredits(credits.earnedThisWeek)} this week
            </span>
          </p>
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-2">
            {credits.pending
              ? "Earning switches on with the Credits ledger — see how to earn."
              : "Earn more → seats at a Friday group session."}
          </p>
        </Link>

        {/* Earnings — stubbed, and says so. Same rule as My Stats: a "$0" here
            would be a measurement we have not made. */}
        <div className="w-[210px] shrink-0 rounded-brand border border-line bg-white p-4">
          <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-ink-2">
            Earnings YTD
          </p>
          <p className="mt-1 font-display text-[24px] font-bold leading-none text-ink-2/25">
            —
          </p>
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-2">
            Starts counting when work orders settle on Panameer.
          </p>
        </div>

        {/* Profile strength — real number, real link. */}
        {completeness !== null && (
          <Link
            href="/profile"
            className="w-[210px] shrink-0 rounded-brand border border-line bg-white p-4 transition-colors hover:border-magenta/40"
          >
            <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-ink-2">
              Profile Strength
            </p>
            <p className="mt-1 font-display text-[24px] font-bold leading-none">
              {completeness}%
            </p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-ink-2">
              {completeness >= 100
                ? "Complete — buyers see everything."
                : "Finish it and you rank higher in buyer search."}
            </p>
          </Link>
        )}
      </div>
    </section>
  );
}
