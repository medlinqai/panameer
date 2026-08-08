/**
 * THE FOCUS STRIP'S MEMORY (E061).
 *
 * One thing gets remembered: which audience was last chosen. It lives in a
 * cookie, it is read BEFORE FIRST PAINT by the boot script below, and it never
 * changes where you land.
 *
 * THE STRIP IS PERMANENT NOW (E061). It used to be dismissible, with a second
 * cookie and a CSS rule that hid it. Both are gone: the strip's job is to get
 * a side picked, and a control whose only function is to make that question go
 * away unanswered was working against it. It stays until the visitor chooses.
 *
 * ⚠ REMEMBER-ONLY. THE COOKIE MUST NOT REDIRECT `/`. Scott's constraint, and
 * the right one: a returning visitor who types panameer.com and is silently
 * bounced to /for-buyers has lost the neutral page and has no idea why. The
 * cookie pre-highlights the option they picked last time. That is the whole
 * behaviour.
 *
 * WHY A PRE-PAINT SCRIPT AND NOT A SERVER READ. Reading the cookie in the page
 * would opt `/` out of static prerendering — it is one of 200-odd statically
 * generated routes and the gate requires it stay that way. Reading it in an
 * effect would paint the ring a frame late, which on a highlight is a visible
 * twitch. Writing an attribute on <html> before paint costs neither: same
 * pattern, same file position and same reasoning as THEME_BOOT_SCRIPT.
 *
 * A SESSION COOKIE, deliberately — no max-age. Which side someone is browsing
 * as is a statement about this visit, not a year-long preference.
 */

export const FOCUS_AUDIENCE_COOKIE = "pnmr_focus";

/**
 * Runs in <head>, before the first paint.
 *
 * Defensive to the point of paranoia because it is a blocking script on every
 * marketing page: any throw here delays paint for a strip nobody would miss.
 */
export const FOCUS_BOOT_SCRIPT = `
try {
  var a = document.cookie.match(/(?:^|; )${FOCUS_AUDIENCE_COOKIE}=(buyer|provider)/);
  if (a) document.documentElement.setAttribute("data-focus", a[1]);
} catch (e) {}
`.trim();
