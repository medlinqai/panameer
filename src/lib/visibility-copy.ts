/**
 * ── ⚠⚠⚠ THE VISIBILITY SWITCH'S HELP LINE, IN ONE PLACE (`P2-A2-E718` item 8) ─────────
 *
 * ⚠ **SCOTT, 2026-09-30:** on → *"Disable to hide your profile."* · off → *"Enable to show
 * your profile."* — *"Apply the same wording to `/settings`, so both places say the same
 * thing."*
 *
 * ⚠⚠ **IT IS A MODULE BECAUSE THE INSTRUCTION IS *"BOTH PLACES SAY THE SAME THING"*, AND TWO
 * COPIES OF A SENTENCE ARE EXACTLY WHAT STOPS BEING TRUE.** `E716` reported this drift as a
 * finding: `/profile` got the new wording and `ProfileSettingsForm` kept *"Pausing hides your
 * profile…"*, so one switch described itself two ways on two screens. **Fixing it by typing
 * the new sentence twice would have rebuilt the same defect with better words.**
 * ⚠⚠⚠ **THE WORD `Pausing` IS GONE FROM BOTH.** It named an internal concept — the column is
 * `paused_at`, the route is `/api/settings/pause` — that appears on neither screen. **A member
 * cannot act on a verb the interface never shows them**, and the control says `Visible to
 * buyers`, so the help line now names what the control DOES.
 *
 * ⚠ **THE COMPLETENESS SENTENCE IS GONE, AND IT IS NOT LOST:** Scott — *"Remove 'You are 93%
 * complete' (Search Score already shows it)."* The figure is rendered by the Search Score
 * block a few centimetres above, which is `E585` applied to a NUMBER rather than to a rule.
 */
export const VISIBILITY_HELP = {
  /** Shown while the switch is ON — it names the action, not the state. */
  on: "Disable to hide your profile.",
  /** Shown while the switch is OFF. */
  off: "Enable to show your profile.",
} as const;

/** The one help line for a given switch position. */
export function visibilityHelp(visible: boolean): string {
  return visible ? VISIBILITY_HELP.on : VISIBILITY_HELP.off;
}
