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
