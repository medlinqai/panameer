import type { RequesterOnboardingStep } from "@prisma/client";
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
import { touchRegistration } from "@/lib/registration-followup";
import { companyLocations, saveCompanyLocations, type Loc } from "@/lib/locations";

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
          role: true,
          company: { select: { id: true, name: true, tax_type: true, industry_id: true, invoice_email: true, legal_name: true } },
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
  // LS-E003/E004: the company's addresses — only once the membership is approved (a pending joiner sees the name only).
  const approved = membership?.status === "APPROVED";
  const owner = approved && membership!.role === "ADMIN";
  const addresses = approved ? await companyLocations(membership!.company.id) : [];
  const workCo = addresses.find((a) => a.siteId === rp.work_site_id) ?? null;
  return {
    email: p.user?.email ?? "",
    emailVerified: !!p.user?.email_verified,
    steps: REQUESTER_STEPS,
    resumeStep: rp.onboarding_step.toLowerCase(),
    completed: !!rp.completed_at,
    company: {
      /** Any CompanyMembership at all — PENDING counts. */
      bound: p.companyMemberships.length > 0,
      status: membership?.status ?? null,
      /** The bound company has a `tax_type`, i.e. somebody actually DEFINED it */
      defined: membership ? membership.company.tax_type !== null : false,
      name: membership?.company.name ?? null,
      /** BC-E002: the registrant added it (approved admin) → they fill its address/industry; joiners skip them. */
      owner,
      // Privacy (Scott 10-15): a PENDING joiner sees the company's name only — no industry, invoice email or address.
      industryId: membership?.status === "APPROVED" ? membership.company.industry_id ?? null : null,
      invoiceEmail: membership?.status === "APPROVED" ? membership.company.invoice_email ?? null : null,
      // Only when it differs from the company name (v1 stores them the same).
      legalName: membership?.status === "APPROVED" && membership.company.legal_name && membership.company.legal_name !== membership.company.name ? membership.company.legal_name : null,
    },
    /** LS-E003: owner edits the company's addresses; an approved member picks one; a pending joiner enters their own. */
    locations: {
      mode: owner ? ("owner" as const) : approved ? ("member" as const) : membership ? ("pending" as const) : ("none" as const),
      addresses,
      workAddressId: workCo?.id ?? null,
      own: workCo ? null : toAddress(work),
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
  /** BC-E002: the company's details (owner only). */
  companyDetails?: { industryId?: string | null; invoiceEmail?: string | null; legalName?: string | null };
  /** LS-E003: the company's addresses (owner) + which Ship To is where I work; or a company address id (member). */
  locations?: Loc[];
  workIndex?: number | null;
  workAddressId?: string | null;
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
  await touchRegistration(p.id);

  // BR-E002: the Company step — the binding is written by /api/company/define or /join; this confirms it exists.
  if (step === "company") {
    const bound = await prisma.companyMembership.count({ where: { person_id: p.id, status: { in: ["APPROVED", "PENDING"] } } });
    if (!bound) throw new OnboardingError("Add your company first", "INVALID");
    const owned = p.companyMemberships.find((m) => m.status === "APPROVED" && m.role === "ADMIN");
    const d = payload.companyDetails;
    if (d && owned) {
      const email = d.invoiceEmail?.trim() || p.user?.email || "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new OnboardingError("Enter a valid invoice email", "INVALID");
      const industry = d.industryId ? await prisma.specialization.findFirst({ where: { id: d.industryId, kind: "INDUSTRY" }, select: { id: true } }) : null;
      await prisma.company.update({ where: { id: owned.company.id }, data: { invoice_email: email, industry_id: industry?.id ?? null, ...(d.legalName !== undefined ? { legal_name: d.legalName?.trim() || owned.company.name } : {}) } });
    }
  }
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

  if (step === "work_location") {
    const m = p.companyMemberships[0];
    const approved = m?.status === "APPROVED";
    if (payload.locations && approved && m.role === "ADMIN") {
      const saved = await saveCompanyLocations(m.company.id, payload.locations, { buyer: true });
      const ships = saved.filter((l) => l.shipTo);
      const pick = payload.workIndex != null && saved[payload.workIndex]?.shipTo ? saved[payload.workIndex] : ships[0];
      await prisma.requesterProfile.update({ where: { id: rp.id }, data: { work_site_id: pick.siteId } });
    } else if (payload.workAddressId && approved) {
      const a = (await companyLocations(m.company.id)).find((l) => l.id === payload.workAddressId && l.shipTo);
      if (!a) throw new OnboardingError("Pick one of your company's Ship To addresses", "INVALID");
      await prisma.requesterProfile.update({ where: { id: rp.id }, data: { work_site_id: a.siteId } });
    } else if (payload.workLocation) {
      if (!payload.workLocation.line1?.trim() || !payload.workLocation.country) throw new OnboardingError("Add the country and street", "INVALID");
      const current = await prisma.person.findUnique({ where: { id: p.id }, select: { company_id: true } });
      // The buyer's own address (a pending joiner's stays with them): never write over a company address.
      const shared = rp.work_site_id && approved && (await companyLocations(m.company.id)).some((l) => l.siteId === rp.work_site_id);
      const siteId = await upsertSiteAddress(current!.company_id, shared ? null : rp.work_site_id, "Work Location", payload.workLocation);
      await prisma.address.updateMany({ where: { site_id: siteId }, data: { is_ship_to: true } });
      await prisma.requesterProfile.update({ where: { id: rp.id }, data: { work_site_id: siteId } });
    } else {
      throw new OnboardingError("Add where the work happens", "INVALID");
    }
  }

  // The resume point only ever moves FORWARD. Stepping back to fix an answer
  // and saving it shouldn't rewind where a returning user lands.
  const next = REQUESTER_STEPS[REQUESTER_STEPS.indexOf(step) + 1] ?? "review";
  const furthest =
    REQUESTER_STEPS.indexOf(next) > REQUESTER_STEPS.indexOf(rp.onboarding_step.toLowerCase() as RequesterStep)
      ? next
      : (rp.onboarding_step.toLowerCase() as RequesterStep);
  await prisma.requesterProfile.update({
    where: { id: rp.id },
    data: { onboarding_step: furthest.toUpperCase() as RequesterOnboardingStep },
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
    data: { completed_at: new Date(), onboarding_step: "REVIEW" },
  });
  return getRequesterState(viewer);
}
