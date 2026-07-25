"use client";

import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

/**
 * Focused onboarding chrome: logo top-left, an optional step counter + progress
 * track, the step content, and a Back/Continue footer. Deliberately NO app or
 * marketing nav — this is a full-screen flow (per the onboarding decks).
 *
 * STEPPER RULES (brief_P / E003, E010):
 *  - The counter-bearing stepper belongs to the POST-verification profile build
 *    ONLY. Pre-verify pages (role select, sign up, check-your-email) pass no
 *    `step`, so they render NO stepper and NO progress line at all.
 *  - When shown it reads `x/12` and lives INSIDE the content frame — the old
 *    full-bleed `w-full` track ran edge to edge and overflowed the frame at the
 *    top right, which is exactly what E003 flagged. Track and counter now share
 *    the frame's `max-w-3xl`, so they line up with the heading beneath them.
 *
 * Footer layout (brief_O): Back far-left, primary Continue far-right, optional
 * secondary ("Skip for Now") de-emphasised in the left cluster.
 */
export function WizardShell({
  step,
  totalSteps = 12,
  progress,
  title,
  subtitle,
  children,
  onBack,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
  busy = false,
  canBack = true,
  secondaryLabel,
  onSecondary,
  hideFooter = false,
  banner,
  aside,
  wide = false,
}: {
  /** 1-based step number. OMIT on pre-verify pages — that hides the stepper. */
  step?: number;
  totalSteps?: number;
  /**
   * Legacy 0..1 fraction used by the buyer + Work Request wizards, which have
   * their own step counts and are out of scope for brief_P. Renders the same
   * frame-aligned track WITHOUT an `x/12` counter. Ignored when `step` is set.
   */
  progress?: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  busy?: boolean;
  canBack?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  hideFooter?: boolean;
  /** Optional slot rendered between the title block and step content. */
  banner?: ReactNode;
  /** Optional right-hand column (e.g. the E012 testimonial card). */
  aside?: ReactNode;
  /** Widen the frame for two-column steps. */
  wide?: boolean;
}) {
  const showCounter = typeof step === "number";
  const showStepper = showCounter || typeof progress === "number";
  const pct = showCounter
    ? Math.max(4, Math.min(100, (step! / totalSteps) * 100))
    : Math.max(4, Math.min(100, (progress ?? 0) * 100));
  const frame = wide ? "max-w-5xl" : "max-w-3xl";

  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      <header className="border-b border-line px-6 py-4">
        <div className={`mx-auto flex ${frame} items-center`}>
          <Logo priority />
        </div>
      </header>

      <main className={`mx-auto flex w-full ${frame} flex-1 flex-col px-6 py-10 sm:py-14`}>
        {/* Stepper — inside the frame, so it can never overflow (E003). */}
        {showStepper && (
          <div className="mb-8">
            {showCounter && (
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[13px] font-bold uppercase tracking-wide text-ink-2">
                  Build Your Profile
                </span>
                <span className="text-[14px] font-extrabold tabular-nums text-magenta">
                  {step}/{totalSteps}
                </span>
              </div>
            )}
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuenow={showCounter ? step : Math.round(pct)}
              aria-valuemin={showCounter ? 1 : 0}
              aria-valuemax={showCounter ? totalSteps : 100}
              aria-label={
                showCounter ? `Step ${step} of ${totalSteps}` : "Progress"
              }
            >
              <div
                className="h-full rounded-full bg-magenta transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1">
          <div className={aside ? "grid gap-10 lg:grid-cols-[1fr_320px]" : ""}>
            <div className="min-w-0">
              <h1 className="text-[28px] font-extrabold tracking-[-0.6px] sm:text-[34px]">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 max-w-2xl text-[17px] text-ink-2">{subtitle}</p>
              )}
              {banner && <div className="mt-6">{banner}</div>}
              <div className="mt-8">{children}</div>
            </div>
            {aside && <div className="lg:pt-2">{aside}</div>}
          </div>
        </div>

        {!hideFooter && (
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
            <div className="flex items-center gap-6">
              {canBack && onBack && (
                <button
                  onClick={onBack}
                  disabled={busy}
                  className="rounded-full border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
                >
                  Back
                </button>
              )}
              {secondaryLabel && onSecondary && (
                <button
                  onClick={onSecondary}
                  disabled={busy}
                  className="text-[15px] font-semibold text-ink-2 underline underline-offset-4 transition-colors hover:text-magenta disabled:opacity-50"
                >
                  {secondaryLabel}
                </button>
              )}
            </div>

            {onContinue && (
              <button
                onClick={onContinue}
                disabled={continueDisabled || busy}
                className="ml-auto rounded-full bg-magenta px-8 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
              >
                {busy ? "Saving…" : continueLabel}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
