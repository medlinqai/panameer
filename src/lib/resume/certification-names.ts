
/** Longest a segment may be and still read as a credential name, not prose. */
const MAX_PART = 80;

const HEADING_PREFIX =
  /^[A-Z][A-Z\s&()/-]*\b(?:CERTIFICATIONS?|CREDENTIALS?|LICEN[CS]ES?|ACCREDITATIONS?)\b[A-Z\s&()/-]*:\s*/;

/** The serial conjunction that marks the last item of a written list. */
const TRAILING_CONJUNCTION = /^(?:and|or|&)\s+(.+)$/i;

const clean = (v: string) => v.replace(/\s+/g, " ").trim().replace(/[.;,]+$/, "");

export function splitCertificationName(raw: string): string[] {
  const stripped = clean(raw.replace(HEADING_PREFIX, ""));
  if (!stripped) return [];

  const segments = stripped.split(",").map((s) => s.trim()).filter(Boolean);

  /* Not a list: no commas, or only one item after the split. */
  if (segments.length < 3) return [stripped];

  const tail = TRAILING_CONJUNCTION.exec(segments[segments.length - 1]);
  if (!tail) return [stripped];

  const parts = [...segments.slice(0, -1), tail[1]].map(clean).filter(Boolean);

  if (parts.length < 3 || parts.some((p) => p.length > MAX_PART)) {
    return [stripped];
  }
  return parts;
}
