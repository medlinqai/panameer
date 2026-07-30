import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { OnboardingError } from "@/lib/onboarding";

/**
 * Artifacts — proof of work attached to an Employer OR a Project
 * (PJv2 WS4 / E078a).
 *
 * Two shapes behind one model: an UPLOAD (a file in the private `artifacts`
 * bucket, stored as an object path) or a URL (a published case study, a repo, a
 * recorded talk).
 *
 * OWNER-SCOPED by construction, like every other provider write in this
 * codebase: the profile comes from the session, and the employer/project id in
 * the request is re-checked against THAT profile before anything is written. A
 * foreign id resolves to nothing rather than letting someone hang a file off a
 * stranger's work history.
 */

export type ArtifactInput = {
  /** Exactly one of these. */
  employerId?: string | null;
  projectId?: string | null;
  kind: "UPLOAD" | "URL";
  /** Required when kind = UPLOAD — produced by the upload route. */
  filePath?: string | null;
  /** Required when kind = URL. */
  url?: string | null;
  label: string;
};

export type ArtifactView = {
  id: string;
  kind: "UPLOAD" | "URL";
  label: string;
  url: string | null;
  fileName: string | null;
  employerId: string | null;
  projectId: string | null;
};

/** Max artifacts per owner — a proof list, not a file dump. */
const MAX_PER_OWNER = 12;

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

/**
 * Resolve and AUTHORIZE the owner. Returns the column pair to write.
 *
 * Exactly one owner must be supplied. The model allows both columns to be null
 * and Prisma can't express "exactly one", so this is where that invariant is
 * actually enforced — an artifact belonging to nothing would be invisible
 * forever, and one belonging to both would render twice.
 */
async function resolveOwner(
  profileId: string,
  input: Pick<ArtifactInput, "employerId" | "projectId">
): Promise<{ employer_id: string | null; project_id: string | null }> {
  const employerId = input.employerId?.trim() || null;
  const projectId = input.projectId?.trim() || null;

  if (Boolean(employerId) === Boolean(projectId)) {
    throw new OnboardingError(
      "An artifact must belong to exactly one job or one project",
      "INVALID"
    );
  }

  if (employerId) {
    const owned = await prisma.employer.findFirst({
      where: { id: employerId, provider_profile_id: profileId },
      select: { id: true },
    });
    if (!owned) throw new OnboardingError("Job not found", "INVALID");
    return { employer_id: owned.id, project_id: null };
  }

  const owned = await prisma.project.findFirst({
    where: { id: projectId!, provider_profile_id: profileId },
    select: { id: true },
  });
  if (!owned) throw new OnboardingError("Project not found", "INVALID");
  return { employer_id: null, project_id: owned.id };
}

const clean = (v?: string | null, max = 300) => {
  const s = (v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

export async function createArtifact(viewer: Viewer, input: ArtifactInput) {
  const profileId = await ownedProfileId(viewer);
  const owner = await resolveOwner(profileId, input);

  const label = clean(input.label, 200);
  if (!label) throw new OnboardingError("Give the artifact a label", "INVALID");

  if (input.kind === "URL") {
    const url = clean(input.url, 1000);
    if (!url || !/^https?:\/\/\S+\.\S+/i.test(url)) {
      throw new OnboardingError("That link isn't a valid URL", "INVALID");
    }
    return writeArtifact(owner, { kind: "URL" as const, url, file_path: null, label });
  }

  const filePath = clean(input.filePath, 1000);
  if (!filePath) {
    throw new OnboardingError("Upload a file first", "INVALID");
  }
  return writeArtifact(owner, {
    kind: "UPLOAD" as const,
    url: null,
    file_path: filePath,
    label,
  });
}

async function writeArtifact(
  owner: { employer_id: string | null; project_id: string | null },
  data: {
    kind: "UPLOAD" | "URL";
    url: string | null;
    file_path: string | null;
    label: string;
  }
) {
  const count = await prisma.artifact.count({ where: owner });
  if (count >= MAX_PER_OWNER) {
    throw new OnboardingError(
      `That's ${MAX_PER_OWNER} artifacts — remove one before adding another.`,
      "INVALID"
    );
  }
  const row = await prisma.artifact.create({
    data: { ...owner, ...data, sort_order: count * 10 },
    select: { id: true },
  });
  return row.id;
}

export async function deleteArtifact(viewer: Viewer, artifactId: string) {
  const profileId = await ownedProfileId(viewer);
  // Re-check ownership THROUGH the parent — an artifact has no profile column of
  // its own, so this is the only path that proves it belongs to the caller.
  const owned = await prisma.artifact.findFirst({
    where: {
      id: artifactId,
      OR: [
        { employer: { provider_profile_id: profileId } },
        { project: { provider_profile_id: profileId } },
      ],
    },
    select: { id: true },
  });
  if (!owned) throw new OnboardingError("Artifact not found", "INVALID");
  await prisma.artifact.delete({ where: { id: owned.id } });
}

/** Every artifact on the viewer's own profile, for the provider surfaces. */
export async function listArtifacts(viewer: Viewer): Promise<ArtifactView[]> {
  const profileId = await ownedProfileId(viewer);
  const rows = await prisma.artifact.findMany({
    where: {
      OR: [
        { employer: { provider_profile_id: profileId } },
        { project: { provider_profile_id: profileId } },
      ],
    },
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
  });
  return rows.map(toView);
}

export function toView(a: {
  id: string;
  kind: string;
  label: string;
  url: string | null;
  file_path: string | null;
  employer_id: string | null;
  project_id: string | null;
}): ArtifactView {
  return {
    id: a.id,
    kind: a.kind as "UPLOAD" | "URL",
    label: a.label,
    url: a.url,
    // Only the FILE NAME leaves the server, never the storage path — the bucket
    // is private and a path is a handle to it.
    fileName: a.file_path ? a.file_path.split("/").pop() ?? null : null,
    employerId: a.employer_id,
    projectId: a.project_id,
  };
}
