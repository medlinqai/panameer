import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

/**
 * The onboarding page chrome — ONE definition for every onboarding surface
 * (Run6 WS2 / E080 · E081 · E082).
 *
 * WHY THIS EXISTS. The walk kept re-filing the same complaint under new
 * numbers — E049, then E064, then E080, then E082 — because the chrome was being
 * re-tuned page by page. Each fix made one page match the design and left the
 * others where they were, so the next page walked read as "off" again. The
 * recurrence was structural, not a series of oversights.
 *
 * Three things the design has that a per-page fix kept missing:
 *
 *  - FULL-BLEED RULES. The rule under the logo and the rule above the footer run
 *    edge to edge, while their CONTENTS line up with the content column. A rule
 *    that stops at the column reads as a box around the page; the design's runs
 *    past it, which is what makes the page feel wide.
 *  - A FOOTER BAND. Secondary action left, primary right, in its own band pinned
 *    to the bottom — not floating under the content wherever the content happens
 *    to end.
 *  - VERTICAL BALANCE. Content sits in the middle band via `my-auto`, not jammed
 *    under the header with the lower half of the screen empty. `my-auto` rather
 *    than `justify-center` on purpose: it centres when there is room to spare and
 *    degrades to normal flow when there isn't, so a long step (Review) scrolls
 *    from its top instead of having its head clipped.
 */

/** The content column. Widened from 3xl per E081 — judged against the mockups. */
export const FRAME_WIDTH = "max-w-5xl";

export function OnboardingFrame({
  children,
  footer,
  width = FRAME_WIDTH,
  /**
   * Tighter vertical rhythm for the ONE pre-verify page carrying a full form
   * (brief_W / E047): sign-up has a social block, a divider, five fields, two
   * consent checkboxes and a footer, and at the stock rhythm "Create My Account"
   * falls below the fold — the worst possible thing to hide on a sign-up page.
   */
  compact = false,
  /** Centre the content in the available height. Off for long, scrolling steps. */
  centered = true,
  /**
   * Cap the CONTENT column inside the (wider) frame — E091.
   *
   * The frame is one width everywhere so the header rule, the footer band and
   * the page's overall proportions match on every onboarding page. A single
   * column of inputs still shouldn't stretch across all of it: long input lines
   * and long label-to-field distances read badly, which is the real reason these
   * pages were narrow before. So the CHROME is shared and the FORM is capped,
   * centred inside it — rather than narrowing the whole page to protect the form.
   */
  contentWidth,
}: {
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  compact?: boolean;
  centered?: boolean;
  contentWidth?: string;
}) {
  const pad = compact ? "py-8 sm:py-10" : "py-10 sm:py-14";
  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      {/* Header rule spans the viewport; the logo lines up with the column. */}
      <header className="border-b border-line">
        <div className={`mx-auto flex w-full ${width} items-center px-6 py-5`}>
          <Logo priority />
        </div>
      </header>

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
        <div className="border-t border-line">
          <div
            className={`mx-auto flex w-full ${width} flex-wrap items-center justify-between gap-4 px-6 py-5`}
          >
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}
