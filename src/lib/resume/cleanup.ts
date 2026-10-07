import type { ParsedResume, ParsedCertification } from "@/lib/resume/parse";
import { normCompany } from "@/lib/resume/company-list";

// Deterministic clean-up after the model answers: employers, certifications, skills, education.
const DATE_RANGE = /\b(?:\d{1,2}\/)?(?:\d{1,2}\/)?(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:\d{1,2}\/)?(?:\d{1,2}\/)?(?:19|20)\d{2}|present|current|now|date)/gi;
const norm = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
const year = (d: string | null | undefined) => (d ? d.slice(0, 4) : null);

/** A section heading or content title read as an employer (ALL-CAPS company names are kept). */
function isSectionHeading(h: string) {
  if (/^how to\b/i.test(h)) return true;
  if (/\b(experience|content|creator|creation|summary|skills|education|certifications?|projects?|profile|objective)\b/i.test(h) && !/\d{4}/.test(h) && !/\b(inc|ltd|llc|limited|corp|corporation|group|solutions|consulting|services|bank)\b/i.test(h)) return true;
  return false;
}

/** Employers: merge duplicates, drop headings / project and course titles, undated rows, and an implausible excess. */
export function cleanEmployers(parsed: ParsedResume, text: string) {
  // A row whose "employer" is really a project title goes; an employer that projects name as their employer stays.
  const projectNames = new Set(parsed.projects.map((p) => normCompany(p.name)).filter(Boolean));
  const employerNames = new Set(parsed.projects.map((p) => normCompany(p.employerName)).filter(Boolean));
  let rows = parsed.experiences.filter((x) => {
    const e = (x.employer ?? "").trim();
    if (!e || isSectionHeading(e)) return false;
    if (projectNames.has(normCompany(e)) && !employerNames.has(normCompany(e))) return false;
    if (/\b(course|training|bootcamp|certificat|workshop|webinar)\b/i.test(e)) return false;
    return true;
  });
  // Merge duplicates (same employer + start year): earliest start, latest end, longest description.
  const by = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const k = `${normCompany(r.employer)}|${year(r.startDate) ?? ""}|${norm(r.roleTitle ?? "")}`;
    const prev = by.get(k);
    if (!prev) by.set(k, { ...r });
    else
      by.set(k, {
        ...prev,
        startDate: [prev.startDate, r.startDate].filter(Boolean).sort()[0] ?? null,
        endDate: prev.isCurrent || r.isCurrent ? prev.endDate ?? r.endDate : [prev.endDate, r.endDate].filter(Boolean).sort().at(-1) ?? null,
        isCurrent: prev.isCurrent || r.isCurrent,
        description: (prev.description?.length ?? 0) >= (r.description?.length ?? 0) ? prev.description : r.description,
      });
  }
  rows = [...by.values()];
  const dated = rows.filter((r) => r.startDate);
  if (dated.length >= 2) rows = dated;
  const ranges = (text.match(DATE_RANGE) ?? []).map((m) => m.match(/(?:19|20)\d{2}/g) ?? []);
  if (ranges.length && rows.length > Math.max(3, ranges.length) * 1.5) {
    const years = new Set(ranges.flat());
    const matched = rows.filter((r) => r.startDate && years.has(year(r.startDate)!));
    if (matched.length) rows = matched; // never empty the list on this rule
  }
  parsed.experiences = rows;
}

const CERT_HEAD = /^\s*(?:[•\-–*]\s*)?(certifications?|certified|certificates?|badges?|credentials?|licen[cs]es?)\b\s*[:\-–]?\s*(.*)$/i;
const isHeading = (l: string) => /^[A-Z][A-Z &/()-]{3,}:?$/.test(l.trim());

/** Certifications the document states plainly: CERTIFICATIONS / BADGES lists, parenthesized lists, Oracle exam codes. */
export function readCertifications(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim());
  const out: string[] = [];
  const split = (s: string) => s.split(/[,;|•]/).map((x) => x.replace(/^(and|&)\s+/i, "").replace(/[.\s]+$/, "").trim()).filter((x) => x.length >= 2 && x.length <= 80 && x.split(/\s+/).length <= 8);
  for (let i = 0; i < lines.length; i++) {
    const m = CERT_HEAD.exec(lines[i]);
    if (!m) continue;
    if (m[2]) out.push(...split(m[2]));
    else
      for (let j = i + 1; j < Math.min(lines.length, i + 25); j++) {
        const l = lines[j];
        if (!l) {
          if (!lines[j + 1]) break;
          continue;
        }
        if (isHeading(l) || /^(education|experience|skills|projects|summary|languages)\b/i.test(l)) break;
        out.push(...split(l.replace(/^[•\-–*]\s*/, "")));
      }
  }
  for (const code of text.match(/\b1Z0-\d{3}\b/gi) ?? []) out.push(`Oracle ${code.toUpperCase()}`);
  return out;
}

/** Expand "Multiple Oracle Cloud Badges (a, b, c)" into its items; keep the name otherwise. */
const expand = (name: string) => {
  const m = /^(.*?)\(([^)]*,[^)]*)\)\s*$/.exec(name);
  return m ? m[2].split(",").map((x) => x.replace(/^(and|&)\s+/i, "").trim()).filter(Boolean) : [name];
};

export function mergeCertifications(parsed: ParsedResume, text: string) {
  const seen = new Set<string>();
  const out: ParsedCertification[] = [];
  const add = (c: ParsedCertification) => {
    const k = norm(c.name);
    if (!k || seen.has(k) || /\b(bachelor|master|degree|diploma|university|college)\b/i.test(c.name)) return;
    seen.add(k);
    out.push(c);
  };
  for (const c of parsed.certifications) for (const n of expand(c.name)) add({ ...c, name: n });
  for (const n of readCertifications(text)) add({ name: n, issuer: null, issuedOn: null, expiresOn: null });
  parsed.certifications = out;
}

const SKILL_CAP = 60;
/** One skills filter: drop ≤2-letter items, sentences, leading and/&/with, trailing punctuation, duplicates; cap, catalog matches first. */
export function cleanSkills(skills: string[], catalog?: Set<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of skills) {
    const s = raw.replace(/^\s*(and|&|with)\s+/i, "").replace(/[\s.,;:!?]+$/, "").trim();
    if (s.replace(/[^A-Za-z]/g, "").length <= 2) continue;
    if (s.split(/\s+/).length > 5) continue;
    const k = norm(s);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  if (!catalog) return out.slice(0, SKILL_CAP);
  const known = out.filter((s) => catalog.has(norm(s)));
  return [...known, ...out.filter((s) => !catalog.has(norm(s)))].slice(0, SKILL_CAP);
}

/** Education: one row per school + degree + year. */
export function dedupeEducation(parsed: ParsedResume) {
  const seen = new Set<string>();
  parsed.education = parsed.education.filter((e) => {
    const k = `${norm(e.institution)}|${norm(e.degree ?? "")}|${e.endYear ?? e.startYear ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Everything above, in order. `catalog` = normalized catalog skill names (optional). */
/** Normalized catalog names, so the skill cap keeps catalog matches first. */
export const catalogKey = norm;

export function cleanParsedResume(parsed: ParsedResume, text: string, catalog?: Set<string>) {
  cleanEmployers(parsed, text);
  mergeCertifications(parsed, text);
  parsed.skills = cleanSkills(parsed.skills, catalog);
  dedupeEducation(parsed);
  return parsed;
}
