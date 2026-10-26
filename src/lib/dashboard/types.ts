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
export type DonutSlice = { label: string; n: number; color: string; mine?: boolean; /** A slice that isn't in the table opens its own page. */ href?: string };
export type Donut = { key: string; title: string; sub: string; slices: DonutSlice[]; note?: string; /** JR-E007: See All → (default: My Transactions filtered to this pie). */ href?: string; /** HT-E003: a line under the title so the pie is never empty ("38 open jobs on Panameer · Browse the Job Board →"). */ lead?: { text: string; href: string; label: string } };
export type DashData = { summary: string; /** HT-E002: shown as "Provider Number P-… (?)" before the summary. */ providerNumber?: string | null; donuts: Donut[]; rows: DashRow[]; filters: [string, string][] };

export const C = { ok: "#1F7A4D", okSoft: "#9bc4ad", pend: "#C98A00", pendSoft: "#e0b44d", no: "#B3261E", steel: "#5C6485", grey: "#9aa0b8", ink: "#272334" };
export const usd = (c: number | null | undefined) => (c == null ? "—" : `$${Math.round(c / 100).toLocaleString("en-US")}`);
export const quarterStart = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1));
/** Count rows into slices, in the slice order given. */
export function slicesFrom(rows: DashRow[], donut: string, order: { label: string; color: string; mine?: boolean }[]): DonutSlice[] {
  return order.map((o) => ({ ...o, n: rows.filter((r) => r.donut === donut && r.slice === o.label).length }));
}
