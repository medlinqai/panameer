import Link from "next/link";
import { CLOSING_CTA } from "@/lib/brand";

/**
 * The closing band, per audience.
 *
 * ⚠ EVERY BUTTON HERE GOES SOMEWHERE REAL, which took some deciding because the
 * mockups' labels imply flows that do not exist yet:
 *
 *   Describe What You Need →   /explore?mode=hire — the search destination the
 *                              hero already uses. It is the honest version of
 *                              "describe it": you type, it looks.
 *   Talk to Us                 ⚠ THE WEAKEST LINK ON EITHER PAGE. There is no
 *                              public contact route. /support/bug exists but
 *                              lives under (app), so it 307s an anonymous
 *                              visitor to /login — and behind that login it is
 *                              itself a stub with no ticketing backend.
 *                              Routing to sign-in is the pattern the brief
 *                              sanctions for exactly this case, and it beats a
 *                              mailto: for an address nobody monitors, but
 *                              "Talk to Us" deserves a real destination and
 *                              this is flagged rather than papered over.
 *   Build Your Profile         /join?type=seller — the real provider sign-up.
 *   See How Earning Works →    `/` is the buyer page now, so the seller's
 *                              secondary points at #sequence on its own page,
 *                              which is the section that answers it.
 *
 * The buyer band deliberately does NOT repeat the assessment CTA above it. Two
 * primary asks in the last two sections is the page arguing with itself.
 */
const LINKS = {
  buyer: { primary: "/explore?mode=hire", secondary: "/support/bug" },
  provider: { primary: "/join?type=seller", secondary: "#sequence" },
} as const;

export function ClosingCta({ audience }: { audience: "buyer" | "provider" }) {
  const copy = CLOSING_CTA[audience];
  const href = LINKS[audience];

  return (
    <section className="bg-[linear-gradient(120deg,#191a44,#3a1c53)] py-16 text-center text-white">
      <div className="mx-auto max-w-[1120px] px-7">
        {/*
          WS-2 — the cue lives here now. At the foot of the page it is a
          prompt to act on something already understood, which is what an
          eyebrow over a closing headline is for. Pink rather than magenta:
          this band is dark, and the marketing eyebrow colour would not hold
          contrast on it.
        */}
        <p className="mb-3 font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-[#f0a6ef]">
          Get Started Now
        </p>
        <h2 className="text-[28px] font-semibold sm:text-[34px]">{copy.headline}</h2>
        <p className="mx-auto mb-[26px] mt-3 max-w-[540px] text-[17px] text-[#d9d6ec]">
          {copy.body}
        </p>
        <div className="flex flex-wrap justify-center gap-3.5">
          <Link
            href={href.primary}
            className="rounded-full bg-magenta px-[30px] py-[15px] text-[16px] font-semibold text-white transition-colors hover:bg-magenta-dark"
          >
            {copy.primary}
          </Link>
          {/*
            A white-outline ghost. The shared `Btn variant="ghost"` is built for
            light surfaces — its ink text would be near-invisible here.
          */}
          <Link
            href={href.secondary}
            className="rounded-full border-[1.5px] border-white/40 px-[30px] py-[15px] text-[16px] font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
          >
            {copy.secondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
