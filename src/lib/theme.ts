/**
 * Theme selection (J2.4 WS-B / E021) — Auto · Light · Dark.
 *
 * CLIENT-SIDE ON PURPOSE, and worth saying why rather than treating it as the
 * lazy option. A theme is a property of the DEVICE you are reading on, not of
 * the account: the same person on a laptop at noon and a phone at midnight
 * wants different answers, and a column on ProviderProfile would force one on
 * both. `localStorage` is per-device, which is the correct grain. It also means
 * the choice applies before React mounts (see the blocking script in the root
 * layout), so there is no flash of the wrong theme.
 *
 * `auto` is the DEFAULT and stores nothing — an absent key means "follow the
 * device", so a user who never opens the menu inherits their OS setting and a
 * user who picks Auto explicitly clears their override rather than pinning the
 * current OS answer.
 */

export type ThemeChoice = "auto" | "light" | "dark";

export const THEME_STORAGE_KEY = "panameer.theme";

/**
 * The script that runs BEFORE first paint, inlined into <head>.
 *
 * It is a string rather than a module because it has to execute synchronously
 * ahead of hydration; anything imported and mounted by React is already too
 * late and produces the white flash this exists to avoid. Kept to one
 * expression, and wrapped in try/catch because Safari's private mode throws on
 * `localStorage` access rather than returning null.
 */
export const THEME_BOOT_SCRIPT = `
try {
  var c = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  var d = c === "dark" || (c !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", d ? "dark" : "light");
} catch (e) {}
`.trim();

/** Read the stored choice. Anything unrecognised is treated as `auto`. */
export function readThemeChoice(): ThemeChoice {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw === "light" || raw === "dark" ? raw : "auto";
  } catch {
    return "auto";
  }
}

/*
  AN EXTERNAL STORE, so the menu can render the current choice without an
  effect that setStates on mount.

  localStorage genuinely IS an external store, which makes `useSyncExternalStore`
  the right primitive rather than a workaround for the lint rule: it takes a
  server snapshot ("auto", what the markup is built against) and swaps to the
  client snapshot during hydration, which is exactly the behaviour a
  read-after-mount effect was approximating. `storage` events cover other tabs;
  the local listener set covers this one, because a tab does not receive its own
  storage event.
*/
const listeners = new Set<() => void>();

export function subscribeThemeChoice(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The client snapshot. Must be referentially stable — it returns a string. */
export const themeChoiceSnapshot = readThemeChoice;

/** The server snapshot: no storage, so nobody has chosen anything yet. */
export const themeChoiceServerSnapshot = (): ThemeChoice => "auto";

/**
 * Persist a choice and apply it immediately.
 *
 * Resolving `auto` here rather than leaving the attribute off keeps ONE code
 * path in the CSS: `[data-theme]` is always present and always one of two
 * values, so no stylesheet has to handle the "unset" case as a third state.
 */
export function applyThemeChoice(choice: ThemeChoice): void {
  if (typeof window === "undefined") return;
  try {
    if (choice === "auto") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // A blocked storage API must not stop the theme applying for this session.
  }

  const dark =
    choice === "dark" ||
    (choice === "auto" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");

  for (const listener of listeners) listener();
}
