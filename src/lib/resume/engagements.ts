import type { ParsedProject } from "@/lib/resume/parse";

// Independent-consultant CVs: a dated engagement line, then a two-column table
// (Summary / Description / Role-Type / Software / Skills Used). Each pair is ONE project.
export type Engagement = {
  client: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  summary: string | null;
  description: string | null;
  roleType: string | null;
  software: string[];
  skills: string[];
};

const DATE = String.raw`(\d{1,2})\/(?:(\d{1,2})\/)?(\d{4})`;
const LINE = new RegExp(String.raw`^(.+?)\s*\t[\t\s]*${DATE}\s+(?:to|-|–)\s+(?:${DATE}|(current|present|now))\s*\t*\s*$`, "i");
const LABELS: Record<string, keyof Engagement> = {
  summary: "summary",
  description: "description",
  "role-type": "roleType",
  "role type": "roleType",
  software: "software",
  "skills used": "skills",
};

const ymd = (m: string, y: string) => `${y}-${m.padStart(2, "0")}-01`;
const list = (s: string | null) =>
  (s ?? "")
    .split(/[,;•]/)
    .map((x) => x.trim().replace(/^(and|&)\s+/i, "").replace(/[.]+$/, "").trim())
    .filter(Boolean);

/** Reads every engagement line whose next block is a labelled table. Fewer than 3 → not this shape. */
export function parseEngagementTables(text: string): Engagement[] {
  const lines = text.split("\n");
  const out: Engagement[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = LINE.exec(lines[i]);
    if (!m) continue;
    const head = m[1].trim();
    const paren = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(head);
    const e: Engagement = {
      client: (paren ? paren[1] : head).trim(),
      location: paren ? paren[2].trim() : null,
      startDate: ymd(m[2], m[4]),
      endDate: m[8] ? null : m[5] ? ymd(m[5], m[7]) : null,
      isCurrent: !!m[8],
      summary: null,
      description: null,
      roleType: null,
      software: [],
      skills: [],
    };
    let labelled = 0;
    // The table follows the line: label lines, each followed by its value.
    for (let j = i + 1; j < Math.min(lines.length, i + 120); j++) {
      if (LINE.test(lines[j])) break;
      const key = LABELS[lines[j].trim().replace(/\s+/g, " ").toLowerCase()];
      if (!key) continue;
      // The value is the next non-empty line that is not itself a label (extractors may add blank lines).
      let value: string | null = null;
      for (let k = j + 1; k < Math.min(lines.length, j + 8); k++) {
        const v = lines[k].replace(/\t/g, " ").trim();
        if (!v) continue;
        if (!LABELS[v.replace(/\s+/g, " ").toLowerCase()] && !LINE.test(lines[k])) value = v;
        break;
      }
      labelled++;
      if (key === "software") e.software = list(value);
      else if (key === "skills") e.skills = list(value);
      else (e as Record<string, unknown>)[key] = value;
    }
    if (labelled >= 2 && e.client) out.push(e);
  }
  return out.length >= 3 ? out : [];
}

export function engagementsToProjects(eng: Engagement[]): ParsedProject[] {
  return eng.map((e) => ({
    name: e.summary || e.client,
    description: e.description,
    startDate: e.startDate,
    endDate: e.endDate,
    isCurrent: e.isCurrent,
    client: e.client,
    software: e.software,
    employerName: null,
    roleText: e.roleType,
  }));
}

/** "Application-Specific (Functional SME), Technology-Specific" → the first locked role name it names. */
export function roleNameFromText(t: string | null | undefined): string | null {
  if (!t) return null;
  const m = /(Application|Technology|Operations|Project)-Specific|AI[- ]Specialist/i.exec(t);
  if (!m) return null;
  return m[0].toLowerCase().startsWith("ai") ? "AI-Specialist" : `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}-Specific`;
}
