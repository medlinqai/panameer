import type { ExternalCard } from "@/lib/external-jobs";
import type { Want } from "@/lib/job-agent";

// XA-E005: one filter pattern for the Job Agent and Jobs for You — Search · Skills · Modules · Rate · Where · Kind · Country · Source.
export type JobFilters = { q: string; skills: string[]; modules: string[]; rateCents: number | null; where: string; contract: string; country: string; source: string };
export type FilterParams = Partial<Record<"q" | "skills" | "modules" | "rate" | "where" | "contract" | "country" | "source", string>>;
const list = (s?: string) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

export const hasFilters = (sp: FilterParams) => ["q", "skills", "modules", "rate", "where", "contract", "country", "source"].some((k) => !!sp[k as keyof FilterParams]);

export function parseFilters(sp: FilterParams): JobFilters {
  const rate = Number((sp.rate ?? "").replace(/[^0-9.]/g, ""));
  return { q: (sp.q ?? "").trim(), skills: list(sp.skills), modules: list(sp.modules), rateCents: rate > 0 ? Math.round(rate * 100) : null, where: ["Remote", "Hybrid", "Onsite"].includes(sp.where ?? "") ? sp.where! : "", contract: ["Contract", "Full-Time"].includes(sp.contract ?? "") ? sp.contract! : "", country: (sp.country ?? "").trim(), source: (sp.source ?? "").trim() };
}

/** The saved Job Agent criteria as filters. */
export const fromWant = (w: Want): JobFilters => ({ q: "", skills: w.skills, modules: w.modules, rateCents: w.rateFloorCents, where: w.workTypes.length === 1 ? w.workTypes[0] : "", contract: w.contractTypes.length === 1 ? w.contractTypes[0] : "", country: w.countries[0] ?? "", source: "" });

/** "$85/hr", "$80 - $95 an hour" → the top hourly rate in cents; yearly or missing → null (kept). */
function hourlyCents(salary: string | null) {
  if (!salary || !/hr|hour/i.test(salary)) return null;
  const n = [...salary.matchAll(/\$\s?(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  return n.length ? Math.round(Math.max(...n) * 100) : null;
}
const contractOf = (j: ExternalCard) => (/contract|\bw2\b|c2c|1099|temporary|\btemp\b/i.test(j.title) ? "Contract" : /full[- ]?time|permanent/i.test(j.title) ? "Full-Time" : null);

export function applyFilters<T extends ExternalCard>(jobs: T[], f: JobFilters): T[] {
  const words = (s: string) => s.toLowerCase();
  return jobs.filter((j) => {
    const text = words([j.title, j.company, j.location].join(" "));
    if (f.q && !f.q.toLowerCase().split(/\s+/).every((w) => text.includes(w))) return false;
    if (f.skills.length + f.modules.length && !j.matched && ![...f.skills, ...f.modules].some((k) => text.includes(k.toLowerCase()))) return false;
    const hr = hourlyCents(j.salary);
    if (f.rateCents && hr != null && hr < f.rateCents) return false;
    if (f.where && j.workType && j.workType !== f.where) return false;
    const c = contractOf(j);
    if (f.contract && c && c !== f.contract) return false;
    if (f.country && j.location && j.workType !== "Remote" && !j.location.toLowerCase().includes(f.country.toLowerCase())) return false;
    if (f.source && j.source !== f.source) return false;
    return true;
  });
}

export const toParams = (f: JobFilters): FilterParams => ({ q: f.q || undefined, skills: f.skills.join(", ") || undefined, modules: f.modules.join(", ") || undefined, rate: f.rateCents ? String(f.rateCents / 100) : undefined, where: f.where || undefined, contract: f.contract || undefined, country: f.country || undefined, source: f.source || undefined });
