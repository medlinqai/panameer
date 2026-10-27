// MD-E003: one shape for both dashboards — the donuts and the table come from the same rows.
export type Tone = "ok" | "pend" | "no" | "st";
export type DashRow = {
  key: string; type: "Job" | "Request" | "Order" | "Shop" | "Product"; what: string; number: string | null; who: string;
  status: string; tone: Tone; next: string; waitingOnYou: boolean; waitingOn: string; amount: string; updatedAt: string; href: string;
  /** Which donut and slice this row counts in (for click-to-filter). */
  donut: string; slice: string;
  /** JR-E007: finished (Filled, Closed, Completed, Approved/Declined Request) — out of Active; gone from other views after 30 days. */
  done: boolean;
};
export type DonutSlice = { label: string; n: number; color: string; mine?: boolean; /** "—" + Not tracked yet. */ untracked?: boolean; /** 10-27: what the line shows when it isn't just n — a pair like "4 / 2". */ value?: string; /** A slice that isn't in the table opens its own page. */ href?: string };
export type Donut = { key: string; title: string; sub: string; slices: DonutSlice[]; note?: string; /** JR-E007: See All → (default: My Transactions filtered to this pie). */ href?: string; /** HT-E003: a line under the title so the pie is never empty ("38 open jobs on Panameer · Browse the Job Board →"). */ lead?: { text: string; href: string; label: string }; /** HT-E004: a ring of set-up items (Profile / Account) instead of a legend. */ checklist?: ChecklistItem[]; center?: string; seeAllLabel?: string; /** NC-E004: a short total beside the title ("38 open"). */ total?: string; /** 10-27: what the ring shows when it isn't the lines (e.g. network by type). */ ring?: { label: string; n: number; color: string }[] };
export type ChecklistItem = { label: string; n: number; href: string; action: string; why: string };
export type DashData = { summary: string; /** HT-E004/E005 */ view?: "start" | "work"; /** 10-27: both sets of tiles, so the switch flips without a reload. */ views?: { start: Donut[]; work: Donut[] }; viewLabels?: [string, string]; setupDone?: boolean; checklist?: ChecklistItem[]; /** HT-E002: shown as "Provider Number P-… (?)" before the summary. */ providerNumber?: string | null; donuts: Donut[]; rows: DashRow[]; filters: [string, string][] };

// WA-E005: tile colours are theme tokens (a company theme is a token swap); the soft tints are mixed from them.
export const C = { ok: "var(--color-state-accepted)", okSoft: "color-mix(in srgb, var(--color-state-accepted) 45%, white)", pend: "var(--color-state-pending)", pendSoft: "color-mix(in srgb, var(--color-state-pending) 65%, white)", no: "var(--color-state-declined)", steel: "var(--color-state-inactive)", grey: "color-mix(in srgb, var(--color-state-inactive) 55%, white)", ink: "var(--color-ink)", empty: "var(--color-state-border)" };
export const usd = (c: number | null | undefined) => (c == null ? "—" : `$${Math.round(c / 100).toLocaleString("en-US")}`);
export const quarterStart = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1));
/** Count rows into slices, in the slice order given. */
export function slicesFrom(rows: DashRow[], donut: string, order: { label: string; color: string; mine?: boolean }[]): DonutSlice[] {
  return order.map((o) => ({ ...o, n: rows.filter((r) => r.donut === donut && r.slice === o.label).length }));
}
