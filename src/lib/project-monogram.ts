
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
    .filter((w) => /^[\p{L}\p{N}]/u.test(w));

  const significant = words.filter((w) => !SKIP.has(w.toLowerCase()));
  const source = significant.length > 0 ? significant : words;

  return source
    .slice(0, 2)
    .map((w) => [...w][0].toUpperCase())
    .join("");
}
