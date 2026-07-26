"use client";

import { useState } from "react";
import Image from "next/image";
import { formatCents } from "@/lib/display";

/**
 * The example-provider carousel on "Get Started Now!" (E002, rebuilt by
 * brief_S / E023).
 *
 * ONE card at a time with ‹ › arrows — the previous three-across grid rendered
 * cramped and off-design. Photos are the banked headshots from the design
 * folder; they must actually render (the old version used initials).
 *
 * Mix is 2 Oracle Cloud + 1 AI per E023: Susan P was a Digital Marketer and is
 * recast as a second Oracle Cloud expert. Rates are integer cents like every
 * other money value in the app.
 *
 * These are ILLUSTRATIVE marketing cards from the onboarding deck, not real
 * provider records — a new signup has no marketplace to read from yet.
 */

export type Testimonial = {
  firstName: string;
  lastName: string;
  headline: string;
  quote: string;
  photo: string;
  rating: number;
  onsiteCents: number;
  remoteCents: number;
};

export const DECK_TESTIMONIALS: Testimonial[] = [
  {
    firstName: "Scott",
    lastName: "W",
    headline: "Oracle Cloud P2P / Procurement Cloud Expert",
    quote:
      "Panameer has enabled me to increase my rates. I know what I'm bringing to the table and love the feeling of being able to help a variety of clients.",
    photo: "/examples/scott-w.png",
    rating: 3.0,
    onsiteCents: 12_500,
    remoteCents: 9_000,
  },
  {
    firstName: "Thomas",
    lastName: "A",
    headline: "AI Vibe Coder",
    quote:
      "I ship AI features faster than teams ten times my size. Panameer connects me to the clients who actually need that speed.",
    photo: "/examples/thomas-a.png",
    rating: 3.0,
    onsiteCents: 12_500,
    remoteCents: 9_000,
  },
  {
    // E023 recast: was "Digital Marketer" — now the 2nd Oracle Cloud example.
    firstName: "Susan",
    lastName: "P",
    headline: "Oracle Cloud HCM / Payroll Implementation Expert",
    quote:
      "I've run Oracle Cloud HCM and Payroll go-lives for years. On Panameer the clients already know the work I do, so I spend my time delivering instead of explaining.",
    photo: "/examples/susan-p.png",
    rating: 3.0,
    onsiteCents: 12_500,
    remoteCents: 9_000,
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[14px]">
      <span aria-hidden className="text-[#22C55E]">
        {"★".repeat(Math.round(rating))}
        <span className="text-line">{"★".repeat(5 - Math.round(rating))}</span>
      </span>
      <span className="font-semibold text-ink-2">{rating.toFixed(1)}</span>
    </span>
  );
}

export function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <figure className="rounded-brand border border-line bg-white p-5 shadow-brand">
      <div className="flex items-start gap-4">
        <Image
          src={t.photo}
          alt={`${t.firstName} ${t.lastName}`}
          width={140}
          height={140}
          className="h-[68px] w-[68px] flex-none rounded-full object-cover"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold">
              {t.firstName} {t.lastName}
            </p>
            <Stars rating={t.rating} />
          </div>
          <p className="mt-1 text-[14px] leading-snug text-ink-2">{t.headline}</p>
          <dl className="mt-2 flex gap-5 text-[13px]">
            <div className="flex gap-1.5">
              <dt className="text-ink-2">Onsite</dt>
              <dd className="font-bold">{formatCents(t.onsiteCents)}/hr</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-ink-2">Remote</dt>
              <dd className="font-bold">{formatCents(t.remoteCents)}/hr</dd>
            </div>
          </dl>
        </div>
      </div>
      <blockquote className="mt-4 border-t border-line pt-4 text-[14.5px] italic leading-relaxed text-ink-2">
        “{t.quote}”
      </blockquote>
    </figure>
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
      <TestimonialCard t={items[i]} />

      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous example"
          className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-line text-[18px] leading-none text-ink transition-colors hover:border-magenta hover:text-magenta"
        >
          ‹
        </button>
        <div className="flex items-center gap-1.5" aria-hidden>
          {items.map((_, n) => (
            <span
              key={n}
              className={
                "h-1.5 rounded-full transition-all " +
                (n === i ? "w-5 bg-magenta" : "w-1.5 bg-line")
              }
            />
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          aria-label="Next example"
          className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-line text-[18px] leading-none text-ink transition-colors hover:border-magenta hover:text-magenta"
        >
          ›
        </button>
      </div>
    </div>
  );
}
