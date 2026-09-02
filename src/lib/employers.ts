import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { OnboardingError, recomputeCompleteness } from "@/lib/onboarding";
import { recomputeProviderRollup } from "@/lib/provider-rollup";
import { normalizeHost } from "@/lib/email-domain";
import { toView as toArtifactView } from "@/lib/artifacts";
import { projectToCard } from "@/lib/project-card";
import {
  clean,
  employerToProjectData,
  projectToEmployerData,
  describeProjectLoss,
  type EmployerScalars,
  type ProjectScalars,
  type ProjectLoss,
} from "@/lib/reclassify";

/* ⚠ RE-EXPORTED so every existing server-side import path keeps working. ⚠ A
   CLIENT COMPONENT MUST IMPORT FROM `lib/reclassify` DIRECTLY — going through
   this file drags prisma into the browser. */
export {
  employerToProjectData,
  projectToEmployerData,
  describeProjectLoss,
  type EmployerScalars,
  type ProjectScalars,
  type ProjectLoss,
};

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
  city?: string | null;
  state?: string | null;
  country?: string | null;
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
  /* ⚠ `P1-J1.4-E296` — the two fields an Employer has and a Project did not.
     `roleTitle` is the TITLE you held; `roleTypeId` is the catalog
     classification. They are different fields and both travel. */
  roleTitle?: string | null;
  location?: string | null;
  industrySpecializationId?: string | null;
  clientName?: string | null;
  clientDomain?: string | null;
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

/* ⚠ `clean` MOVED to `lib/reclassify.ts` (`E296`) — that module is prisma-free so
   a client component can import the loss sentence without pulling `pg` into the
   browser bundle. One definition, imported here. */

/** Everything the capture step and management surfaces render. */
export async function listEmployers(viewer: Viewer) {
  const profileId = await ownedProfileId(viewer);
  const rows = await prisma.employer.findMany({
    where: { provider_profile_id: profileId },
    orderBy: [{ sort_order: "asc" }, { start_date: "desc" }],
    include: {
      artifacts: { orderBy: [{ sort_order: "asc" }] },
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
          artifacts: { orderBy: [{ sort_order: "asc" }] },
        },
      },
    },
  });

  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    roleTitle: e.role_title,
    location: e.location,
    city: e.city,
    state: e.state,
    country: e.country,
    description: e.description,
    logoUrl: e.logo_url,
    isCurrent: e.is_current,
    startDate: e.start_date ? e.start_date.toISOString().slice(0, 10) : null,
    endDate: e.end_date ? e.end_date.toISOString().slice(0, 10) : null,
    artifacts: e.artifacts.map(toArtifactView),
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
    // E111 — structured, with `location` kept in sync as the display string so
    // every existing reader (cards, the profile view, the résumé importer) keeps
    // working without being touched.
    city: clean(input.city, 120),
    state: clean(input.state, 120),
    country: clean(input.country, 120),
    location:
      clean(
        [input.city, input.state, input.country]
          .map((x) => (x ?? "").trim())
          .filter(Boolean)
          .join(", "),
        200
      ) ?? clean(input.location, 200),
    description: clean(input.description, 4000),
    logo_url: clean(input.logoUrl, 1000),
    start_date: start,
    // A current job has no end date, whatever was typed.
    end_date: input.isCurrent ? null : end,
    is_current: Boolean(input.isCurrent),
  };
}

/**
 * The two things that must both happen after any job write (WS-2).
 *
 * Completeness was already recomputed here, because the enrichment weight reads
 * Employer. The weighted skill rollup now has to be too, and for a stronger
 * reason: a stale completeness score misreports a percentage, while a stale
 * rollup misreports WHAT SOMEBODY CAN DO. Change a job's end date and every
 * skill on it should decay differently; change its suite and the provider's
 * whole centre of gravity moves. Neither is visible as a bug — the profile just
 * quietly describes the wrong person, and matching ranks them accordingly.
 *
 * Paired in one function so a future mutation cannot pick up one and forget the
 * other. That is not hypothetical: the six existing call sites here were each
 * written separately, and every one of them would have needed the same second
 * line added by hand.
 */
async function afterJobChange(profileId: string): Promise<void> {
  await recomputeCompleteness(profileId);
  await recomputeProviderRollup(profileId);
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
  await afterJobChange(profileId);
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
  await afterJobChange(profileId);
}

