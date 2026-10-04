
function clean(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  return s && s.toLowerCase() !== "null" ? s : null;
}

export function displayPlacePart(raw: string | null | undefined): string | null {
  const s = clean(raw);
  if (!s) return null;
  if (s !== s.toLowerCase()) return s;
  return s.replace(/(^|[\s\-'’])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function formatPlace(...parts: (string | null | undefined)[]): string | null {
  const out = parts.map(displayPlacePart).filter((s): s is string => Boolean(s));
  return out.length ? out.join(", ") : null;
}
