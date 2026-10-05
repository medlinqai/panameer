import Link from "next/link";
import { CLOSING_CTA } from "@/lib/brand";

const LINKS = {
  home: {
    primary: `/login?callbackUrl=${encodeURIComponent("/#assessment")}`,
    secondary: "/talent",
  },
  buyer: { primary: "/explore?mode=hire", secondary: "/support/bug" },
  /*
    ⚠ `/join`, NOT `/join?type=seller` (`E234`). The provider-audience closing
    band still SPEAKS to sellers — that is what `audience` is for — but the link
    stops filling in step 1 on their behalf.
    ⚠ SUPERSEDED, quoted: `primary: "/join?type=seller"`.
  */
  provider: { primary: "/join", secondary: "#sequence" },
} as const;

export function ClosingCta({
  audience,
}: {
  audience: "home" | "buyer" | "provider";
}) {
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
            className="bg-magenta px-[30px] py-[15px] text-[16px] font-semibold text-white transition-colors hover:bg-magenta-dark"
          >
            {copy.primary}
          </Link>
          {/*
            A white-outline ghost. The shared `Btn variant="ghost"` is built for
            light surfaces — its ink text would be near-invisible here.
          */}
          <Link
            href={href.secondary}
            className="border-[1.5px] border-white/40 px-[30px] py-[15px] text-[16px] font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
          >
            {copy.secondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
