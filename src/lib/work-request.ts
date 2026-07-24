import { prisma } from "@/lib/prisma";
import { scopedToPAccount, withPAccount, type Viewer } from "@/lib/access";

/**
 * Work Requests (brief_L) — a Service Buyer creates, saves-as-you-go, and posts.
 *
 * Access: every DRAFT read/write is PAccount-scoped via `scopedToPAccount`, so a
 * buyer only ever touches their own org's requests. There is no by-id targeting
 * without the fence — a request id from client input is always ANDed with the
 * viewer's `p_account_id`, so a cross-org id simply resolves to nothing (fail
 * closed). POSTED is the finish line; no provider-facing read here.
 */

const EXPERIENCE_LEVELS = ["BEGINNER", "MID_CAREER", "EXPERT"] as const;
const BUDGET_TYPES = ["FIXED", "HOURLY"] as const;
const WORKSITES = ["REMOTE", "ONSITE", "HYBRID"] as const;
const DURATIONS = [
  "LT_1_MONTH",
  "ONE_TO_3_MONTHS",
  "THREE_TO_6_MONTHS",
  "GT_6_MONTHS",
] as const;

export const WORK_REQUEST_SECTIONS = [
  "skills",
  "scope",
  "location",
  "review",
] as const;
export type WorkRequestSection = (typeof WORK_REQUEST_SECTIONS)[number];

export class WorkRequestError extends Error {
  constructor(
    message: string,
    public code: "NOT_A_BUYER" | "NOT_FOUND" | "INVALID" | "POSTED" | "INCOMPLETE"
  ) {
    super(message);
    this.name = "WorkRequestError";
  }
}

/** Resolve the viewer's buyer identity + tenancy fence. Fails closed. */
async function resolveBuyer(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      is_service_buyer: true,
      company: { select: { p_account_id: true } },
    },
  });
  if (!person || !person.is_service_buyer) {
    throw new WorkRequestError("Not a buyer", "NOT_A_BUYER");
  }
  return { personId: person.id, pAccountId: person.company.p_account_id };
}

