"use client";

import { ToggleRow, postSetting } from "@/components/settings/controls";

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
export function ProfileVisibilityCard({
  paused,
  completeness,
}: {
  paused: boolean;
  completeness: number;
}) {
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
    <section className="mt-7 border-t border-line pt-5">
      <h4 className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        Visibility
      </h4>
      <ToggleRow
        label="Visible to buyers"
        checked={!paused}
        tone="ink"
        onChange={async (next) =>
          (await postSetting("/api/settings/profile", { paused: !next })) === null
        }
      />
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
        Buyers can find you in the marketplace. Pausing hides your profile
        without deleting anything. You are {completeness}% complete.
      </p>
    </section>
  );
}
