import { prisma } from "@/lib/prisma";
import { scopedToPAccount, withPAccount, type Viewer } from "@/lib/access";
import { sendEmail } from "@/lib/resend";
import { appBaseUrl } from "@/lib/verification";
import { workRequestPostedTemplate } from "@/lib/email/templates/work-request-posted";
import {
  missingIdentityForPost,
  requirementFor,
  type PostRequirementKey,
} from "@/lib/work-request-identity";

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
  "role",
  "domain",
  "skills",
  "specializations",
  "dates",
  "location",
  "budget",
  "description",
  "scope",
  "review",
] as const;
export type WorkRequestSection = (typeof WORK_REQUEST_SECTIONS)[number];

export type MissingIdentityField = {
  key: string;
  field: string;
  reason: string;
  href: string;
};

export class WorkRequestError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_A_BUYER"
      | "NOT_FOUND"
      | "INVALID"
      | "POSTED"
      | "INCOMPLETE"
      | "IDENTITY_REQUIRED",
    /** Populated for IDENTITY_REQUIRED: the named fields, with their links. */
    public fields?: MissingIdentityField[]
  ) {
    super(message);
    this.name = "WorkRequestError";
  }
}

/** Resolve the viewer's buyer identity + tenancy fence. Fails closed. */
export async function resolveBuyer(viewer: Viewer) {
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
    pillarId: wr.pillar_id,
    skillIds: wr.skills.map((s) => s.skill_id),
    specializationIds: wr.specializations.map((s) => s.specialization_id),
    skillNames: wr.skills.map((s) => ({ id: s.skill_id, name: s.skill.name })),
    experienceLevel: wr.experience_level,
    budgetType: wr.budget_type,
    budgetAmountCents: wr.budget_amount_cents,
    budgetMinCents: wr.budget_min_cents,
    budgetMaxCents: wr.budget_max_cents,
    currency: wr.currency,
    startDate: wr.start_date ? wr.start_date.toISOString().slice(0, 10) : null,
    endDate: wr.end_date ? wr.end_date.toISOString().slice(0, 10) : null,
    worksite: wr.worksite,
    locationCountry: wr.location_country,
    regionId: wr.region_id,
    duration: wr.duration,
    companyVisibility: wr.company_visibility,
    companyCodeName: wr.company_code_name,
  };
}

