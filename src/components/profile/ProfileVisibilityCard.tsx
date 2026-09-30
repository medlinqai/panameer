"use client";

import { useState } from "react";
import { ToggleRow, postSetting } from "@/components/settings/controls";
import { visibilityHelp } from "@/lib/visibility-copy";

/**
 * ── ⚠⚠⚠ VISIBILITY, MOVED TO MY PROFILE (ruling 78) ─────────────────────
 *
 * ⚠ **RULING 78 SUPERSEDES 74's *"the other four stay"*.** The Profile
 * Visibility section is **deleted** — Project Preference, Linked Accounts, AI
 * Data Training, Earnings Privacy and Categories all go, **and Visibility moves
 * here.** The section and its rail item go with them.
 *
 * ⚠⚠ **IT ARRIVES IN THE SAME COMMIT THE SECTION LEAVES** — `E598`'s
 * leave-and-arrive, and `69b`. **Visibility is the one lever that touches the
 * marketplace gate**, so a window where it has no home is a window where a
 * provider cannot take themselves out of the market.
 *
 * ⚠⚠⚠ **AND IT BELONGS HERE ON THE MERITS, NOT ONLY BY INSTRUCTION.** Every
 * other control on this page edits what buyers see; **this one decides whether
 * they see any of it.** It was the only marketplace-facing switch living two
 * sections away from the thing it switches off.
 *
 * ── ⚠⚠ NOTHING IS REBUILT. THE CONTROL, THE ROUTE AND THE COPY ALL MOVE ──
 *
 * ⚠ `ToggleRow` and `postSetting` are the **settings** controls, imported
 * rather than re-implemented: the optimistic flip, the busy state and the
 * revert-on-failure are one behaviour and stay one (`E585`). ⚠⚠ The endpoint is
 * **unchanged** — `/api/settings/profile` with `{ paused }` — so **no new
 * writer**, and `updateProfileSettings`' own comment still describes it:
 * *"`paused_at` is a timestamp rather than a boolean because 'since when' is
 * the useful question when a provider asks why they stopped getting work."*
 * ⚠ The description and the hint are the strings that were on the card,
 * carried across verbatim rather than rewritten.
 */
/*
  ⚠⚠ `completeness` IS NO LONGER A PROP (`E718` item 8). Its only reader was the sentence
  *"You are N% complete"*, which Scott removed because the **Search Score block directly above
  already states that figure** — `E585` applied to a number. ⚠ The prop is dropped rather than
  left unused: an unused parameter is a lint problem against a zero-new baseline, and a prop
  nobody reads invites the next person to render it again.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   export function ProfileVisibilityCard({ paused, completeness }:
  //     { paused: boolean; completeness: number }) {
*/
export function ProfileVisibilityCard({ paused }: { paused: boolean }) {
  /*
    ── ⚠⚠⚠ THE HELP LINE FOLLOWS THE SWITCH, NOT THE PROP (`P2-A2-E716`) ─────────

    ⚠ **SCOTT: when the switch is off the line reads something different.** ⚠⚠ `paused` is the
    SERVER's answer at render time; the switch flips optimistically, so reading the prop would
    leave the sentence describing the position the switch was in **before** the member touched
    it — a line contradicting the control it sits under.
    ⚠⚠⚠ **SO THE SWITCH REPORTS ITS OWN POSITION** (`ToggleRow`'s `onValueChange`) and this
    mirrors it. ⚠ `paused` remains the INITIAL value, which is correct: it is what the server
    said, and it is what the page should show before anybody clicks anything.
    ⚠ **A FAILED SAVE PUTS BOTH BACK** — `ToggleRow` fires the callback on its revert too, so
    the copy cannot be left claiming a state the save never reached.
  */
  const [visible, setVisible] = useState(!paused);
  /*
    ⚠⚠ THE BOX IS GONE (`P2-A2-E713` WS-A item 9). Scott: Visibility "loses its box too",
    separated by a thin line instead. ⚠ This component is rendered ONLY by `ConnectProfile`
    (measured), so nothing else is restyled by flattening it here.
    ⚠ SUPERSEDED, quoted not deleted (`E164`): the section carried
    rounded-brand + border + border-line + bg-white + px-[18px] + py-4.
  */
  /*
    ── ⚠⚠⚠ THE MOCKUP'S ORDER AND WEIGHT (`P2-A2-E715` row 8) ────────────────────

    ⚠ **SCOTT: the small-caps label `VISIBILITY`, one line `Visible to buyers` WITH the
    switch, one line of help — and the switch in INK.** ⚠⚠ What was here led with a
    FOUR-LINE explainer above the control, so the thing being explained was the last thing a
    reader reached.
    ⚠⚠⚠ **THE EXPLAINER IS SHORTENED, NOT DELETED, AND THE CLAUSE THAT SURVIVES IS THE
    LOAD-BEARING ONE:** *"without deleting anything"*. A provider deciding whether to pause
    is asking exactly one question — *do I lose my work?* — and dropping that sentence to
    match a mockup would make the control frightening to use.
    ⚠ **THE COMPLETENESS FIGURE IS KEPT** rather than dropped to save a line: it is a
    measured number and the sentence explains WHY visibility can be lost without touching
    this switch at all.
    ⚠ The eyebrow matches `CleanSide`'s exactly (12px, uppercase, 0.08em) so this block and
    Rates and Search Score read as one column rather than three treatments.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   <h3 className="mb-1 font-display text-[14.5px] font-bold leading-tight">Visibility</h3>
    //   <p className="mb-2.5 text-[12.5px] leading-relaxed text-ink-2">
    //     Whether buyers can find you in the marketplace. Pausing hides your
    //     profile without deleting anything — your work history, packages and
    //     skills are exactly where you left them.
    //   </p>
    //   <ToggleRow … hint={`Your profile is ${completeness}% complete. Completeness is what
    //     earns visibility; this switch is how you turn it off deliberately.`} … />
  */
  return (
    <section className="pm-rail-visibility pm-side mt-7 border-t border-line pt-5">
      <h4 className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        Visibility
      </h4>
      <ToggleRow
        label="Visible to buyers"
        checked={!paused}
        tone="ink"
        onValueChange={setVisible}
        onChange={async (next) =>
          (await postSetting("/api/settings/profile", { paused: !next })) === null
        }
      />
      {/*
        ── ⚠⚠⚠ TWO STATES, NAMED BY SCOTT 2026-09-30 (`P2-A2-E716`) ────────────────────

        ⚠ **THE WORD `Pausing` IS GONE FROM THIS LINE.** *"Turning visibility off"* names the
        control the member is looking at; *"pausing"* named an internal concept — the column
        is `paused_at` and the route is `/api/settings/pause` — that appears **nowhere on this
        screen.** ⚠⚠ A member cannot act on a verb the interface never shows them.
        ⚠⚠⚠ **THE OFF LINE SAYS WHAT IS TRUE, WHAT TO DO, AND WHAT WAS NOT LOST, IN THAT
        ORDER** — and it keeps *"Nothing has been deleted"*, which is the single question a
        provider actually has when their profile stops being findable.
        ⚠ **THE COMPLETENESS FIGURE IS DROPPED FROM THE OFF STATE ON PURPOSE:** *"you are 67%
        complete"* beside *"buyers can't find you"* reads as the REASON they cannot, and it is
        not — this switch is. It stays on the ON line, where it explains what still limits
        reach once the switch is no longer the thing doing it.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   Buyers can find you in the marketplace. Pausing hides your profile
        //   without deleting anything. You are {completeness}% complete.
      */}
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
        {visibilityHelp(visible)}
      </p>
    </section>
  );
}
