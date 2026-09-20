/**
 * ── ⚠⚠ WHERE SOMEBODY IS, RENDERED THE SAME WAY ON EVERY PAGE ─────────────
 *
 * `P2-J3-E591` rider, 2026-09-20. ⚠ SCOTT: *"title-case only when the stored
 * value is entirely lowercase; otherwise render as stored. State/country code
 * stays uppercase. Match explore.ts so a city can't render two ways on two
 * pages."*
 *
 * ⚠⚠⚠ THE STORED VALUE IS NEVER REWRITTEN. This is a DISPLAY rule and nothing
 * here writes to the database. What somebody typed stays what they typed.
 *
 * ── ⚠ ONE RULE COVERS BOTH THE CITY AND THE REGION ────────────────────────
 *
 * ⚠⚠ NO SPECIAL CASE FOR "IS THIS A CODE" IS NEEDED, and that is why the rule
 * is stated the way it is. Measured across all 197 `Address` rows, 2026-09-20:
 *
 *     city   88 with a value — 26 entirely lowercase, 0 entirely UPPERCASE,
 *            62 already mixed and left exactly as stored
 *     state  `IL` · `FL` · `MO` · `NY` · `CABA` · `TX` · `England` · `new york`
 *
 * ⚠ `FL` is not entirely lowercase, so it renders as `FL`. `CABA` likewise.
 * `England` likewise. `new york` IS entirely lowercase, so it becomes
 * `New York` — which is right, because it is a name somebody typed carelessly
 * rather than a code. ⚠⚠ A CODE IS NEVER ALL-LOWERCASE, so the one test sorts
 * them without ever having to guess which is which.
 *
 * ── ⚠⚠ WHY THIS IS NOT `capitalizeName` ───────────────────────────────────
 *
 * ⚠ `lib/display.ts`'s `capitalizeName` normalises **all-upper input too** —
 * its own comment says *"all-lower or all-upper"*. ⚠⚠⚠ THAT WOULD TURN `FL`
 * INTO `Fl`, which is the one outcome Scott named as wrong.
 * ⚠ It stays exactly as it is: it is used for PEOPLE'S NAMES, where an
 * all-caps surname genuinely is shouting rather than a code.
 *
 * ⚠ MEASURED BEFORE CHANGING `explore.ts` TO USE THIS: **zero stored cities are
 * all-uppercase**, so pointing that page here changes nothing it renders today.
 * The divergence it removes is the FUTURE one.
 */

/** ⚠ A value somebody typed, or nothing. `"null"` is a real stored string. */
function clean(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  return s && s.toLowerCase() !== "null" ? s : null;
}

/**
 * ⚠⚠ TITLE-CASE ONLY WHEN THE WHOLE VALUE IS LOWERCASE. Anything else is
 * somebody's own capitalisation — or a code — and is rendered verbatim.
 * ⚠ Word breaks include hyphens and apostrophes, so `winston-salem` and
 * `o'fallon` come out right.
 */
export function displayPlacePart(raw: string | null | undefined): string | null {
  const s = clean(raw);
  if (!s) return null;
  if (s !== s.toLowerCase()) return s;
  return s.replace(/(^|[\s\-'’])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * `"Saint Augustine, FL"`, or null when there is nothing to say.
 *
 * ⚠⚠ NULL RATHER THAN A DANGLING COMMA. `", United States"` is how a page
 * announces it is rendering a hole — the reason `explore.ts` filtered before
 * joining, kept here verbatim.
 */
export function formatPlace(...parts: (string | null | undefined)[]): string | null {
  const out = parts.map(displayPlacePart).filter((s): s is string => Boolean(s));
  return out.length ? out.join(", ") : null;
}
