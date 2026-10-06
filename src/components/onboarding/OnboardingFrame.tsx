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
      {/* THE FRAME'S OWN HEADER IS GONE §8) */}
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
        // STICKY (E024). On a step taller than the viewport there was no way to
        <div className="sticky bottom-0 z-10 border-t border-line bg-white">
          <div
            className={`mx-auto flex w-full ${width} flex-wrap items-center justify-between gap-4 px-6 py-5`}
          >
            {footer}
          </div>
        </div>
      )}
      </div>
      {/* OUTSIDE the frame AND outside any `.pm-home` — see the note above. */}
      {chrome && !onboarding && <MarketingFooter />}
    </>
  );
}