export async function deleteEmployer(viewer: Viewer, employerId: string) {
  const profileId = await ownedProfileId(viewer);
  /*
    ── ⚠⚠ THIS COMMENT WAS FALSE (`P1-J1.4-E307`, 2026-09-02) ─────────────────

    ⚠ SUPERSEDED, quoted verbatim because it was believed for months: *"Projects
    cascade with the employer (schema onDelete: Cascade), so deleting a job takes
    its projects with it — which is what the user means by removing a job."*

    ⚠⚠ `prisma/schema.prisma` SAYS `onDelete: SetNull`. The projects are NOT
    deleted. They are ORPHANED — and because `listEmployers` only reaches projects
    through their employer, they become INVISIBLE while remaining in the database.
    The confirm dialog in `EmployersStep.tsx` stated the same falsehood to the
    user.

    ⚠ THE SCHEMA IS RIGHT AND THE COPY WAS WRONG. Deleting a job must not destroy
    the project history under it — that is Scott's *"not throwing things away"*
    rule — and there is now somewhere for the orphans to go. DO NOT "fix" this by
    changing the schema to Cascade.
  */
  const res = await prisma.employer.deleteMany({
    where: { id: employerId, provider_profile_id: profileId },
  });
  if (res.count === 0) {
    throw new OnboardingError("Employer not found", "INVALID");
  }
  await afterJobChange(profileId);
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

  /* ⚠ `E296` — optional on the modal path too. A project created by hand may
     well not state a role title or a location, and neither is in the required
     set; they exist so a CONVERSION does not have to throw them away. */
  const roleTitle = clean(input.roleTitle, 200);
  const location = clean(input.location, 200);

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
    role_title: roleTitle,
    location,
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
    // Stored NORMALIZED (scheme/path/www stripped, lowercased) so the guard
    // compares like with like no matter how the provider typed it.
    client_domain: normalizeHost(input.clientDomain),
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
  await afterJobChange(profileId);
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
  await afterJobChange(profileId);
}

export async function deleteProject(viewer: Viewer, projectId: string) {
  const profileId = await ownedProfileId(viewer);
  const res = await prisma.project.deleteMany({
    where: { id: projectId, provider_profile_id: profileId },
  });
  if (res.count === 0) throw new OnboardingError("Project not found", "INVALID");
  await afterJobChange(profileId);
}

/* ══════════════════════════════════════════════════════════════════════════════
   RECLASSIFY IN PLACE — employer ⇄ project (`P1-J1.4-E296` / `P1-J1.4-E307`)
   ══════════════════════════════════════════════════════════════════════════════

   **SCOTT:** *"what really determines the value of the AI is how easy the edit
   is… if the change of employer to project is easy, who cares. If not, they are
   mad."* And: *"this is the edit process. I would need to delete EVERY employer
   and then re-add them as a project."*

   ⚠⚠ PERCEIVED AI QUALITY IS ERROR **COST**, NOT ERROR RATE. `E294` reduced the
   parser's misses; it did not end them and it never will. This is what makes a
   miss cheap.

   ── ⚠⚠ AND IT CLOSES A HOLE THE IMPORT ALREADY OPENED ─────────────────────────

   `resume/import.ts` writes projects with `employer_id: null` whenever the model
   could not place them. Verified: `updateProject` never touches `employer_id` and
   `createProject` demands an employer up front, so BEFORE THIS FILE THERE WAS NO
   CODE PATH THAT COULD ATTACH ONE. The parser was producing rows the user could
   not fix.

   ── ⚠⚠ THE CONVERSIONS DO NOT GO THROUGH `projectData()`. READ THIS ───────────

   `projectData()` REQUIRES client name, description, role type, a start date and
   an end date unless current. A parser-created employer is guaranteed NONE of
   those — `Employer.start_date` and `description` are both nullable and there is
   no role type at all. Routing a conversion through it would reject exactly the
   rows this feature exists to rescue. So the row is written DIRECTLY, and the
   schema's own comment on `Project.role_type_id` blesses the case: *"a résumé
   importer cannot know the role, and defaulting it would write a value the
   provider never chose… A null is honest and queryable."*
   ⚠ THE MODAL'S REQUIRED SET STILL GOVERNS THE MODAL. It does not govern a
   reclassification of data that already exists.
*/

/**
 * WS-2 — attach, re-attach or DETACH a project. The cheap half.
 *
 * ⚠ THIS ALONE CLOSES THE `E294` HOLE: it is the only code path that can set
 * `Project.employer_id`.
 *
 * ⚠⚠ OWNERSHIP IS RE-CHECKED ON **BOTH** IDS against the resolved profile, the
 * same way `updateProject` does it. A foreign id must resolve to NOTHING rather
 * than to somebody else's row — the profile comes from the session and neither id
 * is trusted.
 * ⚠ `employerId: null` IS LEGAL and means detach. It is not an error and it is
 * not a no-op: an unattached project is a real state the import already produces.
 */
