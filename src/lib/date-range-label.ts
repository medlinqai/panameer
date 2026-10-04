export function dateRangeLabel(
  start: string | null | undefined,
  end: string | null | undefined,
  isCurrent: boolean | null | undefined
): string {
  const y = (d: string | null | undefined) => (d ? d.slice(0, 4) : null);
  const s = y(start);
  const e = y(end);
  if (!s && !e && !isCurrent) return "";
  if (e) return s ? `${s} – ${e}` : `Ended ${e}`;
  if (isCurrent) return s ? `${s} – Present` : "Ongoing";
  return s ? `Started ${s}` : "";
}