export async function loadOwned(viewer: Viewer, id: string, pAccountId: string) {
  const wr = await prisma.workRequest.findFirst({
    where: scopedToPAccount(scopedViewer(viewer, pAccountId), { id }),
    include: {
      skills: { include: { skill: { select: { name: true } } } },
      specializations: true,
    },
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
    include: {
      skills: { include: { skill: { select: { name: true } } } },
      specializations: true,
    },
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
  data?: SectionData,
  opts?: { soleSourced?: boolean }
) {
  const { personId, pAccountId } = await resolveBuyer(viewer);
  const draft = await prisma.workRequest.create({
    data: {
      buyer_person_id: personId,
      p_account_id: pAccountId,
      status: "DRAFT",
      sole_sourced: opts?.soleSourced ?? false,
      proposal_access: "INVITE_ONLY",
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
    case "role": {
      const roleTypeId: string | null = data.roleTypeId ?? null;
      if (!roleTypeId) throw new WorkRequestError("Pick a role", "INVALID");
      const role = await prisma.roleType.findUnique({ where: { id: roleTypeId } });
      if (!role) throw new WorkRequestError("Unknown role", "INVALID");

      const changed = wr.role_type_id !== roleTypeId;
      await prisma.$transaction([
        prisma.workRequest.update({
          where: { id: wr.id },
          data: {
            role_type_id: roleTypeId,
            ...(changed ? { pillar_id: null } : {}),
          },
        }),
        ...(changed
          ? [prisma.workRequestSkill.deleteMany({ where: { work_request_id: wr.id } })]
          : []),
      ]);
      break;
    }

    /* STEP 2 — the domain, within the chosen role. Same clearing rule. */
    case "domain": {
      const pillarId: string | null = data.pillarId ?? null;
      if (!wr.role_type_id) {
        throw new WorkRequestError("Pick a role first", "INVALID");
      }

      const isVendorRole = await prisma.roleType.findFirst({
        where: {
          id: wr.role_type_id,
          name: { in: ["Application-Specific", "Technology-Specific"] },
        },
        select: { id: true },
      });
      if (!pillarId && !isVendorRole) {
        throw new WorkRequestError("Pick a domain", "INVALID");
      }
      if (!pillarId) {
        const changedToAny = wr.pillar_id !== null;
        await prisma.$transaction([
          prisma.workRequest.update({ where: { id: wr.id }, data: { pillar_id: null } }),
          ...(changedToAny
            ? [prisma.workRequestSkill.deleteMany({ where: { work_request_id: wr.id } })]
            : []),
        ]);
        break;
      }
      const inRole = await prisma.skill.findFirst({
        where: { role_type_id: wr.role_type_id, pillar_id: pillarId },
        select: { id: true },
      });
      if (!inRole) {
        throw new WorkRequestError("That domain isn't in the chosen role", "INVALID");
      }

      const changed = wr.pillar_id !== pillarId;
      await prisma.$transaction([
        prisma.workRequest.update({ where: { id: wr.id }, data: { pillar_id: pillarId } }),
        ...(changed
          ? [prisma.workRequestSkill.deleteMany({ where: { work_request_id: wr.id } })]
          : []),
      ]);
      break;
    }

    case "specializations": {
      const ids: string[] = Array.isArray(data.specializationIds)
        ? data.specializationIds
        : [];
      if (ids.length > 0) {
        // Validated against the vocabulary, so a stale or hand-rolled client
        // cannot attach an id that is not a Specialization.
        const found = await prisma.specialization.count({ where: { id: { in: ids } } });
        if (found !== ids.length) {
          throw new WorkRequestError("Unknown specialization", "INVALID");
        }
      }
      await prisma.$transaction([
        prisma.workRequestSpecialization.deleteMany({
          where: { work_request_id: wr.id },
        }),
        ...(ids.length
          ? [
              prisma.workRequestSpecialization.createMany({
                data: ids.map((specialization_id) => ({
                  work_request_id: wr.id,
                  specialization_id,
                })),
              }),
            ]
          : []),
      ]);
      break;
    }

    /* STEP 4 — when the work runs. */
    case "dates": {
      const parse = (v: unknown): Date | null => {
        if (!v || typeof v !== "string") return null;
        const d = new Date(`${v}T00:00:00.000Z`);
        return Number.isNaN(d.getTime()) ? null : d;
      };
      const start = parse(data.startDate);
      const end = parse(data.endDate);
      if (start && end && end < start) {
        throw new WorkRequestError("The end date is before the start date", "INVALID");
      }
      await prisma.workRequest.update({
        where: { id: wr.id },
        data: { start_date: start, end_date: end },
      });
      break;
    }

    // STEP 6 — the budget, as a RANGE, and "no budget" is a real answer.
    case "budget": {
      const budgetType = data.budgetType ?? null;
      if (budgetType && !BUDGET_TYPES.includes(budgetType)) {
        throw new WorkRequestError("Invalid budget type", "INVALID");
      }
      const cents = (v: unknown): number | null => {
        if (v === undefined || v === null || v === "") return null;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) {
          throw new WorkRequestError("Invalid budget amount", "INVALID");
        }
        return Math.round(n * 100);
      };
      const min = cents(data.budgetMinDollars);
      const max = cents(data.budgetMaxDollars);
      if (min !== null && max !== null && max < min) {
        throw new WorkRequestError("The maximum is below the minimum", "INVALID");
      }
      await prisma.workRequest.update({
        where: { id: wr.id },
        data: {
          budget_type: budgetType,
          budget_min_cents: min,
          budget_max_cents: max,
        },
      });
      break;
    }

    /* STEP 7 — the description, and the title derived from it. */
    case "description": {
      const description: string = (data.description ?? "").trim();
      if (!description) {
        throw new WorkRequestError("Describe what you need", "INVALID");
      }
      // THE TITLE IS DERIVED when the requester has not set one. The deck's flow
      const title =
        (data.title ?? "").trim() ||
        wr.title.trim() ||
        description.split("\n")[0].slice(0, 120).trim();
      await prisma.workRequest.update({
        where: { id: wr.id },
        data: { description, title },
      });
      break;
    }

    case "skills": {
      const roleTypeId: string | null = data.roleTypeId ?? null;
      const skillIds: string[] = Array.isArray(data.skillIds) ? data.skillIds : [];
      if (!roleTypeId || skillIds.length === 0) {
        throw new WorkRequestError(
          "Pick a category and at least one skill",
          "INVALID"
        );
      }
      // EVERY SKILL MUST BE INSIDE THE CASCADE the requester walked: the chosen
      const skills = await prisma.skill.findMany({
        // NO `status` FILTER HERE, DELIBERATELY . This
        where: { id: { in: skillIds } },
        select: { id: true, role_type_id: true, pillar_id: true },
      });
      if (
        skills.length !== skillIds.length ||
        skills.some((s) => s.role_type_id !== roleTypeId) ||
        (wr.pillar_id && skills.some((s) => s.pillar_id !== wr.pillar_id))
      ) {
        throw new WorkRequestError(
          "All skills must belong to the selected role and domain",
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

    // STEP 10 — HOW IT PUBLISHES
    case "review": {
      if (data.companyVisibility === undefined && data.companyCodeName === undefined) break;
      const visibility = String(data.companyVisibility ?? wr.company_visibility);
      if (!["PUBLIC", "PLUS_ONLY", "CONFIDENTIAL"].includes(visibility)) {
        throw new WorkRequestError("Invalid company visibility", "INVALID");
      }
      const codeName =
        data.companyCodeName === undefined
          ? wr.company_code_name
          : String(data.companyCodeName ?? "").trim() || null;
      if (visibility === "CONFIDENTIAL" && !codeName) {
        throw new WorkRequestError(
          "Give the company a code name providers will see instead",
          "INVALID"
        );
      }
      await prisma.workRequest.update({
        where: { id: wr.id },
        data: {
          company_visibility: visibility as "PUBLIC" | "PLUS_ONLY" | "CONFIDENTIAL",
          company_code_name: codeName,
        },
      });
      break;
    }
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

/** THE IDENTITY HALF OF THE POST GATE — SERVER-SIDE. */
export async function missingIdentityForPerson(buyerPersonId: string): Promise<PostRequirementKey[]> {
  const person = await prisma.person.findUnique({
    where: { id: buyerPersonId },
    select: {
      first_name: true,
      last_name: true,
      title: true,
      photo_url: true,
      company: { select: { name: true, country: true } },
      companyMemberships: {
        where: { status: "APPROVED" as const },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!person) return ["name"];
  return missingIdentityForPost({
    firstName: person.first_name,
    lastName: person.last_name,
    photoUrl: person.photo_url,
    jobTitle: person.title,
    hasApprovedCompanyMembership: person.companyMemberships.length > 0,
    companyName: person.company?.name,
    companyCountry: person.company?.country,
  });
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

  // THE REFUSAL NAMES THE FIELD AND SAYS WHY, one reason per field, in the
  const missingIds = await missingIdentityForPerson(wr.buyer_person_id);
  if (missingIds.length) {
    const reqs = missingIds.map(requirementFor);
    throw new WorkRequestError(
      reqs.map((r) => `${r.field} — ${r.reason}`).join(" "),
      "IDENTITY_REQUIRED",
      reqs.map((r) => ({ key: r.key, field: r.field, reason: r.reason, href: r.href }))
    );
  }
  await prisma.workRequest.update({
    where: { id: wr.id },
    data: { status: "POSTED", posted_at: new Date() },
  });

  await sendPostedConfirmation(wr.id, wr.buyer_person_id, wr.title);

  return getWorkRequest(viewer, id);
}

/** The "your Work Request is live" confirmation */
async function sendPostedConfirmation(
  workRequestId: string,
  buyerPersonId: string,
  title: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const person = await prisma.person.findUnique({
      where: { id: buyerPersonId },
      select: {
        first_name: true,
        company: { select: { name: true } },
        user: { select: { email: true } },
      },
    });
    const to = person?.user?.email;
    if (!to) return;

    const base = appBaseUrl();
    const { subject, html, text } = workRequestPostedTemplate({
      firstName: person.first_name,
      workRequestTitle: title,
      requesterCompany: person.company?.name ?? "your company",
      viewUrl: `${base}/work-requests/${workRequestId}/share`,
      logoUrl: `${base}/brand/panameer-lockup-ink.png`,
    });
    // NO SUBJECT ROW PER MESSAGE: `WorkRequest` is what the mail is ABOUT, and
    await sendEmail({
      to,
      subject,
      html,
      text,
      template: "work-request-posted",
      subjectType: "WorkRequest",
      subjectId: workRequestId,
    });
  } catch (e) {
    console.error("[work-request] posted confirmation failed to send:", e);
  }
}
