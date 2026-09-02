/**
 * THE RECLASSIFY FIELD MAP — PURE, AND IN ITS OWN MODULE FOR A REASON
 * (`P1-J1.4-E296`).
 *
 * ⚠⚠ IT LIVES HERE AND NOT IN `lib/employers.ts` BECAUSE A CLIENT COMPONENT
 * NEEDS IT. `EmployersStep.tsx` is `"use client"` and renders the loss sentence;
 * importing it from `employers.ts` dragged `prisma` — and therefore `pg`, and
 * therefore Node's `dns` — into the BROWSER bundle and broke the build with
 * *"Module not found: Can't resolve 'dns'"*. Found by `npm run build`, not by
 * reading the code, because `tsc` is perfectly happy with it.
 *
 * ⚠ SO NOTHING IN THIS FILE MAY IMPORT PRISMA, EVER. That is the whole point of
 * the split, and it is also what lets `check:reclassify` drive every branch with
 * no database.
 *
 * ⚠ THE BRIEF SANCTIONED THIS SHAPE — *"in `lib/employers.ts` (or a small
 * sibling module)"*. `employers.ts` re-exports these so the server side reads
 * unchanged; the client imports from HERE directly.
 */
import type { SoftwareSuite } from "@prisma/client";

/**
 * ⚠ `clean` MOVED HERE RATHER THAN BEING COPIED. It was `employers.ts`'s local
 * helper and that file now imports it from here — one definition, and this module
 * needs it for the two string fields it trims.
 */
export const clean = (v?: string | null, max = 400) => {
  const s = (v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

/**
 * ⚠ THE FIELD MAP, AS A PURE FUNCTION, so `check:reclassify` can assert it with
 * no database. **This is the part that silently rots** — an `Employer` column
 * added later has to be given a destination here or the harness fails.
 */
export type EmployerScalars = {
  name: string;
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

/**
 * Employer → the scalar half of a Project.
 *
 * ⚠ `city`/`state`/`country` FOLD INTO `location` when `location` is empty.
 * `Project` has one place field and `Employer` has four; dropping three of them
 * because the fourth happened to be null would lose "Houston, TX" from a row the
 * parser filled in per-part. The fold is only a fallback — an explicit
 * `Employer.location` always wins.
 *
 * ⚠ `client_name` IS PASSED IN, NEVER DERIVED HERE. `Project.client_name` is NOT
 * NULL and the natural value is the target employer's name, but Scott's `E043`
 * rule applies: suggested in the dialog, confirmed by the user, never written
 * silently.
 */
export function employerToProjectData(
  e: EmployerScalars,
  clientName: string
): ProjectScalars {
  const place =
    clean(e.location, 200) ??
    ([e.city, e.state, e.country].map((x) => clean(x, 200)).filter(Boolean).join(", ") || null);
  return {
    name: e.name,
    description: e.description,
    role_title: e.role_title,
    location: place,
    start_date: e.start_date,
    end_date: e.end_date,
    is_current: e.is_current,
    logo_url: e.logo_url,
    contact_email: e.contact_email,
    software_suite: e.software_suite,
    /* ⚠ BOTH FK TO `RoleType` — `Employer.job_role_type_id` and
       `Project.role_type_id` are the same catalog reference under two names. */
    role_type_id: e.job_role_type_id,
    client_name: clientName,
  };
}

/**
 * Project → the scalar half of an Employer. The exact inverse.
 *
 * ⚠ `city`/`state`/`country` ARE LEFT NULL AND `location` CARRIES THE WHOLE
 * STRING. Splitting "Houston, TX" back into parts would be guessing, and the
 * round-trip test only holds if this direction does not invent structure.
 */
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


/**
 * What `convertProjectToEmployer` would throw away, counted and named.
 *
 * ⚠⚠ ENUMERATED, NEVER A GENERIC WARNING. *"Some data may be lost"* tells nobody
 * anything; *"3 outcomes, 5 tools and 4 highlights will be removed"* is a
 * decision somebody can actually make.
 */
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

