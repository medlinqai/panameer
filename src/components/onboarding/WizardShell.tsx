"use client";

import type { ReactNode } from "react";
import {
  OnboardingFrame,
  FRAME_WIDTH,
} from "@/components/onboarding/OnboardingFrame";

export function WizardShell({
  step,
  totalSteps = 13,
  stepLabel,
  counterText,
  subCounter,
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
  leaveLabel,
  onLeave,
  hideFooter = false,
  banner,
  aside,
  wide = false,
  tightBody = false,
  frameClassName = "",
  chrome = true,
}: {
  /** 1-based step number. OMIT on pre-verify pages — that hides the stepper. */
  step?: number;
  totalSteps?: number;
  stepLabel?: string;
  counterText?: string | null;
  subCounter?: string | null;
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
  leaveLabel?: string;
  onLeave?: () => void;
  hideFooter?: boolean;
  /** Optional slot rendered between the title block and step content. */
  banner?: ReactNode;
  aside?: ReactNode;
  /** Widen the frame for two-column steps. */
  wide?: boolean;
  tightBody?: boolean;
  /** Passed to OnboardingFrame — see its `className`. */
  frameClassName?: string;
  chrome?: boolean;
}) {
  const showCounter = typeof step === "number";
  const showStepper = showCounter || typeof progress === "number";
  const pct = showCounter
    ? Math.max(4, Math.min(100, (step! / totalSteps) * 100))
    : Math.max(4, Math.min(100, (progress ?? 0) * 100));
  // be the only way to get 5xl and is kept as a no-op alias so the two-column
  // steps that pass it keep working; the difference it named is gone.
  const width = FRAME_WIDTH;
  void wide;

  const footer = hideFooter ? undefined : (
    <>
      {}
      <div className="flex flex-1 justify-start">
        {canBack && onBack && (
          <button
            onClick={onBack}
            disabled={busy}
            className="rounded-full border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
          >
            Back
          </button>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center gap-4">
        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            disabled={busy}
            className="text-[15px] font-semibold text-ink-2 underline underline-offset-4 transition-colors hover:text-magenta disabled:opacity-50"
          >
            {secondaryLabel}
          </button>
        )}
        {}
        {secondaryLabel && onSecondary && leaveLabel && onLeave && (
          <span aria-hidden className="text-[15px] text-ink-2/40">
            ·
          </span>
        )}
        {leaveLabel && onLeave && (
          <button
            onClick={onLeave}
            disabled={busy}
            className="text-[15px] font-semibold text-ink-2 underline underline-offset-4 transition-colors hover:text-magenta disabled:opacity-50"
          >
            {leaveLabel}
          </button>
        )}
      </div>

      <div className="flex flex-1 justify-end">
        {onContinue && (
          <button
            onClick={onContinue}
            disabled={continueDisabled || busy}
            className="rounded-full bg-magenta px-8 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            {busy ? "Saving…" : continueLabel}
          </button>
        )}
      </div>
    </>
  );

  return (
    <OnboardingFrame width={width} footer={footer} className={frameClassName} chrome={chrome}>
      {}
      {showStepper && (
        <div className="mb-9">
          {showCounter && (
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wide text-ink-2">
                {stepLabel ?? "Build Your Profile"}
              </span>
              {counterText !== null && (
                <span className="text-[14px] font-extrabold tabular-nums text-magenta">
                  {counterText ?? `${step}/${totalSteps}`}
                </span>
              )}
            </div>
          )}
          {/* the within-section line, lighter than the row above it */}
          {showCounter && subCounter ? (
            <div className="-mt-1 mb-2.5 text-[12px] font-semibold tabular-nums text-muted">
              {subCounter}
            </div>
          ) : null}
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuenow={showCounter ? step : Math.round(pct)}
            aria-valuemin={showCounter ? 1 : 0}
            aria-valuemax={showCounter ? totalSteps : 100}
            /* ⚠ the accessible name follows the VISIBLE counter when one is supplied —
               announcing "Step 4 of 15" under a label reading "Section 2 of 5" would
               describe a different progress model to a screen-reader user. */
            aria-label={
              showCounter
                ? [counterText ?? `Step ${step} of ${totalSteps}`, subCounter]
                    .filter(Boolean)
                    .join(", ")
                : "Progress"
            }
          >
            <div
              className="h-full rounded-full bg-magenta transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/*
        TITLE AND SUBTITLE RUN FULL WIDTH, then the body and the aside sit below
        them (E103-import-page.png / walk7 WS3).

        They used to live INSIDE the left column of the two-column grid, so on
        any step with an aside the heading was squeezed to ~60% of the frame
        while the example card had the rest — the method-select page wrapped
        "How would you like to tell us about yourself?" across two lines beside
        a card that needed none of that room. The mockup runs both across the
        top and puts the choices and the card underneath, which is also just
        the right reading order: what you are being asked, then the ways to
        answer it.
      */}
      <div>
        <h1 className="text-[30px] font-extrabold tracking-[-0.6px] sm:text-[32px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-4xl text-[17px] leading-relaxed text-ink-2">
            {subtitle}
          </p>
        )}
      </div>

      <div
        className={
          (tightBody ? "mt-4" : "mt-8") +
          (aside ? " grid gap-12 lg:grid-cols-[1fr_380px]" : "")
        }
      >
        <div className="min-w-0">
          {banner && <div className="mb-8">{banner}</div>}
          {children}
        </div>
        {aside && <div className="lg:pt-1">{aside}</div>}
      </div>
    </OnboardingFrame>
  );
}
