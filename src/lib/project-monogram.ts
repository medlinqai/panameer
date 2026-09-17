/**
 * ── ⚠⚠ A PROJECT'S MONOGRAM (`P2-J1.4-E512`) ───────────────────────────────
 *
 * PURE. No React, no prisma — the card renders it, this decides it.
 *
 * ⚠ SCOTT, 2026-09-13, on the folder emoji: *"Do we have a better icon?"*
 * ⚠⚠ THE ANSWER IS A MONOGRAM, AND THIS PROJECT HAS DECIDED IT TWICE: `E453b`
 * put INITIALS behind the avatar photo, and the vendor tiles shipped monograms
 * (`EBS` · `OFC` · `PS` · `SF` · `WD`) rather than wait on licensed logos.
 *
 * ⚠ AN EMOJI IS A SYSTEM FONT GLYPH: macOS paints a grey-lavender folder onto a
 * pale magenta wash — two soft things stacked, no contrast — and it renders
 * differently on every operating system. ⚠⚠ A letter renders identically
 * everywhere and says more, because a project HAS a name.
 *
 * ── THE RULE ───────────────────────────────────────────────────────────────
 *
 *   · up to TWO letters, from the first two SIGNIFICANT words;
 *   · leading articles and prepositions are skipped — "The Ceres Migration"
 *     is `CM`, not `TC`, because "The" identifies nothing;
 *   · ONE significant word gives ONE letter — "Vanguard" is `V`, never `VA`,
 *     which would read as an acronym the project does not have;
 *   · digits count as letters: "3M Rollout" is `3R`;
 *   · ⚠ a name with no letters or digits at all gives an EMPTY string, and the
 *     caller renders an empty tile. ⚠⚠ NOT "?" — Scott, 2026-09-17: *"I am not
 *     showing a buyer a question mark."*
 *
 * ⚠⚠ THE REDACTED CASE NEVER REACHES HERE. `🔒` stays a glyph: it is a STATE,
 * not an identity, and a monogram there would leak the very initial the
 * redaction exists to hide.
 */

/** Words that identify nothing on their own. */
const SKIP = new Set([
  "the", "a", "an", "of", "and", "or", "for", "to", "at", "on", "in",
  "with", "by", "from", "via", "per",
]);

export function projectMonogram(name: string | null | undefined): string {
  const words = (name ?? "")
    .split(/[\s\-–—_/\\|,.:;()[\]{}"']+/)
    .map((w) => w.trim())
    .filter(Boolean)
    /* ⚠ A word only counts if it STARTS with a letter or digit — "(remote)" and
       "&" identify nothing either. */
    .filter((w) => /^[\p{L}\p{N}]/u.test(w));

  const significant = words.filter((w) => !SKIP.has(w.toLowerCase()));
  /* ⚠ ALL stop-words is still a name: "The Of" falls back to the raw words so
     the tile is not blank for a real title. */
  const source = significant.length > 0 ? significant : words;

  return source
    .slice(0, 2)
    .map((w) => [...w][0].toUpperCase())
    .join("");
}
