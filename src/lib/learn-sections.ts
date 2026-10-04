
export type SectionKind = "overview" | "create" | "find" | "change" | "other";

/** `"2. Create new"` → `"create new"`. Leading `N.` / `N)` / bare `N` + space. */
export function normalizeSectionTitle(title: string): string {
  return title
    .replace(/^\s*\d+\s*[.)]?\s*/, "")
    .trim()
    .toLowerCase();
}

export function sectionKind(title: string): SectionKind {
  const t = normalizeSectionTitle(title);
  if (/\bcreate\b/.test(t)) return "create";
  if (/\bfind\b/.test(t)) return "find";
  if (/\bchange\b/.test(t)) return "change";
  if (/\boverview\b/.test(t)) return "overview";
  return "other";
}
