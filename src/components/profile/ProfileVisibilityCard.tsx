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
  return (
    <section className="rounded-brand border border-line bg-white px-[18px] py-4">
      <h3 className="mb-1 font-display text-[14.5px] font-bold leading-tight">
        Visibility
      </h3>
      <p className="mb-2.5 text-[12.5px] leading-relaxed text-ink-2">
        Whether buyers can find you in the marketplace. Pausing hides your
        profile without deleting anything — your work history, packages and
        skills are exactly where you left them.
      </p>
      <ToggleRow
        label="Visible to buyers"
        /* ⚠⚠ THE COMPLETENESS SENTENCE IS THE CARD'S OWN AND IS NOT A SECOND
           DEFINITION: `completeness` comes from the view model, which reads the
           same `computeProfileScore` the Search Score page does. */
        hint={`Your profile is ${completeness}% complete. Completeness is what earns visibility; this switch is how you turn it off deliberately.`}
        checked={!paused}
        onChange={async (next) =>
          (await postSetting("/api/settings/profile", { paused: !next })) === null
        }
      />
    </section>
  );
}
