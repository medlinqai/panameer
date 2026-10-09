
export function capitalizeName(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  // Only normalize when the input carries no intentional casing (all-lower or
  // all-upper). Anything else is the user's own capitalization — respect it.
  const allOneCase = s === s.toLowerCase() || s === s.toUpperCase();
  if (!allOneCase) return s;
  return s
    .toLowerCase()
    .replace(/(^|[\s\-'’])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** First name for greetings — capitalized, first token only. */
export function displayFirstName(raw: string | null | undefined): string {
  return capitalizeName(raw).split(/\s+/)[0] ?? "";
}

export function displayFullName(
  first: string | null | undefined,
  last: string | null | undefined
): string {
  return [capitalizeName(first), capitalizeName(last)].filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

/** "$125.00" from integer cents. */
export function formatCents(cents: number | null | undefined, currency = "USD"): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Parse a typed dollar amount ("125", "125.50") to integer cents, or null. */
export function dollarsToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = typeof input === "number" ? input : Number(String(input).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Integer cents → the string a dollar input should show ("125", "125.5"). */
export function centsToDollarInput(cents: number | null | undefined): string {
  return cents == null ? "" : String(cents / 100);
}

/** Highest provider fee tier (service products); keep equal to BUILT_IN_COMMISSION_BPS.SERVICE_PRODUCT. */
export const MAX_PROVIDER_FEE_BPS = 1499;

export function bpsToPercentLabel(bps: number): string {
  const pct = bps / 100;
  if (Number.isInteger(pct)) return `${pct}%`;
  return `${pct.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

/** THE ONE PLACE THE DEFAULT FEE IS WRITTEN IN TYPESCRIPT */
export const DEFAULT_SERVICE_FEE_BPS = 1490;

/** The E018 rate breakdown, computed in integer cents end to end. */
export function rateBreakdown(
  hourlyCents: number | null | undefined,
  serviceFeeBps: number
): { rate: number | null; fee: number | null; youGet: number | null } {
  if (hourlyCents == null) return { rate: null, fee: null, youGet: null };
  const fee = Math.round((hourlyCents * serviceFeeBps) / 10_000);
  return { rate: hourlyCents, fee, youGet: hourlyCents - fee };
}

/** M-E004: a one-person company named after its owner repeats the name; show it only when it adds something. */
export function companyBesidesName(company: string | null | undefined, name: string | null | undefined): string | null {
  const c = (company ?? "").trim();
  if (!c) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const n = norm(name ?? "");
  return n && (norm(c) === n || norm(c).startsWith(n + " ")) ? null : c;
}
