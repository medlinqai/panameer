"use client";

import { Field, TextInput } from "@/components/onboarding/controls";

/**
 * ── ⚠⚠ THE TITLE EDITOR, EXTRACTED (`P2-A2-E597` WS-B, editor 1 of 5) ─────
 *
 * ⚠ SMALLEST FIRST, by WS-A's measured order: 46 lines, and both primitives it
 * mounts (`Field`, `TextInput`) were ALREADY shared. Nothing moved with it.
 *
 * ── ⚠⚠⚠ ONE COMPONENT, ONE SAVE, THREE MOUNTS ────────────────────────────
 *
 * ⚠ `E412` hoisted this body into a helper *"the step and the modal both
 * mount"*. This takes it one step further out — out of `JoinProviderPage`'s
 * closure entirely — so a THIRD caller (`/connect/edit/title`, WS-C) can mount
 * the same fields without importing a 5,779-line page.
 * ⚠⚠ IT IS PRESENTATION ONLY. It holds no state, no `postStep`, no navigation.
 * The caller owns the value and the save.
 * ⚠⚠⚠ TWO SAVE PATHS FOR ONE FIELD IS HOW THE TWO TITLES HAPPENED (`E595`) —
 * a provider wizard writing `ProviderProfile.headline` while the requester
 * wizard wrote `Person.title`. That is the defect this whole brief exists to
 * make structurally impossible, so the save stays with ONE caller.
 *
 * ── ⚠ THE WIRE KEY IS STILL `headline`, AND THAT IS DELIBERATE ───────────
 *
 * ⚠⚠ `E595` WS-B COLLAPSED THE COLUMN, NOT THE CONTRACT. `postStep("title", {
 * headline })` still posts `headline`; the server writes `Person.title`.
 * Renaming the prop here would imply the wire changed, and it did not.
 */

/**
 * ⚠⚠ CAPPED AT 42, AND THE CAP IS THE CARD'S. Moved here with the field so the
 * number and the input that enforces it cannot drift apart.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — it lived at `page.tsx:611`:
 * //   const HEADLINE_MAX = 42;
 */
export const HEADLINE_MAX = 42;

/**
 * ⚠ THE SAVE GATE, SHARED BY THE STEP AND THE MODAL. `E412`'s review Save and
 * the step's Continue asked the same question in two places; now they ask it
 * here. ⚠⚠ A blank title cannot be saved from either.
 */
export function titleCanSave(headline: string): boolean {
  return headline.trim() !== "";
}

export function TitleEditor({
  value,
  onChange,
}: {
  value: string;
  /** ⚠ Already capped — the caller stores exactly what it is given. */
  onChange: (next: string) => void;
}) {
  return (
    <>
      {/*
        WS-4 — CAPPED AT 42 WITH A LIVE COUNTER, fixed at the source.

        This field IS the talent card's title, and the card renders it on
        ONE line with a 42-character soft cap (lib/assessment aside, see
        `cardTitle` in lib/explore.ts). It allowed 200, so a provider could
        write a title that the card would silently cut — the truncation
        being the first time anyone found out, on a page the provider never
        looks at.

        Capping the INPUT rather than widening the card is the right end:
        the constraint is real (one line, in a 380px card) and the person
        best placed to choose what survives it is the one writing it.

        The counter turns magenta over 36 so it warns before it blocks —
        a field that just stops accepting keystrokes reads as broken.
      */}
      <Field
        label="Your Title"
        hint="This is the title buyers see on your profile — one line, so keep it tight."
      >
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, HEADLINE_MAX))}
          placeholder="e.g. Oracle Cloud P2P / Procurement Expert"
          maxLength={HEADLINE_MAX}
        />
      </Field>
      <p
        className={
          "mt-1.5 text-right text-[13px] font-semibold tabular-nums " +
          (value.length > HEADLINE_MAX - 6 ? "text-magenta" : "text-ink-2")
        }
      >
        {value.length} / {HEADLINE_MAX}
      </p>
    </>
  );
}