export async function moveProject(
  viewer: Viewer,
  projectId: string,
  employerId: string | null
) {
  const profileId = await ownedProfileId(viewer);

  const project = await prisma.project.findFirst({
    where: { id: projectId, provider_profile_id: profileId },
    select: { id: true },
  });
  if (!project) throw new OnboardingError("Project not found", "INVALID");

  let target: string | null = null;
  if (employerId) {
    const employer = await prisma.employer.findFirst({
      where: { id: employerId, provider_profile_id: profileId },
      select: { id: true },
    });
    if (!employer) throw new OnboardingError("Employer not found", "INVALID");
    target = employer.id;
  }

  /* Sorted to the end of its new home, the same rule `createProject` uses. */
  const count = target
    ? await prisma.project.count({ where: { employer_id: target } })
    : 0;

  await prisma.project.update({
    where: { id: project.id },
    data: { employer_id: target, sort_order: count * 10 },
  });
  /* ⚠ EVERY OTHER MUTATION IN THIS FILE DOES THIS. A stale rollup misreports
     what somebody can do. */
  await afterJobChange(profileId);
}

/**
 * WS-3 — EMPLOYER → PROJECT.
 *
 * ⚠⚠ THE ORDER OF THE TRANSACTION IS THE WHOLE CORRECTNESS ARGUMENT. Two
 * relations would be destroyed silently if the delete came first, and a third
 * would survive as an invisible orphan.
 *
 *   1  load the employer, owner-scoped
 *   2  refuse self-parenting
 *   3  verify the target, owner-scoped — REQUIRED, see below
 *   4  create the project from the field map
 *   5  MOVE `job_skills` and `artifacts` — before the delete
 *   6  RE-PARENT the employer's own projects to the target
 *   7  delete the employer
 *
 * ⚠ `targetEmployerId` IS REQUIRED HERE. Scott's whole complaint is a project
 * sitting at employer level; converting it to an UNATTACHED project would move
 * the mess rather than clear it. Detach stays available through `moveProject`.
 */
export async function convertEmployerToProject(
  viewer: Viewer,
  employerId: string,
  input: { targetEmployerId: string; clientName: string }
): Promise<{ projectId: string; reparentedProjects: number; movedSkills: number; movedArtifacts: number }> {
  const profileId = await ownedProfileId(viewer);

  /* ⚠ A ROW CANNOT BE ITS OWN PARENT. Checked before any read so the error is
     about the request rather than about what happens to be in the database. */
  if (input.targetEmployerId === employerId) {
    throw new OnboardingError(
      "Pick a different job for this project to sit under",
      "INVALID"
    );
  }

  const employer = await prisma.employer.findFirst({
    where: { id: employerId, provider_profile_id: profileId },
  });
  if (!employer) throw new OnboardingError("Employer not found", "INVALID");

  const target = await prisma.employer.findFirst({
    where: { id: input.targetEmployerId, provider_profile_id: profileId },
    select: { id: true },
  });
  if (!target) throw new OnboardingError("Employer not found", "INVALID");

  const clientName = clean(input.clientName, 200);
  if (!clientName) {
    throw new OnboardingError("Say which client this project was for", "INVALID");
  }

  const count = await prisma.project.count({ where: { employer_id: target.id } });

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        provider_profile_id: profileId,
        employer_id: target.id,
        sort_order: count * 10,
        ...employerToProjectData(employer, clientName),
      },
      select: { id: true },
    });

    /*
      ⚠⚠ SKILLS AND ARTIFACTS **MOVE**. THEY ARE NOT COPIED AND NOT DROPPED.
      Both models carry a nullable `employer_id` AND a nullable `project_id`, and
      both relations are `onDelete: Cascade` — so a row still pointing at the
      employer when it is deleted is DESTROYED SILENTLY. This has to happen
      before step 7 and there is no version of this that is safe afterwards.
    */
    const movedSkills = await tx.jobSkill.updateMany({
      where: { employer_id: employer.id },
      data: { employer_id: null, project_id: created.id },
    });
    const movedArtifacts = await tx.artifact.updateMany({
      where: { employer_id: employer.id },
      data: { employer_id: null, project_id: created.id },
    });

    /*
      ⚠⚠ THE EMPLOYER'S OWN PROJECTS ARE RE-PARENTED, NOT ORPHANED. A
      misclassified employer often already has children, and
      `Project.employer_id` is `onDelete: SetNull` — deleting the employer would
      leave them ALIVE BUT INVISIBLE, because `listEmployers` only reaches
      projects through employers. Projects cannot nest, so the target employer is
      their only sane home.
    */
    const reparented = await tx.project.updateMany({
      where: { employer_id: employer.id },
      data: { employer_id: target.id },
    });

    await tx.employer.delete({ where: { id: employer.id } });

    return {
      projectId: created.id,
      reparentedProjects: reparented.count,
      movedSkills: movedSkills.count,
      movedArtifacts: movedArtifacts.count,
    };
  });

  /* ⚠ OUTSIDE the transaction — the rollup reads its own tables and must see the
     committed state. */
  await afterJobChange(profileId);
  return result;
}

