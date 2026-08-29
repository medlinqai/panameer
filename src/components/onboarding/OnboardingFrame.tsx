import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { BRAND_DESCRIPTOR } from "@/lib/brand";

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
  className = "",
  width = FRAME_WIDTH,
  /**
   * Tighter vertical rhythm for the ONE pre-verify page carrying a full form
   * (brief_W / E047): sign-up has a social block, a divider, five fields, two
   * consent checkboxes and a footer, and at the stock rhythm "Create My Account"
   * falls below the fold — the worst possible thing to hide on a sign-up page.
   */
  compact = false,
  /**
   * E101 — DEFAULT IS TOP-JUSTIFIED now, reversing the vertical centring added
   * in Run 6's presentation pass.
   *
   * Centring was meant to fix "content jammed under the header", and on a short
   * step it looked balanced. On every other step it bought a large empty band
   * above the content and pushed the real work down the page, which is what the
   * walk kept hitting. Horizontal centring stays; vertical does not. Kept as an
   * opt-in rather than deleted, for the one-line pages (a check-your-email note)
   * where a centred card genuinely reads better.
   */
  centered = false,
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
  /**
   * Extra classes for the frame root. Used by `/assess` and `/assess/submitted`
   * to add `marketing-surface`, which every sibling public page already has and
   * without which dark mode paints `text-ink` on a dark card (E017).
   */
  className?: string;
}) {
  const pad = compact ? "py-8 sm:py-10" : "py-10 sm:py-14";
  return (
    /*
      ── ⚠⚠ THE PUBLIC CASING (`P1-J1.1-E246`) ─────────────────────────────────

      Scott, 2026-08-29, on the walk: **"ALL Pages must use a casing."** He walked
      six onboarding pages and filed the SAME complaint on each — no menus, no
      footer. ⚠ THIS IS ONE COMPONENT CHANGE, NOT SIX PAGE FIXES, and the reason is
      in this file's own history: the walk re-filed it under `E049`, `E064`, `E080`
      and `E082` because the chrome was re-tuned page by page and each fix left the
      others behind.

      ⚠⚠ `MarketingHeader` AND `MarketingFooter` ARE SIBLINGS OF THE FRAME, NOT
      CHILDREN. The frame keeps `flex-1` so it still grows between them; `body`
      carries `flex flex-col min-h-dvh`.
      ⚠⚠ NEITHER IS INSIDE A `.pm-home` WRAPPER AND NONE WAS ADDED. `P1-ALL-E020`
      measured what happens when `MarketingFooter` renders inside that scope: its
      inherited colour repainted `#cfc7da` -> `#aeb4cf` and it stood 910px on five
      public pages against 1008px on `/optimize`. It is Tailwind and must ESCAPE
      the scope; `MarketingHeader` likewise, because `home.css` scoped to
      `.pm-home *` strips its Tailwind spacing. Onboarding pages carry no
      `.pm-home` today — DO NOT ADD ONE.

      ⚠ THE ACTION BAND BELOW STAYS `sticky bottom-0` (`E024`) and the site footer
      renders BELOW it, reached by scrolling. That is the brief's rule, not a new
      one: on a step taller than the viewport there was no way to know you could
      proceed without scrolling to the very end.

      ⚠⚠ THE HEADER'S `Log In` / `Sign Up` NOW POINT AT THE PAGE YOU ARE ON, on
      several of these routes. THAT IS KNOWN, DELIBERATE AND REPORTED — Scott
      decides. DO NOT suppress, hide, relabel or conditionally render them, and do
      not add a prop to do it. The exact behaviour per route is in the `E246` report.

      ⚠ `flex-1`, NOT `min-h-screen` (E020). `min-h-screen` demanded a full
      viewport for this box while `<DevBanner />` sits ~41px ABOVE it in the root
      layout — so the frame was always taller than the space it had, and the
      footer band started below the fold on every page of every wizard. `body`
      carries `flex flex-col min-h-dvh`, so growing to fill instead of demanding
      a viewport gets the same result and leaves room for whatever is above.
    */
    <>
      <MarketingHeader />
      <div className={`flex flex-1 flex-col bg-white font-body text-ink ${className}`}>
      {/*
        Header rule spans the viewport; the logo lines up with the column.

        E182 — THE TAGLINE SITS BESIDE THE MARK, AS TEXT. It is one flex row so
        the two read as a lockup rather than as a logo with a caption under it,
        and the divider between them is what keeps the mark itself clean —
        nothing here is baked into the image, so the wordmark stays reusable and
        the words stay editable in one constant.

        THE WORDS CHANGED (brief_brand_tagline_rollout WS-B). E182 put "The
        Oracle Cloud Talent, Training & Services Marketplace" here: narrower
        than the positioning now is, and using the one word the brand system
        deliberately keeps out of display copy. The descriptor replaces it —
        same slot, same lockup, no layout change.

        Hidden below `sm`: at 375px the mark plus a nine-word sentence either
        wraps to three lines or squeezes the mark, and a header that tall costs
        the form the top of the screen on the one device that can least spare it.
      */}
      <header className="border-b border-line">
        <div className={`mx-auto flex w-full ${width} items-center gap-3 px-6 py-5`}>
          <Logo priority />
          <span
            aria-hidden
            className="hidden h-6 w-px shrink-0 bg-line sm:block"
          />
          <p className="hidden text-[13.5px] font-semibold leading-tight text-ink-2 sm:block">
            {BRAND_DESCRIPTOR}
          </p>
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
      <MarketingFooter />
    </>
  );
}
