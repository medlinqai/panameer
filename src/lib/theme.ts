
export type ThemeChoice = "auto" | "light" | "dark";

export const THEME_STORAGE_KEY = "panameer.theme";

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

// AN EXTERNAL STORE, so the menu can render the current choice without an
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

/** Persist a choice and apply it immediately. */
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
