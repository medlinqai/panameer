/**
 * Title normalization for Learn matching (brief_learn_video_url_load).
 *
 * A PORT of `norm()` in scripts/learn_thumbnails.py, deliberately — that
 * function decided which picture went on which lesson and the same rows are now
 * being matched again for video. Two matchers with two different ideas of what
 * "the same title" means would attach a thumbnail and a video to different
 * lessons from identical spreadsheet text, which is the worst kind of drift:
 * silent, and only visible to whoever notices the video doesn't match the
 * picture.
 *
 * Strips leading numbering ("1. ", "2.5 - "), accents, punctuation and case,
 * and collapses whitespace. NOT stemming, NOT fuzzy: this decides which URL
 * goes on which lesson, and "close enough" is exactly the class of mistake the
 * never-guess-attach rule exists to prevent.
 */
export function normalizeLearnTitle(input: string | null | undefined): string {
  if (!input) return "";
  let s = input.normalize("NFKD").replace(/\p{M}/gu, "");
  s = s.replace(/ /g, " ");
  // Leading numbering, multi-level, any of . ) - – — as the separator.
  s = s.replace(/^\s*\d+(?:\.\d+)*\s*[.)\-–—]*\s*/, "");
  s = s.toLowerCase().replace(/&/g, " and ");
  s = s.replace(/[^a-z0-9]+/g, " ");
  return s.replace(/\s+/g, " ").trim();
}
