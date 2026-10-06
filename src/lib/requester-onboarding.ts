import { prisma } from "@/lib/prisma";
/* THE ONE WRITE BOUNDARY for country (`E729` WS-C). */
import { countryColumns } from "@/lib/country";
import { creditInviteForNewUser } from "@/lib/colleague-invite";
import { hashPassword } from "@/lib/password";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { OnboardingError } from "@/lib/onboarding";
import { USER_TOS_VERSION } from "@/lib/tos";
import type { Viewer } from "@/lib/access";

/** REQUESTER onboarding (P1-J1.2, brief_requester_onboarding). */

/** The step list lives in `requester-steps.ts` (no server imports) and is */
export { REQUESTER_STEPS, type RequesterStep } from "@/lib/requester-steps";
import { REQUESTER_STEPS, type RequesterStep } from "@/lib/requester-steps";

export type AddressInput = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type CreateRequesterAccountInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country?: string;
  marketingOptIn?: boolean;
  tosAccepted: boolean;
  // WHICH JOB REGISTERED . Optional and defaulting to
  job?: "requester" | "buyer";
};

/** Create the requester account + backbone in one transaction. */
export async function createRequesterAccount(
  input: CreateRequesterAccountInput
): Promise<{ userId: string; email: string }> {
  const email = normalizeEmail(input.email);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (!input.tosAccepted) {
    throw new OnboardingError("You must accept the Terms of Service", "INVALID");
  }
  if (input.password.length < 8) {
    throw new OnboardingError("Password must be at least 8 characters", "INVALID");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new OnboardingError("That email is already registered", "EMAIL_TAKEN");
  }

  const password_hash = await hashPassword(input.password);
  const placeholder = `${firstName} ${lastName}`.trim() || email;

  const userId = await prisma.$transaction(async (tx) => {
    const pAccount = await tx.pAccount.create({
      data: { kind: "BUYER", name: placeholder, status: "ACTIVE" },
    });
    const company = await tx.company.create({
      data: { p_account_id: pAccount.id, name: placeholder },
    });
    const user = await tx.user.create({
      data: {
        email,
        password_hash,
        first_name: firstName,
        last_name: lastName,
        role: "MEMBER",
        tos_accepted_at: new Date(),
        tos_version: USER_TOS_VERSION,
      },
    });
    const person = await tx.person.create({
      data: {
        company_id: company.id,
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        status: "ACTIVE",
        // USER_CLASS SERVICE_BUYER × USER_JOB Requester, expressed in the model
        is_service_buyer: true,
      },
    });
    await tx.requesterProfile.create({ data: { person_id: person.id } });

    // USER_JOB = BUYER, IN THE MODEL THAT EXISTS TODAY
    if (input.job === "buyer") {
      await tx.buyerProfile.create({ data: { person_id: person.id } });
    }

    // Sign-up country seeds the requester's address, so step 2 pre-fills the
    // one field they have already answered.
    if (input.country?.trim()) {
      const site = await tx.site.create({
        data: { company_id: company.id, name: "Primary" },
      });
      await tx.address.create({
        /* BOTH COLUMNS (`E729` WS-C). */
        data: { site_id: site.id, line1: "", ...countryColumns(input.country) },
      });
      await tx.person.update({ where: { id: person.id }, data: { site_id: site.id } });
    }

    return user.id;
  });


  // CREDIT THE INVITATION THAT BROUGHT THEM IN WS-C)
  await creditInviteForNewUser(userId, email);
  return { userId, email };
}