/** A viewer scoped to the buyer's P-Account (for scopedToPAccount fences). */
function scopedViewer(viewer: Viewer, pAccountId: string): Viewer {
  return withPAccount(viewer, pAccountId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SectionData = Record<string, any>;

/** Shape the wizard renders + resumes from. */
function serialize(wr: Awaited<ReturnType<typeof loadOwned>>) {
  return {
    id: wr.id,
    status: wr.status,
    postedAt: wr.posted_at ? wr.posted_at.toISOString() : null,
    title: wr.title,
    description: wr.description ?? "",
    roleTypeId: wr.role_type_id,
    skillIds: wr.skills.map((s) => s.skill_id),
    skillNames: wr.skills.map((s) => ({ id: s.skill_id, name: s.skill.name })),
    experienceLevel: wr.experience_level,
    budgetType: wr.budget_type,
    budgetAmountCents: wr.budget_amount_cents,
    currency: wr.currency,
    worksite: wr.worksite,
    locationCountry: wr.location_country,
    regionId: wr.region_id,
    duration: wr.duration,
  };
}

/** Load a request the viewer owns (PAccount-scoped). Throws NOT_FOUND if not. */
async function loadOwned(viewer: Viewer, id: string, pAccountId: string) {
  const wr = await prisma.workRequest.findFirst({
    where: scopedToPAccount(scopedViewer(viewer, pAccountId), { id }),
    include: { skills: { include: { skill: { select: { name: true } } } } },
  });
  if (!wr) throw new WorkRequestError("Work request not found", "NOT_FOUND");
  return wr;
}

/** The buyer's most recent DRAFT (for resume), or null. */
export async function getCurrentDraft(viewer: Viewer) {
  const { pAccountId } = await resolveBuyer(viewer);
  const draft = await prisma.workRequest.findFirst({
    where: scopedToPAccount(scopedViewer(viewer, pAccountId), {
      status: "DRAFT" as const,
    }),
    orderBy: { updated_at: "desc" },
    include: { skills: { include: { skill: { select: { name: true } } } } },
  });
  return draft ? serialize(draft) : null;
}

/** Fetch one request the viewer owns. */
export async function getWorkRequest(viewer: Viewer, id: string) {
  const { pAccountId } = await resolveBuyer(viewer);
  return serialize(await loadOwned(viewer, id, pAccountId));
}

/** Create a fresh empty DRAFT for the buyer's org, optionally applying a step. */
export async function createDraft(
  viewer: Viewer,
  section?: WorkRequestSection,
  data?: SectionData
) {
  const { personId, pAccountId } = await resolveBuyer(viewer);
  const draft = await prisma.workRequest.create({
    data: {
      buyer_person_id: personId,
      p_account_id: pAccountId,
      status: "DRAFT",
    },
  });
  if (section) {
    return saveSection(viewer, draft.id, section, data ?? {});
  }
  return getWorkRequest(viewer, draft.id);
}

/** Save one section of a DRAFT (PAccount-scoped; POSTED is immutable). */
export async function saveSection(
  viewer: Viewer,
  id: string,
  section: WorkRequestSection,
  data: SectionData
) {
  const { pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, id, pAccountId);
  if (wr.status !== "DRAFT") {
    throw new WorkRequestError("A posted request can't be edited", "POSTED");
  }

  switch (section) {
    case "skills": {
      const roleTypeId: string | null = data.roleTypeId ?? null;
      const skillIds: string[] = Array.isArray(data.skillIds) ? data.skillIds : [];
      if (!roleTypeId || skillIds.length === 0) {
        throw new WorkRequestError(
          "Pick a category and at least one skill",
          "INVALID"
        );
      }
      // One-main-RoleType: every chosen skill must belong to the selected type
      // (same guard the provider skills step uses).
      const skills = await prisma.skill.findMany({
        where: { id: { in: skillIds } },
        select: { id: true, role_type_id: true },
      });
      if (
        skills.length !== skillIds.length ||
        skills.some((s) => s.role_type_id !== roleTypeId)
      ) {
        throw new WorkRequestError(
          "All skills must belong to the selected category",
          "INVALID"
        );
      }
      await prisma.$transaction([
        prisma.workRequest.update({
          where: { id: wr.id },
          data: { role_type_id: roleTypeId },
        }),
        prisma.workRequestSkill.deleteMany({ where: { work_request_id: wr.id } }),
        prisma.workRequestSkill.createMany({
          data: skillIds.map((skill_id) => ({
            work_request_id: wr.id,
            skill_id,
          })),
        }),
      ]);
      break;
    }

    case "scope": {
      const title: string = (data.title ?? "").trim();
      if (!title) throw new WorkRequestError("A title is required", "INVALID");
      const experienceLevel = data.experienceLevel ?? null;
      if (experienceLevel && !EXPERIENCE_LEVELS.includes(experienceLevel)) {
        throw new WorkRequestError("Invalid experience level", "INVALID");
      }
      const budgetType = data.budgetType ?? null;
      if (budgetType && !BUDGET_TYPES.includes(budgetType)) {
        throw new WorkRequestError("Invalid budget type", "INVALID");
      }
      const duration = data.duration ?? null;
      if (duration && !DURATIONS.includes(duration)) {
        throw new WorkRequestError("Invalid duration", "INVALID");
      }
      // Dollars → integer cents (money is never a Float).
      let budgetCents: number | null = null;
      if (data.budgetDollars !== undefined && data.budgetDollars !== "" && data.budgetDollars !== null) {
        const n = Number(data.budgetDollars);
        if (!Number.isFinite(n) || n < 0) {
          throw new WorkRequestError("Invalid budget amount", "INVALID");
        }
        budgetCents = Math.round(n * 100);
      }
      await prisma.workRequest.update({
        where: { id: wr.id },
        data: {
          title,
          description: data.description?.trim() || null,
          experience_level: experienceLevel,
          budget_type: budgetType,
          budget_amount_cents: budgetCents,
          duration,
        },
      });
      break;
    }

    case "location": {
      const worksite = data.worksite ?? null;
      if (worksite && !WORKSITES.includes(worksite)) {
        throw new WorkRequestError("Invalid worksite", "INVALID");
      }
      const regionId: string | null = data.regionId ?? null;
      if (regionId) {
        const region = await prisma.region.findUnique({ where: { id: regionId } });
        if (!region) throw new WorkRequestError("Invalid region", "INVALID");
      }
      await prisma.workRequest.update({
        where: { id: wr.id },
        data: {
          location_country: data.locationCountry?.trim() || null,
          worksite,
          region_id: regionId,
        },
      });
      break;
    }

    case "review":
      break;
  }

  return getWorkRequest(viewer, id);
}

/** Required fields for a request to be postable. */
function missingForPost(wr: Awaited<ReturnType<typeof loadOwned>>): string[] {
  const missing: string[] = [];
  if (!wr.title.trim()) missing.push("title");
  if (!wr.role_type_id) missing.push("category");
  if (wr.skills.length === 0) missing.push("skills");
  return missing;
}

/** Post a DRAFT → POSTED + posted_at (PAccount-scoped; immutable after). */
export async function postWorkRequest(viewer: Viewer, id: string) {
  const { pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, id, pAccountId);
  if (wr.status === "POSTED") {
    // Idempotent-friendly: already posted.
    return getWorkRequest(viewer, id);
  }
  const missing = missingForPost(wr);
  if (missing.length) {
    throw new WorkRequestError(
      `Complete these before posting: ${missing.join(", ")}`,
      "INCOMPLETE"
    );
  }
  await prisma.workRequest.update({
    where: { id: wr.id },
    data: { status: "POSTED", posted_at: new Date() },
  });
  return getWorkRequest(viewer, id);
}
