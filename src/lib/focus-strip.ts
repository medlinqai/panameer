/**
 * THE FOCUS STRIP'S MEMORY (E061).
 *
 * Two things get remembered: whether the strip was dismissed, and which
 * audience was last chosen. Both live in cookies, both are read BEFORE FIRST
 * PAINT by the boot script below, and neither ever changes where you land.
 *
 * ⚠ REMEMBER-ONLY. THE COOKIE MUST NOT REDIRECT `/`. Scott's constraint, and
 * the right one: a returning visitor who types panameer.com and is silently
 * bounced to /for-buyers has lost the neutral page and has no idea why. The
 * cookie pre-highlights the option they picked last time. That is the whole
 * behaviour.
 *
 * WHY A PRE-PAINT SCRIPT AND NOT A SERVER READ. Reading cookies in the page
 * would opt `/` out of static prerendering — it is one of 200-odd statically
 * generated routes and the brief's own gate requires it stay that way. Reading
 * them in an effect instead would flash the strip at every returning visitor
 * who had already dismissed it, which is precisely what dismissing was for.
 * Writing an attribute on <html> before paint costs neither: same pattern, same
 * file position and same reasoning as THEME_BOOT_SCRIPT, which solves the
 * identical problem for dark mode.
 *
 * SESSION COOKIES, deliberately — no max-age. "I dismissed this" is a statement
 * about this visit, not a year-long preference, and a strip that never comes
 * back cannot be found again by someone who wants it.
 */

export const FOCUS_DISMISSED_COOKIE = "pnmr_focus_dismissed";
export const FOCUS_AUDIENCE_COOKIE = "pnmr_focus";

/**
 * Runs in <head>, before the first paint.
 *
 * Defensive to the point of paranoia because it is a blocking script on every
 * marketing page: any throw here delays paint for a strip nobody would miss.
 */
export const FOCUS_BOOT_SCRIPT = `
try {
  var m = document.cookie.match(/(?:^|; )${FOCUS_DISMISSED_COOKIE}=1/);
  if (m) document.documentElement.setAttribute("data-focus-dismissed", "1");
  var a = document.cookie.match(/(?:^|; )${FOCUS_AUDIENCE_COOKIE}=(buyer|provider)/);
  if (a) document.documentElement.setAttribute("data-focus", a[1]);
} catch (e) {}
`.trim();
