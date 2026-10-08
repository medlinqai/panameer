// Display-only clean-up of imported lesson text (Scott 2026-10-08). The stored data is untouched (admin still sees it).

/** "2.2 - The Best ERP Careers Options" → "The Best ERP Careers Options". The typed numbers clash with course numbering. */
export function lessonTitle(t: string): string {
  const s = t.replace(/^\s*\d+(?:\.\d+)*\s*[-–—:.)]\s*/, "").trim();
  return s || t;
}

/** Imported descriptions that are really a scraper's error page → no description. */
export function lessonDescription(d: string | null | undefined): string | null {
  const s = d?.trim();
  if (!s) return null;
  if (/sorry,? we.re having a little trouble|something went wrong|page not found|access denied/i.test(s)) return null;
  return s;
}
