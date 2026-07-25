"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { formatCents } from "@/lib/display";

/**
 * The scrollable testimonial carousel on the "Get Started Now!" intro
 * (brief_P / E002): three provider cards with ‹ › arrows.
 *
 * These are ILLUSTRATIVE marketing cards from the onboarding deck, not real
 * provider records — a new signup has no marketplace to read from yet. Rates
 * are held in integer cents like every other money value in the app.
 */

export type Testimonial = {
  firstName: string;
  lastName: string;
  headline: string;
  rating: number;
  onsiteCents: number;
  remoteCents: number;
};

export const DECK_TESTIMONIALS: Testimonial[] = [
  {
    firstName: "Scott",
    lastName: "W",
    headline: "Oracle Cloud P2P / Procurement Cloud Expert",
    rating: 3.0,
    onsiteCents: 12_500,
    remoteCents: 9_000,
  },
  {
    firstName: "Thomas",
    lastName: "A",
    headline: "AI Vibe Coder",
    rating: 3.0,
    onsiteCents: 12_500,
    remoteCents: 9_000,
  },
  {
    firstName: "Susan",
    lastName: "P",
    headline: "Digital Marketer",
    rating: 3.0,
    onsiteCents: 12_500,
    remoteCents: 9_000,
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[14px]">
      <span aria-hidden className="text-[#F5A623]">
        {"★".repeat(Math.round(rating))}
        <span className="text-line">{"★".repeat(5 - Math.round(rating))}</span>
      </span>
      <span className="font-semibold text-ink-2">{rating.toFixed(1)}</span>
    </span>
  );
}

export function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="rounded-brand border border-line bg-white p-5 shadow-brand">
      <div className="flex items-center gap-3">
        <Avatar firstName={t.firstName} lastName={t.lastName} size={44} />
        <div className="min-w-0">
          <p className="truncate font-bold">
            {t.firstName} {t.lastName}
          </p>
          <Stars rating={t.rating} />
        </div>
      </div>
      <p className="mt-3 text-[14.5px] leading-snug text-ink-2">{t.headline}</p>
      <dl className="mt-4 flex gap-6 border-t border-line pt-3 text-[13px]">
        <div>
          <dt className="text-ink-2">Onsite</dt>
          <dd className="font-extrabold">{formatCents(t.onsiteCents)}/hr</dd>
        </div>
        <div>
          <dt className="text-ink-2">Remote</dt>
          <dd className="font-extrabold">{formatCents(t.remoteCents)}/hr</dd>
        </div>
      </dl>
    </div>
  );
}

export function TestimonialCarousel({
  items = DECK_TESTIMONIALS,
}: {
  items?: Testimonial[];
}) {
  const [i, setI] = useState(0);
  const prev = () => setI((n) => (n - 1 + items.length) % items.length);
  const next = () => setI((n) => (n + 1) % items.length);

  return (
    <div>
      {/* Wide: all three side by side. Narrow: one at a time with arrows. */}
      <div className="hidden gap-4 md:grid md:grid-cols-3">
        {items.map((t) => (
          <TestimonialCard key={`${t.firstName}-${t.headline}`} t={t} />
        ))}
      </div>

      <div className="md:hidden">
        <TestimonialCard t={items[i]} />
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 md:justify-end">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous testimonial"
          className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-line text-ink transition-colors hover:border-magenta hover:text-magenta"
        >
          ‹
        </button>
        <span className="text-[13px] font-semibold text-ink-2 md:hidden">
          {i + 1} / {items.length}
        </span>
        <button
          type="button"
          onClick={next}
          aria-label="Next testimonial"
          className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-line text-ink transition-colors hover:border-magenta hover:text-magenta"
        >
          ›
        </button>
      </div>
    </div>
  );
}
