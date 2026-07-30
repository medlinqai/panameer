"use client";

import { useState } from "react";
import Image from "next/image";

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

/**
 * A rate as the design writes it: `125/hr`. No currency symbol, no cents.
 *
 * WS1/E080 — the build rendered `$125.00/hr` through the shared `formatCents`,
 * which is right for money the provider is agreeing to and wrong for a marketing
 * card: the extra glyphs are four characters of noise on the line most likely to
 * wrap, and wrapping is exactly how the Remote rate ended up hanging outside the
 * card (E064d / E069-4).
 */
function rateText(cents: number): string {
  return `${Math.round(cents / 100)}/hr`;
}

/**
 * The example-provider card (WS1 / E080 · E082, matching
 * `get-started-examples/scott-w-card-mockup.png`).
 *
 * ONE card, two very different homes: a ~300px aside on the Upload/Review step
 * and a wide column on Get Started. It sizes itself with CONTAINER queries
 * rather than viewport breakpoints, because a viewport breakpoint cannot tell
 * those two apart — at 1440px wide both are "desktop", and the aside would get
 * the big-card treatment it has no room for. That mismatch is the actual
 * mechanism behind the recurring "card too small" / "rate hangs off the edge"
 * pair (E064d, E069-4, E080, E082): one fixed size was being asked to work in
 * two containers, so it was wrong in one of them whichever size was chosen.
 */
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
          {/*
            Rates as two labelled lines, as in the design. `flex-wrap` +
            `min-w-0` above is what keeps them inside the figure at any width —
            the E064d bug was a non-wrapping row in a 300px aside.
          */}
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[14.5px] @[340px]:mt-4 @[340px]:block @[340px]:space-y-1">
            <div className="flex gap-2">
              <dt className="text-ink-2">Onsite:</dt>
              <dd className="font-bold">{rateText(t.onsiteCents)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-2">Remote:</dt>
              <dd className="font-bold">{rateText(t.remoteCents)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <blockquote className="mt-6 text-[15.5px] italic leading-relaxed text-ink @[340px]:mt-7 @[340px]:text-[16.5px]">
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

  /*
    WS3/E080 — the arrows FLANK the card from OUTSIDE it, with a real gap, as
    circular buttons.

    E064(b) asked for flanking and got overlap, for a good reason at the time:
    in the 300px aside this component then lived in, two flanking columns cost
    ~80px, which wrapped the headline onto five lines and truncated the name. The
    honest fix was the column, not the arrows — the carousel now sits in a 460px
    column (WS2's widened frame paid for it), so the arrows can take their own
    space and the card still clears the 340px it wants. It is only used here, so
    this costs the narrow aside nothing.

    Dots removed: the design has none, and with three items the arrows already say
    everything the dots did.
  */
  return (
    <div className="@container">
      {/*
        Flanking costs ~104px of horizontal room. That is affordable in the 460px
        column on Get Started and impossible at 375px, where it would crush the
        card to 223px and push the rating row back out through the border — the
        very E064d symptom this pass exists to end. So the arrows flank when the
        COLUMN can pay for them and wrap to a centred row beneath the card when it
        can't. A viewport breakpoint would get this wrong; the constraint is the
        column's width, not the screen's.
      */}
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
