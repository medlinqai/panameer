import type { ParsedResume } from "@/lib/resume/parse";
import type { Engagement } from "@/lib/resume/engagements";

// "Companies we found": the list a member sorts into Employer / Project client / Remove (Scott 2026-10-05).
export type FoundCompany = {
  name: string;
  guess: "EMPLOYER" | "PROJECT" | null;
  dates: string | null;
  title: string | null;
  detail: string | null;
  startDate: string | null;
  endDate: string | null;
};

export const normCompany = (s: string | null | undefined) =>
  (s ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b\d{1,2}\/(\d{1,2}\/)?\d{4}\b.*$/, " ")
    .replace(/[^a-z0-9&]+/g, " ")
    .trim();

const span = (a: string | null, b: string | null, current = false) =>
  a ? `${a.slice(0, 7)} – ${current ? "now" : b ? b.slice(0, 7) : "?"}` : null;

/** Section headers and content titles the AI inventory reads as companies (why 32 ≠ 10). */
export function notACompany(heading: string): boolean {
  const h = heading.trim();
  if (!h) return true;
  if (/^how to\b/i.test(h)) return true;
  const letters = h.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 6 && letters === letters.toUpperCase() && h.split(/\s+/).length >= 2) return true; // ALL-CAPS section header
  if (/\b(experience|content|creator|creation|summary|skills|education|certifications?)\b/i.test(h) && !/\d{4}/.test(h)) return true;
  return false;
}

export function buildCompanyList(
  engagements: Engagement[],
  inventory: { heading: string; dateRange?: string | null; kind?: string }[],
  parsed: Pick<ParsedResume, "experiences" | "projects">
): FoundCompany[] {
  const out = new Map<string, FoundCompany>();
  const add = (c: FoundCompany) => {
    const k = normCompany(c.name);
    if (k && !out.has(k)) out.set(k, c);
  };
  if (engagements.length) {
    for (const e of engagements)
      add({ name: e.client, guess: "PROJECT", dates: span(e.startDate, e.endDate, e.isCurrent), title: e.roleType, detail: e.summary, startDate: e.startDate, endDate: e.endDate });
    // Any employer the AI still read sits in the list too, so the member can sort it.
    for (const x of parsed.experiences)
      if (x.employer && !notACompany(x.employer))
        add({ name: x.employer, guess: "EMPLOYER", dates: span(x.startDate, x.endDate, x.isCurrent), title: x.roleTitle, detail: null, startDate: x.startDate, endDate: x.endDate });
    return [...out.values()];
  }
  for (const x of parsed.experiences)
    if (x.employer) add({ name: x.employer, guess: "EMPLOYER", dates: span(x.startDate, x.endDate, x.isCurrent), title: x.roleTitle, detail: null, startDate: x.startDate, endDate: x.endDate });
  for (const p of parsed.projects) {
    const name = p.client || p.name;
    if (name) add({ name, guess: "PROJECT", dates: span(p.startDate, p.endDate, p.isCurrent), title: null, detail: p.client ? p.name : null, startDate: p.startDate, endDate: p.endDate });
  }
  for (const i of inventory) {
    if (notACompany(i.heading)) continue;
    if (!i.dateRange) continue; // undated headings that matched nothing are not companies
    add({ name: i.heading.replace(/\s*\t.*$/, "").trim(), guess: null, dates: i.dateRange, title: null, detail: null, startDate: null, endDate: null });
  }
  return [...out.values()].filter((c) => !notACompany(c.name));
}
