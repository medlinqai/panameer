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

/*
  THE WIZARD'S SECTIONS (brief_create_work_request_v1).

  Seven steps, but not seven sections: `role` and `domain` are one save each
  because each is a single answer that narrows the next, while `dates`,
  `location`, `budget` and `description` map one-to-one onto the deck's steps.
  `skills` keeps its name and its guard from the first wizard.

  `scope` is retained and still writes title/experience/duration — the first
  wizard's flow and any DRAFT it left behind still resolve through it.
*/
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
      /* ⚠ `P1-J4-E025`. Distinct from INCOMPLETE because the fix lives on a
         DIFFERENT page — the profile or the company, not the wizard — and the
         UI has to be able to tell those two refusals apart to link correctly. */
      | "IDENTITY_REQUIRED",
    /** Populated for IDENTITY_REQUIRED: the named fields, with their links. */
    public fields?: MissingIdentityField[]
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
    /* ⚠ `P1-J4-E025` — the buyer's own view of their publishing choice. This is
       the OWNER's read, so the real name is never redacted here; the redaction
       lives in `work-feed.ts`, which is what a provider sees. */
    companyVisibility: wr.company_visibility,
    companyCodeName: wr.company_code_name,
  };
}

/** Load a request the viewer owns (PAccount-scoped). Throws NOT_FOUND if not. */
async function loadOwned(viewer: Viewer, id: string, pAccountId: string) {
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

/*
  TODO(scheduler): the draft reminder has no trigger.

  `workRequestDraftReminderTemplate` is built and unit-tested, and the query it
  needs is the one below with a date filter — DRAFTs whose `updated_at` is older
  than N hours, whose buyer has an email, and which have not been reminded yet
  (that last part needs a `reminded_at` column, which is why this is a TODO and
  not a five-line function). What is missing is something to run it: there is no
  cron, queue or scheduled task anywhere in this repo. Adding one is
  infrastructure, not a template.
*/

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
    /*
      STEP 1 — THE ROLE, and it CLEARS what it narrows. Changing the role makes
      the previously chosen domain and skills wrong by definition (a skill
      belongs to exactly one role), and silently keeping them is how a request
      gets posted with a domain from the answer before last. Back preserves
      picks; CHANGING an answer does not.
    */
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

      /*
        "ANY / NOT SURE" IS A REAL ANSWER on the two vendor roles (WS-5).

        For an Application- or Technology-Specific request the domain IS the
        software suite, and a buyer is frequently the wrong person to know it:
        they want a payables specialist and their own finance team runs
        whatever it runs. Forcing a pick there produces a made-up answer that
        then silently FILTERS the results — the worst of both, because the buyer
        cannot see what the wrong guess excluded.

        A null pillar means "any suite". The skills step then offers capability
        domains instead of one suite's modules, and matching resolves those to
        modules through the Bridge. Suite becomes a booster rather than a gate.

        The agnostic roles keep the requirement: Operations- and
        Project-Specific domains are processes, not vendors, and "any process"
        is not a coherent request.
      */
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
      /*
        VALIDATED AGAINST THE CASCADE, not merely against the Pillar table. A
        domain that exists but holds no skills for this role is not a valid
        answer to "what domain, given that role" — and it is exactly what a
        stale client would post after the role changed under it.
      */
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

    /*
      SPECIALIZATIONS — optional, and "none" is a real answer.

      An empty list CLEARS the set rather than failing validation: the step is
      skippable by design, and a requester who looked and decided none applied
      has answered. Distinguishing that from "never visited" is not worth a
      column here — the wizard's own progress does it.
    */
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

    /*
      STEP 6 — the budget, as a RANGE, and "no budget" is a real answer.

      An empty range clears both columns rather than failing validation: the
      deck has a "not ready to set a budget?" escape, and a requester who takes
      it has answered the question.
    */
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
      /*
        THE TITLE IS DERIVED when the requester has not set one. The deck's flow
        never asks for a title, but `title` gates posting and is what a provider
        sees in the feed — so the first line of the description becomes it,
        rather than posting a request called "".
      */
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
      /*
        EVERY SKILL MUST BE INSIDE THE CASCADE the requester walked: the chosen
        role, and — once a domain has been picked — the chosen domain too. The
        first wizard only checked the role, which was right when there was no
        domain step; now a skill from a sibling domain would contradict the
        answer given one screen earlier.
      */
      const skills = await prisma.skill.findMany({
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

    /*
      ── ⚠⚠ STEP 10 — HOW IT PUBLISHES (`P1-J4-E025`) ─────────────────────────

      The review step was a no-op case because reviewing wrote nothing. It now
      carries the one publishing decision the buyer makes: whether the COMPANY
      NAME is shown.

      ⚠ SAME THREE-STATE PATTERN AS `Project.client_visibility`, on the SAME
      `ClientVisibility` enum, validated the same way — `employers.ts:301`
      refuses a CONFIDENTIAL project with no code name, and this refuses the
      same thing for the same reason: a redaction with nothing in its place
      renders as missing data rather than as a decision.

      ⚠ IT GOVERNS THE NAME AND NOTHING ELSE. There is deliberately no way to
      hide the person, the standing counts, the industry or the verification
      state — a request that hid all of those is the scam this brief exists to
      stop.
    */
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

/**
 * ⚠⚠ THE IDENTITY HALF OF THE POST GATE (`P1-J4-E025`) — SERVER-SIDE.
 *
 * **SCOTT:** *"i am letting you post for free… if you refuse to give basic
 * details… meh, maybe it isn't the place for you?"*
 *
 * ⚠ THIS IS THE BOUNDARY. The wizard mirrors it, but the wizard is not it — the
 * route is reachable directly and a client that skipped the check would post an
 * anonymous request anyway. The UI reads the SAME function.
 *
 * ⚠ IT EXTENDS `missingForPost`'s CONTRACT RATHER THAN ADDING A SECOND GATE.
 * ⚠ SUPERSEDED, quoted: the brief that ordered this said the post route *"today
 * checks only `guardApi(\"canHireTalent\")`"*. IT DID NOT — `missingForPost`
 * already required title, category and skills server-side. That check is
 * untouched and this runs after it, so nothing that used to be refused is now
 * allowed.
 *
 * ⚠ DRAFTS ARE NEVER TOUCHED BY THIS. `saveSection` does not call it; only
 * posting does. Write and save whatever you like.
 */
export async function missingIdentityForPerson(buyerPersonId: string): Promise<PostRequirementKey[]> {
  const person = await prisma.person.findUnique({
    where: { id: buyerPersonId },
    select: {
      first_name: true,
      last_name: true,
      title: true,
      photo_url: true,
      company: { select: { name: true, country: true } },
      /* ⚠ THE SAME SHAPE `lib/onboarding.ts:2360` USES FOR PROVIDER PUBLISH —
         same status, same reason: a work order is between companies. */
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

  /*
    ⚠ THE REFUSAL NAMES THE FIELD AND SAYS WHY, one reason per field, in the
    PROVIDER's interest. Not "complete your profile". The structured `fields`
    array carries the link so the UI can offer it; `message` is the same content
    flattened for a client that only reads the string.
  */
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

/**
 * The "your Work Request is live" confirmation
 * (brief_transactional_email_suite WS-B).
 *
 * NEVER THROWS. The request IS posted by the time this runs — the write above
 * already committed — so a Resend outage must not surface as "could not post"
 * and send the requester back to a wizard for work that is already done. It
 * logs and returns.
 *
 * Skipped entirely when RESEND_API_KEY is unset, which is every local
 * environment: `sendEmail` constructs its client lazily and throws without a
 * key, and posting a Work Request on a dev machine should not depend on having
 * one.
 */
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
      logoUrl: `${base}/brand/panameer-new-on-light.png`,
    });
    await sendEmail({ to, subject, html, text });
  } catch (e) {
    console.error("[work-request] posted confirmation failed to send:", e);
  }
}
