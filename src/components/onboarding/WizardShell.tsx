"use client";

import type { ReactNode } from "react";
import {
  OnboardingFrame,
  FRAME_WIDTH,
} from "@/components/onboarding/OnboardingFrame";

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
 * Footer layout: THREE EXPLICIT SLOTS — Back left, optional secondary CENTRE,
 * primary Continue right (`P2-J1.1-E011`, 2026-09-05). Each slot is `flex-1`, so
 * the centre is the centre of the band whether or not the other two are filled.
 * The full reasoning, and `E032`'s superseded finding, are on the footer itself.
 *
 * ⚠ SUPERSEDED, quoted not deleted, the two layouts this replaced:
 *   · *"optional secondary (\"Skip for Now\") de-emphasised in the left
 *     cluster"* (brief_O) — which was stale prose describing code that never
 *     rendered it.
 *   · *"Back far-left, primary Continue far-right, optional secondary
 *     immediately LEFT OF CONTINUE in the right-hand cluster"* — which was
 *     accurate right up until `E011`, and was written to correct the first one.
 *
 * ⚠⚠ THIS DOCBLOCK HAS BEEN WRONG ABOUT THE FOOTER ONCE BEFORE, and the note it
 * carried said so: two comments in this file disagreed and the header was the
 * wrong one. It is kept in step here for that reason. If you move the footer
 * again, this paragraph is the second thing to change.
 */
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
  /**
   * Per-step stepper heading (brief_S / E024–E028, E033–E035). Replaces the
   * generic "Build Your Profile" — Scott's walk asked for the step's own name
   * (e.g. "Your Experience") beside the counter.
   */
  stepLabel?: string;
  /**
   * ⚠ ADDITIVE, AND ONBOARDING DOES NOT PASS IT. `/assess` shows FIVE named
   * sections over fifteen screens (E036), so its counter reads "Section 2 of 5 ·
   * Capability Domains" rather than "2/15". Pass a string to replace the numeric
   * `step/totalSteps` counter, or `null` to hide it — `step` and `totalSteps` are
   * still what drive the progress BAR, so a bar that advances one screen at a time
   * keeps working under a label that names sections. A bar that jumped 20% per
   * section would sit motionless through ten consecutive domain screens.
   */
  counterText?: string | null;
  /**
   * A second, lighter line under the counter row. `/assess` puts the within-section
   * position there — bare `4 of 10`, never "Domain 4 of 10", because the word
   * *domain* is reserved for capability domains.
   */
  subCounter?: string | null;
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
  /*
    ── ⚠⚠ TWO EXITS, ONE SLOT (`P1-A1.4-E413` WS-6) ──────────────────────────

    SCOTT, 2026-09-10, asked directly and answered directly: *"'Finish Later' —
    do it."* `E406` WS-2 stopped on this; the stop is released.

    ⚠⚠ BUT THE REASON IT STOPPED IS A REAL CONSTRAINT AND IT IS WRITTEN DOWN:
    *"`WizardShell` has ONE secondary slot and the counted provider steps
    already spend it on 'Skip for Now'; putting 'Finish later' on them would
    take that away."* ⚠ THEY ARE DIFFERENT VERBS AND BOTH ARE NEEDED —
    **Skip for Now** moves past *this question*, **Finish later** leaves *the
    whole wizard*. Replacing one with the other is not a fix, it is a swap.

    ⚠ SO THE CENTRE SLOT RENDERS BOTH, rather than a fourth column being added.
    ⚠⚠ THE THREE-COLUMN GEOMETRY IS LOAD-BEARING and this shell says why a few
    lines down: each slot is `flex-1` so the centre is *"a real centre of the
    band and stays centred when a slot is empty"*. A fourth column moves that
    centre on every wizard in the product, including the two that are not asking
    for anything.

    ⚠ NAMED FOR WHAT IT DOES, NOT ITS RANK. `tertiary` would say where it sits;
    `leave` says what it is — the exit from the wizard, as against the secondary,
    which is the exit from the question.

    ⚠⚠ AND IT IS INERT FOR EVERY EXISTING CALLER. Omit it and this renders
    exactly what it rendered before: the divider is conditional on BOTH being
    present, and the `gap` added to the row has no effect on a single child. The
    requester wizard passes `secondaryLabel="Finish later"` and nothing else, so
    its footer is unchanged — asserted as an absence in `check:project-parent`.
  */
  leaveLabel?: string;
  onLeave?: () => void;
  hideFooter?: boolean;
  /** Optional slot rendered between the title block and step content. */
  banner?: ReactNode;
  /** Optional right-hand column (e.g. the E012 testimonial card). */
  aside?: ReactNode;
  /** Widen the frame for two-column steps. */
  wide?: boolean;
  /**
   * Close the gap between the title block and the step content (E188).
   *
   * OPT-IN, not a new default. The 32px gap is right on a step whose body is a
   * form or a list — it separates the question from the answer. It is wrong on
   * the wrap-up, whose body opens with a 140px avatar panel: the panel supplies
   * its own visual break, so the standard gap stacked on top of it pushed the
   * Country field and the photo down the page for no reason. One step's problem
   * gets one step's fix rather than a global re-tune that would have to be
   * re-checked on all thirteen.
   */
  tightBody?: boolean;
  /** Passed to OnboardingFrame — see its `className`. */
  frameClassName?: string;
  /**
   * Passed straight to `OnboardingFrame` — see its `chrome` docblock (`E267`).
   * Default `true`, so every existing caller is byte-identical in behaviour.
   */
  chrome?: boolean;
}) {
  const showCounter = typeof step === "number";
  const showStepper = showCounter || typeof progress === "number";
  const pct = showCounter
    ? Math.max(4, Math.min(100, (step! / totalSteps) * 100))
    : Math.max(4, Math.min(100, (progress ?? 0) * 100));
  // WS2/E081 — every step now sits in the shared widened frame. `wide` used to
  // be the only way to get 5xl and is kept as a no-op alias so the two-column
  // steps that pass it keep working; the difference it named is gone.
  const width = FRAME_WIDTH;
  void wide;

  const footer = hideFooter ? undefined : (
    <>
      {/*
        ── ⚠⚠ THREE EXPLICIT SLOTS: BACK LEFT, SECONDARY CENTRE, CONTINUE RIGHT
           (`P2-J1.1-E011`, 2026-09-05) ────────────────────────────────────────

        ⚠ THE COMMENT THAT STOOD HERE DESCRIBED A LAYOUT THIS FILE DID NOT
        RENDER, and it is corrected rather than reworded. It opened *"Footer band
        (WS2): secondary far-left, primary far-right"* while the code below put
        the secondary on the RIGHT, grouped with `Continue` inside an `ml-auto`
        cluster. A stale comment is how a later reader inherits a false premise;
        this one had been wrong long enough to be quoted in the docblock at the
        top of the file as proof the code was right.

        ⚠ SUPERSEDED, quoted not deleted — `E032`'s finding, which this replaces:

            *"Skip stays immediately left of Next rather than moving to the left
            with Back — beside Back it reads as a way BACKWARD, beside Next as a
            way past this step."*

        ⚠⚠ THAT IS NOT REVERSED, IT IS ANSWERED. `E032` was deciding LEFT versus
        RIGHT, and both of its answers were wrong for the same reason: a
        secondary touching either control borrows that control's meaning. A
        CENTRE slot is adjacent to neither, so `Finish later` reads as neither a
        way backward nor a way forward — it reads as leaving. `E032`'s
        observation about adjacency is what makes the centre the right answer.

        ⚠ THE SLOTS ARE EQUAL-FLEX, NOT MEASURED. Each takes `flex-1` inside
        `OnboardingFrame`'s footer row, so the centre is a real centre of the
        band and stays centred when a slot is empty — which is most of step 1,
        where `canBack` is false. No widths, no margins, no `ml-auto`.

        ⚠ ONE SHAPE FOR EVERY WIZARD, AND NO POSITION PROP. `Finish later`
        (requester), `Skip for Now` (provider), `None apply`, `I'm not sure yet`
        and `Not ready to set a budget` (work request) all render through this
        one slot and all moved together. Scott: *"whatever footer we have, i want
        it consistent."* Two footers that differ is the thing this fixes.
      */}
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
        {/* ⚠ THE DIVIDER EXISTS ONLY WHEN BOTH DO — one verb must not gain a
            stray separator, which is what would leak this change onto the
            requester's footer. `aria-hidden`: it is punctuation, not content. */}
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
      {/* Stepper — inside the frame, so it can never overflow (E003). */}
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