/** Resolve the signed-in requester. Throws rather than returning null-ish. */
async function loadRequester(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      /* `E281` — read for the wizard's Requester Details step. */
      photo_url: true,
      title: true,
      phone: true,
      company_id: true,
      site_id: true,
      company: { select: { id: true, name: true, p_account_id: true } },
      // THE MEMBERSHIPS ARE WHAT "HAS A COMPANY" MEANS .
      companyMemberships: {
        orderBy: [{ status: "asc" }, { updated_at: "desc" }],
        select: {
          status: true,
          company: { select: { id: true, name: true, tax_type: true } },
        },
      },
      site: {
        select: {
          id: true,
          name: true,
          addresses: { take: 1, orderBy: { created_at: "asc" } },
        },
      },
      user: { select: { email: true, email_verified: true } },
      requesterProfile: {
        select: {
          id: true,
          employee_id: true,
          buyer_name: true,
          buyer_email: true,
          approver_name: true,
          approver_email: true,
          work_site_id: true,
          onboarding_step: true,
          completed_at: true,
          workSite: {
            select: {
              id: true,
              name: true,
              addresses: { take: 1, orderBy: { created_at: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!person?.requesterProfile) {
    throw new OnboardingError("This account isn't a requester", "NOT_A_REQUESTER");
  }
  return person;
}

export type RequesterState = Awaited<ReturnType<typeof getRequesterState>>;

/** The wizard's resume + prefill payload. */
export async function getRequesterState(viewer: Viewer) {
  const p = await loadRequester(viewer);
  const rp = p.requesterProfile!;
  const addr = p.site?.addresses[0] ?? null;
  const work = rp.workSite?.addresses[0] ?? null;

  const toAddress = (a: typeof addr) =>
    a
      ? {
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          state: a.state,
          postalCode: a.postal_code,
          country: a.country,
        }
      : null;

  // THE BINDING, ON THE PAYLOAD / E005)
  const membership = p.companyMemberships[0] ?? null;

  return {
    email: p.user?.email ?? "",
    emailVerified: !!p.user?.email_verified,
    steps: REQUESTER_STEPS,
    resumeStep: rp.onboarding_step,
    completed: !!rp.completed_at,
    company: {
      /** Any CompanyMembership at all — PENDING counts. */
      bound: p.companyMemberships.length > 0,
      status: membership?.status ?? null,
      /** The bound company has a `tax_type`, i.e. somebody actually DEFINED it */
      defined: membership ? membership.company.tax_type !== null : false,
      name: membership?.company.name ?? null,
    },
    profile: {
      firstName: p.first_name,
      lastName: p.last_name,
      // — the requester gets a face and a role. BOTH COLUMNS ALREADY
      photoUrl: p.photo_url,
      title: p.title,
      phone: p.phone,
      employeeId: rp.employee_id,
      companyId: p.company_id,
      companyName: p.company?.name ?? "",
      buyerName: rp.buyer_name,
      buyerEmail: rp.buyer_email,
      approverName: rp.approver_name,
      approverEmail: rp.approver_email,
      address: toAddress(addr),
      workLocation: toAddress(work),
      workSiteName: rp.workSite?.name ?? null,
    },
  };
}

/** Write one Site + its Address, reusing the row if it already exists. */
async function upsertSiteAddress(
  companyId: string,
  siteId: string | null,
  name: string,
  addr: AddressInput
): Promise<string> {
  const data = {
    line1: addr.line1?.trim() ?? "",
    line2: addr.line2?.trim() || null,
    city: addr.city?.trim() || null,
    state: addr.state?.trim() || null,
    postal_code: addr.postalCode?.trim() || null,
    /* BOTH COLUMNS (`E729` WS-C). */
    ...countryColumns(addr.country),
  };

  if (siteId) {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, company_id: true, addresses: { take: 1, orderBy: { created_at: "asc" } } },
    });
    // A site that belongs to a different company is not ours to write — fall
    // through and make a fresh one under this company.
    if (site && site.company_id === companyId) {
      const existing = site.addresses[0];
      if (existing) {
        await prisma.address.update({ where: { id: existing.id }, data });
      } else {
        await prisma.address.create({ data: { site_id: site.id, ...data } });
      }
      return site.id;
    }
  }

  const site = await prisma.site.create({ data: { company_id: companyId, name } });
  await prisma.address.create({ data: { site_id: site.id, ...data } });
  return site.id;
}

export type StepPayload = {
  /** company — confirmation only; the binding itself is written by company.ts. */
  companyBound?: boolean;
  /** requester_info */
  firstName?: string;
  lastName?: string;
  // — the requester's ROLE ("Director of Procurement"), not a provider's
  title?: string | null;
  phone?: string | null;
  employeeId?: string | null;
  address?: AddressInput;
  // THESE FOUR OUTLIVED THEIR STEP , 2026-08-30).
  buyerName?: string | null;
  buyerEmail?: string | null;
  approverName?: string | null;
  approverEmail?: string | null;
  /** work_location */
  workLocation?: AddressInput;
};

/** Save one step and advance the resume point (save-as-you-go). */
export async function saveRequesterStep(
  viewer: Viewer,
  step: RequesterStep,
  payload: StepPayload
) {
  const p = await loadRequester(viewer);
  const rp = p.requesterProfile!;

  // THERE IS NO `company` STEP TO HANDLE , 2026-09-11).
  if (step === "requester_info") {
    await prisma.person.update({
      where: { id: p.id },
      data: {
        ...(payload.firstName?.trim() ? { first_name: payload.firstName.trim() } : {}),
        ...(payload.lastName?.trim() ? { last_name: payload.lastName.trim() } : {}),
        // — the requester's ROLE.
        ...(payload.title !== undefined
          ? { title: payload.title?.trim() || null }
          : {}),
        phone: payload.phone?.trim() || null,
      },
    });
    await prisma.requesterProfile.update({
      where: { id: rp.id },
      data: { employee_id: payload.employeeId?.trim() || null },
    });
    if (payload.address) {
      // Re-read the company: the Company step may have moved this person.
      const current = await prisma.person.findUnique({
        where: { id: p.id },
        select: { company_id: true, site_id: true },
      });
      const siteId = await upsertSiteAddress(
        current!.company_id,
        current!.site_id,
        "Primary",
        payload.address
      );
      await prisma.person.update({ where: { id: p.id }, data: { site_id: siteId } });
    }
  }

  // a `buyer_approver` branch

  if (step === "work_location" && payload.workLocation) {
    const current = await prisma.person.findUnique({
      where: { id: p.id },
      select: { company_id: true },
    });
    const siteId = await upsertSiteAddress(
      current!.company_id,
      rp.work_site_id,
      "Work Location",
      payload.workLocation
    );
    await prisma.requesterProfile.update({
      where: { id: rp.id },
      data: { work_site_id: siteId },
    });
  }

  // The resume point only ever moves FORWARD. Stepping back to fix an answer
  // and saving it shouldn't rewind where a returning user lands.
  const next = REQUESTER_STEPS[REQUESTER_STEPS.indexOf(step) + 1] ?? "review";
  const furthest =
    REQUESTER_STEPS.indexOf(next) > REQUESTER_STEPS.indexOf(rp.onboarding_step as RequesterStep)
      ? next
      : (rp.onboarding_step as RequesterStep);
  await prisma.requesterProfile.update({
    where: { id: rp.id },
    data: { onboarding_step: furthest },
  });

  return getRequesterState(viewer);
}

/** What's still missing before the requester can finish. */
/** WHAT "HAS A COMPANY" MEANS, AND WHY THIS CHANGED */
// A GATE MAY ONLY REQUIRE WHAT THE WIZARD CAN COLLECT ( / )
// THE COMPANY IS OPTIONAL HERE AND MANDATORY BEFORE HIRE
export function requesterGaps(state: RequesterState): string[] {
  const p = state.profile;
  const gaps: string[] = [];
  if (!p.firstName.trim() || !p.lastName.trim()) gaps.push("Your name");
  if (!p.workLocation?.country) gaps.push("A work location");
  return gaps;
}

/** Finish onboarding → "Ready to Post Work Request". */
export async function completeRequester(viewer: Viewer) {
  const state = await getRequesterState(viewer);
  const gaps = requesterGaps(state);
  if (gaps.length > 0) {
    throw new OnboardingError(
      `Still needed: ${gaps.join(", ")}.`,
      "INCOMPLETE"
    );
  }
  const p = await loadRequester(viewer);
  await prisma.requesterProfile.update({
    where: { id: p.requesterProfile!.id },
    data: { completed_at: new Date(), onboarding_step: "review" },
  });
  return getRequesterState(viewer);
}
