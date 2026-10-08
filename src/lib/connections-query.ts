// Connections filters ↔ URL (client-safe; the server lib applies them).
export type ConnFilters = {
  q: string;
  chip: string;
  rel: string[];
  how: string[];
  pastco: string;
  skills: string[];
  roles: string[];
  modes: string[];
  rmin: number | null;
  rmax: number | null;
  loc: string;
  trust: string[];
  act: string[];
  /** Community (members scope): current company contains. */
  co: string;
};

const list = (v: string | undefined) => (v ? v.split(",").filter(Boolean) : []);
const num = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : null);

export function parseFilters(sp: Record<string, string | undefined>): ConnFilters {
  return {
    q: (sp.q ?? "").trim(),
    chip: sp.chip ?? "all",
    rel: list(sp.rel),
    how: list(sp.how),
    pastco: (sp.pastco ?? "").trim(),
    skills: list(sp.skills),
    roles: list(sp.roles),
    modes: list(sp.modes),
    rmin: num(sp.rmin),
    rmax: num(sp.rmax),
    loc: (sp.loc ?? "").trim(),
    trust: list(sp.trust),
    act: list(sp.act),
    co: (sp.co ?? "").trim(),
  };
}

export function filtersToQuery(f: Partial<ConnFilters>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v == null || v === "" || (Array.isArray(v) && !v.length) || (k === "chip" && v === "all")) continue;
    u.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  return u.toString();
}

export const CHIPS = [
  { key: "all", label: "All" },
  { key: "colleagues", label: "Colleagues" },
  { key: "mentors", label: "My Mentors" },
  { key: "mentees", label: "I Mentor" },
  { key: "worked", label: "Worked Together" },
  { key: "samecompany", label: "Same Company" },
  { key: "learn", label: "From Learn" },
  { key: "invites", label: "Invites" },
  { key: "following", label: "Following" },
  { key: "followers", label: "Followers" },
] as const;

/** Community tab (people you're not connected to yet). */
export const MEMBER_CHIPS = [
  { key: "all", label: "Everyone" },
  { key: "second", label: "2nd connections" },
  { key: "shared", label: "Shared skills" },
  { key: "mentoring", label: "Open to mentoring" },
] as const;

export const LABELS: Record<string, string> = {
  colleague: "Colleagues", mentor: "My Mentors", mentee: "I Mentor", connected: "Connected", invin: "Invites received", invout: "Invites sent",
  worked: "Worked together", samecompany: "Same company now", course: "Same course (Learn)", team: "Same team",
  func: "Functional", tech: "Technical", techfunc: "Techno-Functional", pm: "Project / PM",
  onsite: "Onsite", hybrid: "Hybrid", remote: "Remote",
  verified: "Validated company", score70: "Search Score 70+", creds: "Has credentials (Learn)", work: "Has done work on Panameer",
  week: "Active this week", month: "Joined this month", quiet: "Haven't talked in 90 days",
};

