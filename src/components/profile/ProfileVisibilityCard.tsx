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
/*
  ── ⚠⚠ THREE PROPS ARRIVE WITH `P2-A1.1-E738` ────────────────────────────────
  ⚠ `previewHidden` and `publicName` are the two public-preview switches; both
  are the SERVER's answer at render time, exactly like `paused`.
  ⚠⚠ `publicUrl` is the member's own `/in/<slug>` ABSOLUTE url, resolved on the
  server. ⚠⚠⚠ **IT IS NOT BUILT HERE FROM `window.location`**: this component is
  a client component, and a URL assembled in the browser is wrong during SSR,
  wrong in a screenshot and wrong in anything the member pastes before
  hydration. ⚠ `null` when the member has no slug yet — the row is then absent
  rather than showing a broken link.
*/
export function ProfileVisibilityCard({
  paused,
  previewHidden = false,
  publicName = false,
  publicUrl = null,
}: {
  paused: boolean;
  previewHidden?: boolean;
  publicName?: boolean;
  publicUrl?: string | null;
}) {
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
  /* ⚠ Same reasoning as `visible` above: the copy follows the SWITCH, not the
     prop, so a line can never describe the position the control was in before
     the member touched it. `ToggleRow` fires on its revert too. */
  const [preview, setPreview] = useState(!previewHidden);
  const [named, setNamed] = useState(publicName);
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

      {/*
        ── ⚠⚠⚠ THE TWO PUBLIC-PREVIEW SWITCHES (`P2-A1.1-E738`) ────────────────

        ⚠ THEY SIT UNDER `Visible to buyers` BECAUSE THEY ARE SUBORDINATE TO IT:
        a member who is not visible to buyers is not in Browse Talent either,
        whatever these say. ⚠⚠ The masked reads apply them ON TOP of
        `marketplaceVisibleWhere()`, so the nesting on screen matches the nesting
        in the code.
      */}
      <div className="mt-4 border-t border-line pt-4">
        <ToggleRow
          label="Show My Masked Preview to Visitors"
          checked={!previewHidden}
          tone="ink"
          onValueChange={(next) => setPreview(next)}
          onChange={async (next) =>
            (await postSetting("/api/settings/profile", {
              previewHidden: !next,
            })) === null
          }
        />
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
          {/* ⚠⚠ IT NAMES WHAT IS SHOWN **AND** WHAT IS NOT, because a member
              asked to show a "preview" to strangers will reasonably assume the
              worst unless told. ⚠ No percentages, no promises. */}
          {preview
            ? "People who are not signed in can see your title, skills, certifications and the shape of your work history \u2014 never your name, photo, employers, clients, rates or contact details. Turning this off removes you from Browse Talent."
            : "You are not shown to people who are signed out. Share links to your profile show a \u201cnot available\u201d page. Nothing has been deleted."}
        </p>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <ToggleRow
          label="Public Profile with My Name"
          checked={publicName}
          tone="ink"
          onValueChange={(next) => setNamed(next)}
          onChange={async (next) =>
            (await postSetting("/api/settings/profile", { publicName: next })) === null
          }
        />
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
          {/* ⚠⚠⚠ THE OFF LINE DESCRIBES THE DEFAULT, NOT A LOSS. Off is what
              every member starts as, so the copy must not read as a penalty. */}
          {named
            ? "Your personal link below shows your name, photo and employers to anyone, and search engines may list it. Your rates and contact details still need a free sign-up, and client names stay hidden."
            : "Your personal link below shows the masked preview instead of your name. Turn this on if you want to use it in an email signature."}
        </p>
      </div>

      {/*
        ── ⚠⚠ "YOUR PUBLIC LINK" (`P2-A1.1-E738`, the lane 4 addition) ─────────
        ⚠ SCOTT: *"Owner sees 'Your public link' + Copy under Visibility and in
        the profile share bar (the share bar uses this URL)."*
        ⚠⚠ The row renders whatever the switch above says, because the link
        WORKS either way — it serves the masked preview when naming is off. ⚠⚠⚠
        HIDING IT WHEN NAMING IS OFF WOULD IMPLY THE URL IS DEAD, and a member
        who already pasted it into a signature needs to know it still resolves.
      */}
      {publicUrl && <PublicLinkRow url={publicUrl} />}
    </section>
  );
}

/**
 * ⚠⚠ Copy-to-clipboard, with a visible confirmation and a working fallback.
 *
 * ⚠⚠⚠ **THE URL IS IN AN `<input readOnly>`, NOT ONLY BEHIND A BUTTON.**
 * `navigator.clipboard` needs a secure context and can be refused outright, so
 * a Copy button is the convenience and **selecting the text is the guarantee**.
 * ⚠ A copy affordance that silently fails is worse than none: the member walks
 * away believing they have the link.
 */
function PublicLinkRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 border-t border-line pt-4">
      <h4 className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        Your Public Link
      </h4>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label="Your public profile link"
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-[4px] border border-line bg-bg-soft px-2.5 py-1.5 text-[12.5px] text-ink-2"
        />
        <button
          type="button"
          className="shrink-0 rounded-[4px] border border-ink px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-bg-soft"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* ⚠ Clipboard refused (insecure context, permissions). Select the
                 text so the member can copy it themselves — never a dead
                 button and never a silent failure. */
              const el = document.querySelector<HTMLInputElement>(
                'input[aria-label="Your public profile link"]'
              );
              el?.select();
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
