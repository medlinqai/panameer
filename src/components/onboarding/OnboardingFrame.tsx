import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import type { ReactNode } from "react";
import { OnboardingBar } from "@/components/onboarding/OnboardingBar";

export const FRAME_WIDTH = "max-w-5xl";

export function OnboardingFrame({
  children,
  footer,
  className = "",
  width = FRAME_WIDTH,
  chrome = true,
  compact = false,
  centered = false,
  contentWidth,
  onboarding = false,
  barRight,
}: {
  children: ReactNode;
  footer?: ReactNode;
  chrome?: boolean;
  width?: string;
  compact?: boolean;
  centered?: boolean;
  contentWidth?: string;
  className?: string;
  /** Onboarding pages: slim bar instead of the marketing header and footer. */
  onboarding?: boolean;
  barRight?: ReactNode;
}) {
  const pad = compact ? "py-8 sm:py-10" : "py-10 sm:py-14";
  return (
    <>
      {}
      {chrome && (onboarding ? <OnboardingBar right={barRight} /> : <MarketingHeader />)}
      <div className={`flex flex-1 flex-col bg-white font-body text-ink ${className}`}>
      {/*
        ── ⚠⚠ THE FRAME'S OWN HEADER IS GONE (`P1-J1.1-E246` §8) ─────────────────

        Scott, seeing `19f0d07`: *"a casing within a casing?"* — `E246` §1 put
        `MarketingHeader` above this frame and never said what became of the header
        the frame already had, so the page shipped with TWO wordmarks and TWO rules
        stacked. ⚠ CHAT'S MISS, LOGGED AS SUCH; the build matched what §1 wrote.

        ⚠ `MarketingHeader` OWNS THE TOP OF THE PAGE NOW and already carries the
        wordmark. Do not re-add a second one here.

        ⚠ SUPERSEDED, quoted not deleted — this slot held a `<header
        className="border-b border-line">` with `<Logo priority />`, an `sm:block`
        divider span and a `BRAND_DESCRIPTOR` paragraph, documented as:
          *"Header rule spans the viewport; the logo lines up with the column.
          E182 — THE TAGLINE SITS BESIDE THE MARK, AS TEXT. It is one flex row so the
          two read as a lockup rather than as a logo with a caption under it, and the
          divider between them is what keeps the mark itself clean — nothing here is
          baked into the image, so the wordmark stays reusable and the words stay
          editable in one constant.
          THE WORDS CHANGED (brief_brand_tagline_rollout WS-B). E182 put "The Oracle
          Cloud Talent, Training & Services Marketplace" here: narrower than the
          positioning now is, and using the one word the brand system deliberately
          keeps out of display copy. The descriptor replaces it — same slot, same
          lockup, no layout change.
          Hidden below `sm`: at 375px the mark plus a nine-word sentence either wraps
          to three lines or squeezes the mark, and a header that tall costs the form
          the top of the screen on the one device that can least spare it."*

        ⚠ `BRAND_DESCRIPTOR` IS NOT LOST FROM THE PAGE — `MarketingFooter`'s brand
        block renders the same constant, so the descriptor still appears once.
        Confirmed in the `E246` §8 screenshots, not assumed.
      */}
      <main className="flex flex-1 flex-col">
        <div
          className={`mx-auto w-full ${width} px-6 ${pad} ${centered ? "my-auto" : ""}`}
        >
          {contentWidth ? (
            <div className={`mx-auto w-full ${contentWidth}`}>{children}</div>
          ) : (
            children
          )}
        </div>
      </main>

      {footer && (
        /*
          ⚠ STICKY (E024). On a step taller than the viewport there was no way to
          know you could proceed without scrolling to the very end. It keeps the
          frame's own background so content scrolls UNDER it rather than showing
          through, and its existing `border-t` becomes the edge that says so.
        */
        <div className="sticky bottom-0 z-10 border-t border-line bg-white">
          <div
            className={`mx-auto flex w-full ${width} flex-wrap items-center justify-between gap-4 px-6 py-5`}
          >
            {footer}
          </div>
        </div>
      )}
      </div>
      {/* ⚠ OUTSIDE the frame AND outside any `.pm-home` — see the note above. */}
      {chrome && !onboarding && <MarketingFooter />}
    </>
  );
}
