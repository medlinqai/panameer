import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { OnboardingError, recomputeCompleteness } from "@/lib/onboarding";
import { projectToCard } from "@/lib/project-card";

export { projectToCard };

/**
 * Employers, and the Projects nested under them — brief_U.
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

/**
 * The v2 project field set (brief_project_model_v2).
 *
 * `applicationIds` are existing catalog rows; `customApplications` are names
 * the provider typed that aren't in the catalog yet — those are created as
 * `Application { is_custom: true }` so the admin catalog editor can promote
 * recurring ones to baseline.
 */
export type ProjectInput = {
  name: string;
  description?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  roleTypeId?: string | null;
  industrySpecializationId?: string | null;
  clientName?: string | null;
  clientVisibility?: string | null;
  codeName?: string | null;
  contactEmail?: string | null;
  highlights?: string[];
  videoUrl?: string | null;
  documentPath?: string | null;
  documentName?: string | null;
  logoUrl?: string | null;
  applicationIds?: string[];
  customApplications?: string[];
  outcomes?: { label: string; value: string }[];
};

const CLIENT_VISIBILITIES = ["PUBLIC", "PLUS_ONLY", "CONFIDENTIAL"] as const;
type ClientVisibilityValue = (typeof CLIENT_VISIBILITIES)[number];

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
        include: {
          roleType: { select: { id: true, name: true } },
          industry: { select: { id: true, name: true } },
          applications: {
            include: { application: { select: { id: true, name: true } } },
          },
          outcomes: { orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] },
          validations: {
            orderBy: { sent_at: "desc" },
            select: { status: true, sent_at: true, responded_at: true },
          },
        },
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
    projects: e.projects.map(projectToCard),
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
  // a job takes its projects with it — which is what the user means by
  // removing a job.
  const res = await prisma.employer.deleteMany({
    where: { id: employerId, provider_profile_id: profileId },
  });
  if (res.count === 0) {
    throw new OnboardingError("Employer not found", "INVALID");
  }
  await recomputeCompleteness(profileId);
}

/**
 * Validate + shape the scalar half of a project write.
 *
 * The REQUIRED SET is enforced here, server-side, and not only in the modal:
 * name, start date, role, client and description, plus an end date unless the
 * project is current (brief_project_model_v2). The modal disables Save on the
 * same rules, but the modal is not a security boundary — this is.
 */
function projectData(input: ProjectInput) {
  const name = clean(input.name, 200);
  if (!name) throw new OnboardingError("Project name is required", "INVALID");

  const clientName = clean(input.clientName, 200);
  if (!clientName) throw new OnboardingError("Client name is required", "INVALID");

  const description = clean(input.description, 4000);
  if (!description) {
    throw new OnboardingError("A short description is required", "INVALID");
  }

  const roleTypeId = clean(input.roleTypeId, 64);
  if (!roleTypeId) throw new OnboardingError("Pick the role you played", "INVALID");

  const isCurrent = Boolean(input.isCurrent);
  const start = toDate(input.startDate);
  if (!start) throw new OnboardingError("A start date is required", "INVALID");

  // "End unless current" — and a current project must not keep a stale end
  // date, or the card would render both "Present" and a finish date.
  const end = isCurrent ? null : toDate(input.endDate);
  if (!isCurrent && !end) {
    throw new OnboardingError(
      "Add an end date, or tick “I currently work on this”",
      "INVALID"
    );
  }
  if (end && end < start) {
    throw new OnboardingError("That project ends before it starts", "INVALID");
  }

  const visibility = CLIENT_VISIBILITIES.includes(
    input.clientVisibility as ClientVisibilityValue
  )
    ? (input.clientVisibility as ClientVisibilityValue)
    : "PUBLIC";

  // A confidential project still has to be identifiable on the card, and the
  // code name is the only thing left to identify it by once the client is
  // redacted. Fall back rather than render a nameless card.
  const codeName = clean(input.codeName, 200);
  if (visibility === "CONFIDENTIAL" && !codeName) {
    throw new OnboardingError(
      "A confidential project needs a code name — it's shown instead of the client",
      "INVALID"
    );
  }

  const email = clean(input.contactEmail, 320);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new OnboardingError("That contact email isn't valid", "INVALID");
  }

  const highlights = (input.highlights ?? [])
    .map((h) => clean(h, 300))
    .filter((h): h is string => Boolean(h))
    .slice(0, 12);

  return {
    name,
    description,
    url: clean(input.url, 1000),
    image_url: clean(input.imageUrl, 1000),
    start_date: start,
    end_date: end,
    is_current: isCurrent,
    role_type_id: roleTypeId,
    industry_specialization_id: clean(input.industrySpecializationId, 64),
    client_name: clientName,
    client_visibility: visibility,
    code_name: codeName,
    contact_email: email,
    highlights,
    video_url: clean(input.videoUrl, 1000),
    document_path: clean(input.documentPath, 1000),
    document_name: clean(input.documentName, 300),
    logo_url: clean(input.logoUrl, 1000),
  };
}

/**
 * Resolve the tools multi-select to Application ids, creating provider-added
 * ones as `is_custom` rows.
 *
 * Matching is case-insensitive against the WHOLE catalog before creating
 * anything, so typing "oracle fusion" when "Oracle Fusion" already exists links
 * the baseline row instead of spawning a near-duplicate custom for an admin to
 * clean up later.
 */
async function resolveApplicationIds(input: ProjectInput): Promise<string[]> {
  const ids = new Set((input.applicationIds ?? []).filter(Boolean));

  const customNames = (input.customApplications ?? [])
    .map((n) => clean(n, 120))
    .filter((n): n is string => Boolean(n));

  for (const name of customNames) {
    const existing = await prisma.application.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      ids.add(existing.id);
      continue;
    }
    const created = await prisma.application.create({
      // No offering: a provider-added tool belongs to no ERP offering, which is
      // what keeps it out of the Role → Domain → Skill tree.
      data: { name, is_custom: true },
      select: { id: true },
    });
    ids.add(created.id);
  }

  // Guard against ids the client made up — a foreign or bogus id would blow up
  // the join insert rather than being quietly ignored.
  const valid = await prisma.application.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true },
  });
  return valid.map((v) => v.id);
}

/** Replace a project's tool links and outcome rows to match the input. */
async function writeProjectChildren(projectId: string, input: ProjectInput) {
  const applicationIds = await resolveApplicationIds(input);
  const outcomes = (input.outcomes ?? [])
    .map((o) => ({ label: clean(o?.label, 120), value: clean(o?.value, 120) }))
    // Both halves or neither: "Savings" with no number says nothing, and a
    // bare "$10M" with no label says less.
    .filter((o): o is { label: string; value: string } => Boolean(o.label && o.value))
    .slice(0, 8);

  await prisma.$transaction([
    prisma.projectApplication.deleteMany({ where: { project_id: projectId } }),
    ...(applicationIds.length
      ? [
          prisma.projectApplication.createMany({
            data: applicationIds.map((application_id) => ({
              project_id: projectId,
              application_id,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
    prisma.projectOutcome.deleteMany({ where: { project_id: projectId } }),
    ...(outcomes.length
      ? [
          prisma.projectOutcome.createMany({
            data: outcomes.map((o, i) => ({
              project_id: projectId,
              label: o.label,
              value: o.value,
              sort_order: i * 10,
            })),
          }),
        ]
      : []),
  ]);
}

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
    },
    select: { id: true },
  });
  await writeProjectChildren(row.id, input);
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

  await prisma.project.update({
    where: { id: owned.id },
    data: projectData(input),
  });
  await writeProjectChildren(owned.id, input);
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
