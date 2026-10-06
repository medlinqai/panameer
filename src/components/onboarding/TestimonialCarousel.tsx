"use client";

import { useState } from "react";
import Image from "next/image";

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
    firstName: "Deepak",
    lastName: "K",
    headline: "AI Vibe Coder",
    quote:
      "I ship AI features faster than teams ten times my size. Panameer connects me to the clients who actually need that speed.",
    photo: "/examples/deepak-k.png",
    rating: 3.0,
    onsiteCents: 12_500,
    remoteCents: 9_000,
  },
  {
    firstName: "Melanie",
    lastName: "R",
    headline: "Oracle Cloud HCM / Payroll Implementation Expert",
    quote:
      "I've run Oracle Cloud HCM and Payroll go-lives for years. On Panameer the clients already know the work I do, so I spend my time delivering instead of explaining.",
    photo: "/examples/melanie-r.png",
    rating: 3.0,
    onsiteCents: 12_500,
    remoteCents: 9_000,
  },
];

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1.5 text-[15px]">
      <span aria-hidden className="tracking-[1px] text-[#22C55E]">
        {"★".repeat(filled)}
        <span className="text-line">{"★".repeat(5 - filled)}</span>
      </span>
      <span className="text-[13px] font-semibold text-ink-2">
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

/** The mail glyph beside the name in the design ref. Decorative. */
function MailIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] flex-none text-[#22C55E]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

function rateText(cents: number): string {
  return `${Math.round(cents / 100)}/hr`;
}

/** The example-provider card (WS1 / E080 · E082, matching */
export function TestimonialCard({ t }: { t: Testimonial }) {
  // The @container lives on the WRAPPER, not the figure — an element cannot
  // query its own width, so the queries below would never fire on the figure
  // itself.
  return (
    <div className="@container">
      <figure className="rounded-brand border border-line bg-white p-6 shadow-brand @[340px]:p-7">
      <div className="flex items-start gap-5 @[340px]:gap-6">
        <Image
          src={t.photo}
          alt={`${t.firstName} ${t.lastName}`}
          width={200}
          height={200}
          className="h-[84px] w-[84px] flex-none rounded-full object-cover @[340px]:h-[104px] @[340px]:w-[104px]"
        />
        {/* min-w-0 is load-bearing: without it this column refuses to shrink
            below its content and the rates push out through the border. */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <p className="truncate text-[17.5px] font-bold @[340px]:text-[19px]">
              {t.firstName} {t.lastName}
            </p>
            <MailIcon />
            <Stars rating={t.rating} />
          </div>
          <p className="mt-1.5 text-[14.5px] leading-snug text-ink-2 @[340px]:text-[15px]">
            {t.headline}
          </p>
          {/* Rates as two labelled lines, as in the design. `flex-wrap` + */}
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[14.5px] @[340px]:mt-4 @[340px]:block @[340px]:space-y-1">
            <div className="flex gap-2">
              <dt className="text-ink-2">Onsite:</dt>
              <dd className="font-bold">{rateText(t.onsiteCents)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-2">Offsite:</dt>
              <dd className="font-bold">{rateText(t.remoteCents)}</dd>
            </div>
          </dl>
        </div>
      </div>
      {/* Bold on EVERY card (WS2/E140) — the quote is the reason the card is
          on the page; it was the lightest thing on it. */}
      <blockquote className="mt-6 text-[15.5px] font-bold leading-relaxed text-ink @[340px]:mt-7 @[340px]:text-[16.5px]">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      </figure>
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

  const arrow =
    "grid h-10 w-10 flex-none place-items-center rounded-full border-[1.5px] border-line bg-white text-[19px] leading-none text-ink shadow-brand transition-colors hover:border-magenta hover:text-magenta";

  // WS3/E080 — the arrows FLANK the card from OUTSIDE it, with a real gap, as
  return (
    <div className="@container">
      {/* Flanking costs ~104px of horizontal room. That is affordable in the 460px */}
      <div className="flex flex-wrap items-center justify-center gap-3 @[440px]:flex-nowrap">
        <div className="order-1 w-full min-w-0 @[440px]:order-2 @[440px]:w-auto @[440px]:flex-1">
          <TestimonialCard t={items[i]} />
        </div>
        <button
          type="button"
          onClick={prev}
          aria-label="Previous example"
          className={`${arrow} order-2 @[440px]:order-1`}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next example"
          className={`${arrow} order-3`}
        >
          ›
        </button>
      </div>
    </div>
  );
}
