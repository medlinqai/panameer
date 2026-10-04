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
