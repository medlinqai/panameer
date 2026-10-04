import type { SoftwareSuite } from "@prisma/client";

export const clean = (v?: string | null, max = 400) => {
  const s = (v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

import { NO_EMPLOYER_LABEL } from "@/lib/employer-display";

export type EmployerScalars = {
  name: string | null;
  role_title: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  start_date: Date | null;
  end_date: Date | null;
  is_current: boolean;
  description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  software_suite: SoftwareSuite | null;
  job_role_type_id: string | null;
};

export type ProjectScalars = {
  name: string;
  description: string | null;
  role_title: string | null;
  location: string | null;
  start_date: Date | null;
  end_date: Date | null;
  is_current: boolean;
  logo_url: string | null;
  contact_email: string | null;
  software_suite: SoftwareSuite | null;
  role_type_id: string | null;
  client_name: string;
};

export function employerToProjectData(
  e: EmployerScalars,
  clientName: string
): ProjectScalars {
  const place =
    clean(e.location, 200) ??
    ([e.city, e.state, e.country].map((x) => clean(x, 200)).filter(Boolean).join(", ") || null);
  return {
    name: clean(e.role_title, 200) ?? clean(e.name, 200) ?? NO_EMPLOYER_LABEL,
    description: e.description,
    role_title: e.role_title,
    location: place,
    start_date: e.start_date,
    end_date: e.end_date,
    is_current: e.is_current,
    logo_url: e.logo_url,
    contact_email: e.contact_email,
    software_suite: e.software_suite,
    role_type_id: e.job_role_type_id,
    client_name: clientName,
  };
}

export function projectToEmployerData(p: ProjectScalars, name: string): EmployerScalars {
  return {
    name,
    role_title: p.role_title,
    location: p.location,
    city: null,
    state: null,
    country: null,
    start_date: p.start_date,
    end_date: p.end_date,
    is_current: p.is_current,
    description: p.description,
    logo_url: p.logo_url,
    contact_email: p.contact_email,
    software_suite: p.software_suite,
    job_role_type_id: p.role_type_id,
  };
}

export type ProjectLoss = {
  outcomes: number;
  tools: number;
  highlights: number;
  /** Fields with no column on `Employer` at all — named, not counted. */
  fields: string[];
};

export function describeProjectLoss(loss: ProjectLoss): string {
  const parts: string[] = [];
  const n = (c: number, one: string, many: string) =>
    c > 0 ? `${c} ${c === 1 ? one : many}` : null;
  for (const s of [
    n(loss.outcomes, "outcome", "outcomes"),
    n(loss.tools, "tool", "tools"),
    n(loss.highlights, "highlight", "highlights"),
  ]) {
    if (s) parts.push(s);
  }
  for (const f of loss.fields) parts.push(f);
  if (parts.length === 0) return "";
  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${list} will be removed — a job has nowhere to keep ${parts.length === 1 ? "it" : "them"}.`;
}

