import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { OnboardingError, recomputeCompleteness } from "@/lib/onboarding";

/**
 * Employers, and the Projects (+ Solutions) nested under them — brief_U.
 *
 * `Employer` is the single work-history model (E042). Every function here is
 * OWNER-SCOPED by construction: the profile is resolved from the session via
 * `ownedProviderProfile`, and every child id is re-checked against that profile
 * before it is touched. There is no path that accepts a target profile id from
 * the client, so cross-account writes are structurally impossible.
 *
 * Completeness is recomputed after every mutation — the work-history enrichment
 * weight reads Employer now, so a stale score would misreport visibility.
 */

export type EmployerInput = {
  name: string;
  roleTitle?: string | null;
  location?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
};

export type ProjectInput = {
  name: string;
  description?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  solutions?: string[];
};

/** Resolve the viewer's OWN provider profile id. Fails closed. */
async function ownedProfileId(viewer: Viewer): Promise<string> {
  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  if (!profile) {
    throw new OnboardingError("No provider profile for this user", "NOT_A_PROVIDER");
  }
  return profile.id;
}

const toDate = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const clean = (v?: string | null, max = 400) => {
  const s = (v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

/** Everything the capture step and management surfaces render. */
export async function listEmployers(viewer: Viewer) {
  const profileId = await ownedProfileId(viewer);
  const rows = await prisma.employer.findMany({
    where: { provider_profile_id: profileId },
    orderBy: [{ sort_order: "asc" }, { start_date: "desc" }],
    include: {
      projects: {
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
        include: { solutions: { orderBy: { created_at: "asc" } } },
      },
    },
  });

  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    roleTitle: e.role_title,
    location: e.location,
    description: e.description,
    logoUrl: e.logo_url,
    isCurrent: e.is_current,
    startDate: e.start_date ? e.start_date.toISOString().slice(0, 10) : null,
    endDate: e.end_date ? e.end_date.toISOString().slice(0, 10) : null,
    projects: e.projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      url: p.url,
      imageUrl: p.image_url,
      startDate: p.start_date ? p.start_date.toISOString().slice(0, 10) : null,
      endDate: p.end_date ? p.end_date.toISOString().slice(0, 10) : null,
      solutions: p.solutions.map((s) => ({ id: s.id, name: s.name })),
    })),
  }));
}

function employerData(input: EmployerInput) {
  const name = clean(input.name, 200);
  if (!name) throw new OnboardingError("Employer name is required", "INVALID");

  const start = toDate(input.startDate);
  const end = toDate(input.endDate);
  if (start && end && end < start) {
    throw new OnboardingError("That job ends before it starts", "INVALID");
  }

  return {
    name,
    role_title: clean(input.roleTitle, 200),
    location: clean(input.location, 200),
    description: clean(input.description, 4000),
    logo_url: clean(input.logoUrl, 1000),
    start_date: start,
    // A current job has no end date, whatever was typed.
    end_date: input.isCurrent ? null : end,
    is_current: Boolean(input.isCurrent),
  };
}

export async function createEmployer(viewer: Viewer, input: EmployerInput) {
  const profileId = await ownedProfileId(viewer);
  const count = await prisma.employer.count({
    where: { provider_profile_id: profileId },
  });
  const row = await prisma.employer.create({
    data: {
      provider_profile_id: profileId,
      sort_order: count * 10,
      ...employerData(input),
    },
    select: { id: true },
  });
  await recomputeCompleteness(profileId);
  return row.id;
}

export async function updateEmployer(
  viewer: Viewer,
  employerId: string,
  input: EmployerInput
) {
  const profileId = await ownedProfileId(viewer);
  // Ownership re-check: the id came from the client, so it is ANDed with the
  // viewer's own profile — a foreign id resolves to nothing.
  const owned = await prisma.employer.findFirst({
    where: { id: employerId, provider_profile_id: profileId },
    select: { id: true },
  });
  if (!owned) throw new OnboardingError("Employer not found", "INVALID");

  await prisma.employer.update({
    where: { id: owned.id },
    data: employerData(input),
  });
  await recomputeCompleteness(profileId);
}

export async function deleteEmployer(viewer: Viewer, employerId: string) {
  const profileId = await ownedProfileId(viewer);
  // Projects cascade with the employer (schema onDelete: Cascade), so deleting
  // a job takes its projects and their solutions with it — which is what the
  // user means by removing a job.
  const res = await prisma.employer.deleteMany({
    where: { id: employerId, provider_profile_id: profileId },
  });
  if (res.count === 0) {
    throw new OnboardingError("Employer not found", "INVALID");
  }
  await recomputeCompleteness(profileId);
}

function projectData(input: ProjectInput) {
  const name = clean(input.name, 200);
  if (!name) throw new OnboardingError("Project name is required", "INVALID");
  const start = toDate(input.startDate);
  const end = toDate(input.endDate);
  if (start && end && end < start) {
    throw new OnboardingError("That project ends before it starts", "INVALID");
  }
  return {
    name,
    description: clean(input.description, 4000),
    url: clean(input.url, 1000),
    image_url: clean(input.imageUrl, 1000),
    start_date: start,
    end_date: end,
  };
}

const solutionNames = (input: ProjectInput) =>
  (input.solutions ?? [])
    .map((s) => clean(s, 200))
    .filter((s): s is string => Boolean(s))
    .slice(0, 20);

export async function createProject(
  viewer: Viewer,
  employerId: string,
  input: ProjectInput
) {
  const profileId = await ownedProfileId(viewer);
  const employer = await prisma.employer.findFirst({
    where: { id: employerId, provider_profile_id: profileId },
    select: { id: true },
  });
  if (!employer) throw new OnboardingError("Employer not found", "INVALID");

  const count = await prisma.project.count({
    where: { employer_id: employer.id },
  });

  const row = await prisma.project.create({
    data: {
      provider_profile_id: profileId,
      employer_id: employer.id,
      sort_order: count * 10,
      ...projectData(input),
      solutions: { create: solutionNames(input).map((name) => ({ name })) },
    },
    select: { id: true },
  });
  await recomputeCompleteness(profileId);
  return row.id;
}

export async function updateProject(
  viewer: Viewer,
  projectId: string,
  input: ProjectInput
) {
  const profileId = await ownedProfileId(viewer);
  const owned = await prisma.project.findFirst({
    where: { id: projectId, provider_profile_id: profileId },
    select: { id: true },
  });
  if (!owned) throw new OnboardingError("Project not found", "INVALID");

  // Solutions are a small owned set — replace wholesale, which is what the
  // editor posts.
  await prisma.$transaction([
    prisma.solution.deleteMany({ where: { project_id: owned.id } }),
    prisma.project.update({
      where: { id: owned.id },
      data: {
        ...projectData(input),
        solutions: { create: solutionNames(input).map((name) => ({ name })) },
      },
    }),
  ]);
  await recomputeCompleteness(profileId);
}

export async function deleteProject(viewer: Viewer, projectId: string) {
  const profileId = await ownedProfileId(viewer);
  const res = await prisma.project.deleteMany({
    where: { id: projectId, provider_profile_id: profileId },
  });
  if (res.count === 0) throw new OnboardingError("Project not found", "INVALID");
  await recomputeCompleteness(profileId);
}