/**
 * WS-4 — PROJECT → EMPLOYER. Also Undo.
 *
 * ⚠ Scott: *"IT MUST WORK BOTH WAYS"* — the parser misjudges in both directions.
 *
 * ⚠⚠ THIS DIRECTION CAN LOSE DATA AND IT SAYS SO. `Employer` has no home for
 * outcomes, tools, highlights, `client_visibility`/`code_name`/`client_domain`,
 * `video_url`, `document_path`, `url`, `image_url` or `industry`. The caller is
 * given the count and the names through `projectLoss` BEFORE it commits.
 *
 * ⚠⚠ AND IT REFUSES OUTRIGHT ON A VALIDATED PROJECT. A client confirmed that
 * work happened; silently discarding their confirmation is not an edit somebody
 * gets to make by accident. Deleting it deliberately is still available.
 */
export async function projectLoss(viewer: Viewer, projectId: string): Promise<ProjectLoss> {
  const profileId = await ownedProfileId(viewer);
  const p = await prisma.project.findFirst({
    where: { id: projectId, provider_profile_id: profileId },
    select: {
      highlights: true,
      url: true,
      image_url: true,
      video_url: true,
      document_path: true,
      client_domain: true,
      code_name: true,
      client_visibility: true,
      industry_specialization_id: true,
      _count: { select: { outcomes: true, applications: true } },
    },
  });
  if (!p) throw new OnboardingError("Project not found", "INVALID");

  const fields: string[] = [];
  if (p.url) fields.push("the project link");
  if (p.image_url) fields.push("the cover image");
  if (p.video_url) fields.push("the video");
  if (p.document_path) fields.push("the attached document");
  if (p.client_domain) fields.push("the client domain");
  if (p.client_visibility !== "PUBLIC") fields.push("the confidentiality setting");
  if (p.code_name) fields.push("the code name");
  if (p.industry_specialization_id) fields.push("the industry");

  return {
    outcomes: p._count.outcomes,
    tools: p._count.applications,
    highlights: p.highlights.length,
    fields,
  };
}

export async function convertProjectToEmployer(
  viewer: Viewer,
  projectId: string,
  input: { name: string }
): Promise<{ employerId: string; movedSkills: number; movedArtifacts: number }> {
  const profileId = await ownedProfileId(viewer);

  const project = await prisma.project.findFirst({
    where: { id: projectId, provider_profile_id: profileId },
    select: {
      id: true,
      name: true,
      description: true,
      role_title: true,
      location: true,
      start_date: true,
      end_date: true,
      is_current: true,
      logo_url: true,
      contact_email: true,
      software_suite: true,
      role_type_id: true,
      client_name: true,
      validation_status: true,
      _count: { select: { validations: true } },
    },
  });
  if (!project) throw new OnboardingError("Project not found", "INVALID");

  /*
    ⚠⚠ THE REFUSAL. A CONFIRMED validation is somebody else's statement about
    this work — the provider does not get to discard it as a side effect of
    reclassifying a row.
  */
  /*
    ⚠ THE BRIEF NAMED `CONFIRMED`; THE ENUM HAS NO SUCH MEMBER.
    `ProjectValidationStatus` is `NONE | PENDING | VALIDATED` — `CONFIRMED` is the
    status on a `ProjectValidation` ROW, not on the project. Corrected to
    `VALIDATED` and reported at `E296`; the intent is unchanged.
    ⚠ AND **ANY** VALIDATION ROW BLOCKS, not only a confirmed one. A request that
    has been sent and not yet answered is a live question with a client — dropping
    it silently is the same fault one step earlier.
  */
  if (project.validation_status === "VALIDATED" || project._count.validations > 0) {
    throw new OnboardingError(
      "This project has a client validation on it, so it can’t be turned into a job. " +
        "Delete the project deliberately if that is really what you want.",
      "INVALID"
    );
  }

  const name = clean(input.name, 200);
  if (!name) throw new OnboardingError("Give the job an employer name", "INVALID");

  const count = await prisma.employer.count({
    where: { provider_profile_id: profileId },
  });

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.employer.create({
      data: {
        provider_profile_id: profileId,
        sort_order: count * 10,
        ...projectToEmployerData(project, name),
      },
      select: { id: true },
    });

    /* ⚠ SAME RULE, SAME ORDER — before the delete, or Cascade eats them. */
    const movedSkills = await tx.jobSkill.updateMany({
      where: { project_id: project.id },
      data: { project_id: null, employer_id: created.id },
    });
    const movedArtifacts = await tx.artifact.updateMany({
      where: { project_id: project.id },
      data: { project_id: null, employer_id: created.id },
    });

    await tx.project.delete({ where: { id: project.id } });

    return {
      employerId: created.id,
      movedSkills: movedSkills.count,
      movedArtifacts: movedArtifacts.count,
    };
  });

  await afterJobChange(profileId);
  return result;
}
