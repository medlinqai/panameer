import { prisma } from "@/lib/prisma";
import { countryColumns } from "@/lib/country";
import { validateEntity } from "@/lib/company-validation";
import type { Viewer } from "@/lib/access";
import { recomputeCompleteness } from "@/lib/onboarding";
import { OnboardingError } from "@/lib/onboarding";
import {
  COMPANY_TOS_VERSION,
  companyTosCurrent,
  emailDomain,
  isWorkDomain,
} from "@/lib/tos";
import type { TaxType } from "@prisma/client";
import { notifyJoinRequested, notifyJoinDecided } from "@/lib/company-domain-join";

export type DefineInput = {
  name: string;
  taxType?: TaxType | null;
  country?: string | null;
  stateOfFiling?: string | null;
  ein?: string | null;
  registeredAddress?: {
    line1?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  website?: string | null;
  logoUrl?: string | null;
  /** "I'm authorized to represent this entity." Required. */
  attestation: boolean;
  /** Company ToS, accepted by the definer on the company's behalf. Required. */
  companyTos: boolean;
};

export type JoinInput = {
  companyId: string;
  attestation: boolean;
};

async function actingPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      company_id: true,
      site_id: true,
      company: { select: { id: true, name: true, p_account_id: true } },
      user: { select: { email: true } },
      requesterProfile: { select: { id: true, work_site_id: true } },
    },
  });
  if (!person) {
    throw new OnboardingError("This account has no person record", "INVALID");
  }
  return person;
}

/** The signup placeholder company: named after the person, nobody else in it. */
async function isPlaceholder(companyId: string): Promise<boolean> {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      legal_name: true,
      tax_type: true,
      _count: { select: { people: true, memberships: true } },
    },
  });
  // A defined company has a tax type. A placeholder never does, and has exactly
  // one person (the account it was created for) and no memberships.
  return (
    !!c && !c.tax_type && c._count.people <= 1 && c._count.memberships === 0
  );
}

export const REGISTERED_SITE_NAME = "Registered";

async function persistEntityValidation(
  companyId: string,
  input: { name: string; stateOfFiling: string | null; storedLegalName: string }
): Promise<void> {
  const state = input.stateOfFiling?.trim();
  if (!state) return;

  try {
    const result = await validateEntity({
      name: input.name,
      stateOfFiling: state,
      timeoutMs: 5000,
    });

    if (!result.ok) return;

    let status: string;
    let detail: string | null = null;
    let sourceUrl: string | null = null;

    if (result.status === "not_found" || result.matches.length === 0) {
      status = "not_found";
    } else {
      if (result.matches.length !== 1) return;
      const match = result.matches[0];

      const same =
        match.legalName.value.trim().toLowerCase() ===
        input.storedLegalName.trim().toLowerCase();
      if (!same) return;

      sourceUrl = match.legalName.sourceUrl;
      if (!sourceUrl) return;

      if (!result.publishesStatus || !match.status) {
        status = "standing_unknown";
      } else if (result.status === "not_in_good_standing") {
        status = "has_issues";
        detail = match.status.value;
        if (!detail?.trim()) return;
      } else {
        status = "in_good_standing";
        detail = match.status.value;
      }
    }

    await prisma.company.update({
      where: { id: companyId },
      data: {
        entity_validated_at: new Date(),
        entity_validation_status: status,
        entity_validation_source_url: sourceUrl,
        entity_status_detail: detail,
      },
    });
  } catch {
  }
}

export async function defineCompany(viewer: Viewer, input: DefineInput) {
  const person = await actingPerson(viewer);

  const name = input.name.trim();
  if (name.length < 2) {
    throw new OnboardingError("A company name is required", "INVALID");
  }
  if (!input.attestation) {
    throw new OnboardingError(
      "Please confirm you're authorized to represent this company",
      "INVALID"
    );
  }
  if (!input.companyTos) {
    throw new OnboardingError(
      "The company terms have to be accepted to continue",
      "INVALID"
    );
  }

  const domain = emailDomain(person.user?.email);
  const website = input.website?.trim() || null;

  const reuse = await isPlaceholder(person.company_id);
  const companyId = reuse
    ? person.company_id
    : (
        await prisma.company.create({
          data: {
            name,
            pAccount: {
              create: { kind: "BOTH", name, status: "ACTIVE" },
            },
          },
          select: { id: true },
        })
      ).id;

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      legal_name: name,
      tax_type: input.taxType ?? null,
      ...countryColumns(input.country),
      state_of_filing: input.stateOfFiling?.trim() || null,
      ...(input.ein?.trim() ? { tin: input.ein.trim() } : {}),
      website,
      ...(input.logoUrl ? { logo_url: input.logoUrl } : {}),
      // Only a WORK domain is stored. Recording gmail.com here would auto-
      // approve every Gmail user in the world into this company.
      email_domain: isWorkDomain(domain) ? domain : null,
      company_tos_accepted_by: person.id,
      company_tos_accepted_at: new Date(),
      company_tos_version: COMPANY_TOS_VERSION,
    },
    select: { id: true, name: true, p_account_id: true, legal_name: true },
  });

  await persistEntityValidation(company.id, {
    name,
    stateOfFiling: input.stateOfFiling ?? null,
    storedLegalName: company.legal_name ?? name,
  });

  const reg = input.registeredAddress;
  if (reg && (reg.country || reg.line1 || reg.city)) {
    const data = {
      line1: reg.line1?.trim() || "",
      city: reg.city?.trim() || null,
      state: reg.state?.trim() || null,
      postal_code: reg.postalCode?.trim() || null,
      ...countryColumns(reg.country),
    };
    const site =
      (await prisma.site.findFirst({
        where: { company_id: company.id, name: REGISTERED_SITE_NAME },
        select: { id: true },
      })) ??
      (await prisma.site.create({
        data: { company_id: company.id, name: REGISTERED_SITE_NAME },
        select: { id: true },
      }));
    const existing = await prisma.address.findFirst({
      where: { site_id: site.id },
      select: { id: true },
    });
    if (existing) {
      await prisma.address.update({ where: { id: existing.id }, data });
    } else {
      await prisma.address.create({ data: { site_id: site.id, ...data } });
    }
  }

  await syncPAccountName(company.p_account_id, name);

  await prisma.companyMembership.upsert({
    where: { person_id_company_id: { person_id: person.id, company_id: company.id } },
    update: {
      role: "ADMIN",
      status: "APPROVED",
      attestation_accepted_at: new Date(),
      decided_at: new Date(),
      decided_by_person_id: person.id,
    },
    create: {
      person_id: person.id,
      company_id: company.id,
      role: "ADMIN",
      status: "APPROVED",
      attestation_accepted_at: new Date(),
      decided_at: new Date(),
      decided_by_person_id: person.id,
    },
  });

  if (!reuse) await moveInto(person.id, company.id, person.company_id);
  await refreshProviderScore(person.id);

  return { companyId: company.id, name: company.name, status: "APPROVED" as const };
}

async function syncPAccountName(pAccountId: string, name: string) {
  await prisma.pAccount.update({ where: { id: pAccountId }, data: { name } });
}

export async function saveCompanyName(viewer: Viewer, rawName: string) {
  const person = await actingPerson(viewer);

  const name = rawName.trim();
  if (name.length < 2) {
    throw new OnboardingError("A company name is required", "INVALID");
  }

  if (!(await isPlaceholder(person.company_id))) {
    const current = await prisma.company.findUnique({
      where: { id: person.company_id },
      select: { id: true, name: true },
    });
    return {
      companyId: person.company_id,
      name: current?.name ?? name,
      status: "APPROVED" as const,
    };
  }

  const company = await prisma.company.update({
    where: { id: person.company_id },
    data: { name },
    select: { id: true, name: true, p_account_id: true },
  });

  await syncPAccountName(company.p_account_id, name);

  return { companyId: company.id, name: company.name, status: "NAME_ONLY" as const };
}

export type UpdateCompanyInput = {
  name?: string;
  legalName?: string;
  taxType?: string | null;
  country?: string | null;
  stateOfFiling?: string | null;
  ein?: string | null;
  description?: string | null;
  industryId?: string | null;
  website?: string | null;
};

export const COMPANY_DESCRIPTION_MAX = 600;

export async function updateCompanyDetails(viewer: Viewer, input: UpdateCompanyInput) {
  const binding = await getCompanyBinding(viewer);
  if (!binding) throw new OnboardingError("No company on this account", "INVALID");
  if (binding.status !== "APPROVED" || !binding.isAdmin) {
    throw new OnboardingError("Only a company admin can change these", "GATE_UNMET");
  }

  const name = input.name?.trim();
  if (input.name !== undefined && (!name || name.length < 2)) {
    throw new OnboardingError("A company name is required", "INVALID");
  }

  const blank = (v: string | null | undefined) =>
    v === undefined ? undefined : v === null || v.trim() === "" ? null : v.trim();

  if (input.description && input.description.trim().length > COMPANY_DESCRIPTION_MAX) {
    throw new OnboardingError(`Keep the description to ${COMPANY_DESCRIPTION_MAX} characters`, "INVALID");
  }
  if (input.industryId) {
    const ind = await prisma.specialization.findFirst({ where: { id: input.industryId, kind: "INDUSTRY" }, select: { id: true } });
    if (!ind) throw new OnboardingError("Pick an industry from the list", "INVALID");
  }

  const company = await prisma.company.update({
    where: { id: binding.company.id },
    data: {
      ...(name ? { name } : {}),
      ...(input.description !== undefined ? { description: blank(input.description) } : {}),
      ...(input.industryId !== undefined ? { industry_id: input.industryId || null } : {}),
      ...(input.website !== undefined ? { website: blank(input.website) } : {}),
      ...(input.legalName !== undefined ? { legal_name: blank(input.legalName) } : {}),
      ...(input.taxType !== undefined ? { tax_type: blank(input.taxType) as never } : {}),
      ...(input.country !== undefined ? countryColumns(blank(input.country)) : {}),
      ...(input.stateOfFiling !== undefined
        ? { state_of_filing: blank(input.stateOfFiling) }
        : {}),
      ...(input.ein !== undefined ? { tin: blank(input.ein) } : {}),
    },
    select: { id: true, name: true, p_account_id: true },
  });

  if (name) await syncPAccountName(company.p_account_id, name);
  return { companyId: company.id, name: company.name };
}

export async function joinCompany(viewer: Viewer, input: JoinInput) {
  const person = await actingPerson(viewer);

  if (!input.attestation) {
    throw new OnboardingError(
      "Please confirm you're authorized to represent this company",
      "INVALID"
    );
  }

  const target = await prisma.company.findUnique({
    where: { id: input.companyId },
    select: { id: true, name: true, email_domain: true },
  });
  if (!target) throw new OnboardingError("That company no longer exists", "INVALID");
  if (target.id === person.company_id) {
    return { companyId: target.id, name: target.name, status: "APPROVED" as const };
  }

  // Ask-then-approve (Scott 2026-10-05): every join is a request an admin decides, domain match or not.
  const now = new Date();

  const membership = await prisma.companyMembership.upsert({
    where: { person_id_company_id: { person_id: person.id, company_id: target.id } },
    update: {
      // Re-requesting after a rejection reopens the SAME row rather than
      // stacking requests, so an admin sees one decision to make.
      status: "PENDING",
      attestation_accepted_at: now,
      auto_approved: false,
      decided_at: null,
      decided_by_person_id: null,
    },
    create: {
      person_id: person.id,
      company_id: target.id,
      role: "MEMBER",
      status: "PENDING",
      attestation_accepted_at: now,
      auto_approved: false,
    },
    select: { status: true },
  });

  if (membership.status === "PENDING") await notifyJoinRequested(target.id, person.id);

  return {
    companyId: target.id,
    name: target.name,
    status: membership.status,
    autoApproved: false,
  };
}

async function moveInto(personId: string, companyId: string, fromCompanyId: string) {
  if (companyId === fromCompanyId) return;

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      site_id: true,
      requesterProfile: { select: { work_site_id: true } },
    },
  });
  const siteIds = [
    person?.site_id,
    person?.requesterProfile?.work_site_id,
  ].filter((x): x is string => !!x);

  if (siteIds.length > 0) {
    await prisma.site.updateMany({
      where: { id: { in: siteIds }, company_id: fromCompanyId },
      data: { company_id: companyId },
    });
  }

  await prisma.person.update({
    where: { id: personId },
    data: { company_id: companyId },
  });

  await cleanUpPlaceholder(fromCompanyId);
}

/** Delete the signup placeholder once its last person leaves it. */
export async function cleanUpPlaceholder(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      p_account_id: true,
      tax_type: true,
      _count: { select: { people: true, memberships: true } },
      pAccount: { select: { _count: { select: { companies: true } } } },
    },
  });
  // Never delete a DEFINED company, however empty it looks — that is somebody's
  // legal entity, not signup residue.
  if (
    !company ||
    company.tax_type ||
    company._count.people > 0 ||
    company._count.memberships > 0
  ) {
    return;
  }

  await prisma.company.delete({ where: { id: company.id } });
  if (company.pAccount._count.companies <= 1) {
    await prisma.pAccount.delete({ where: { id: company.p_account_id } });
  }
}

export async function searchCompanies(q: string) {
  const term = q.trim();
  if (term.length < 2) return [];
  const rows = await prisma.company.findMany({
    where: {
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { legal_name: { contains: term, mode: "insensitive" } },
      ],
      // Only DEFINED companies are joinable. Signup placeholders are named
      // after a person and are not entities anyone should be joining.
      tax_type: { not: null },
    },
    orderBy: { name: "asc" },
    take: 8,
    select: {
      id: true,
      name: true,
      email_domain: true,
      _count: { select: { memberships: { where: { status: "APPROVED" } } } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    domain: c.email_domain,
    members: c._count.memberships,
  }));
}

export type CompanyBinding = Awaited<ReturnType<typeof getCompanyBinding>>;

export async function getCompanyBinding(viewer: Pick<Viewer, "userId">) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      company_id: true,
      companyMemberships: {
        orderBy: [{ status: "asc" }, { updated_at: "desc" }],
        select: {
          id: true,
          role: true,
          status: true,
          auto_approved: true,
          created_at: true,
          company: {
            select: {
              id: true,
              name: true,
              legal_name: true,
              tax_type: true,
              country: true,
              state_of_filing: true,
              tin: true,
              website: true,
              logo_url: true,
              email_domain: true,
              company_tos_accepted_at: true,
              company_tos_version: true,
              company_tos_accepted_by: true,
            },
          },
        },
      },
    },
  });
  if (!person) return null;

  const approved = person.companyMemberships.find((m) => m.status === "APPROVED");
  const pending = person.companyMemberships.find((m) => m.status === "PENDING");
  const rejected = person.companyMemberships.find((m) => m.status === "REJECTED");
  const m = approved ?? pending ?? rejected ?? null;
  if (!m) return null;

  return {
    personId: person.id,
    membershipId: m.id,
    role: m.role,
    status: m.status,
    autoApproved: m.auto_approved,
    company: m.company,
    tosCurrent: companyTosCurrent(m.company),
    isAdmin: m.role === "ADMIN" && m.status === "APPROVED",
  };
}

/** Pending join requests for the companies this viewer administers. */
export async function getPendingRequests(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      companyMemberships: {
        where: { role: "ADMIN", status: "APPROVED" },
        select: { company_id: true },
      },
    },
  });
  const adminOf = (person?.companyMemberships ?? []).map((m) => m.company_id);
  if (adminOf.length === 0) return [];

  const rows = await prisma.companyMembership.findMany({
    where: { company_id: { in: adminOf }, status: "PENDING" },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      created_at: true,
      company: { select: { id: true, name: true } },
      person: {
        select: {
          first_name: true,
          last_name: true,
          title: true,
          user: { select: { email: true } },
        },
      },
    },
  });
  return rows;
}

export async function decideRequest(
  viewer: Viewer,
  membershipId: string,
  decision: "APPROVED" | "REJECTED"
) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new OnboardingError("No person record", "INVALID");

  const target = await prisma.companyMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, company_id: true, person_id: true, status: true },
  });
  if (!target) throw new OnboardingError("That request no longer exists", "INVALID");

  const actorIsAdmin = await prisma.companyMembership.findFirst({
    where: {
      person_id: person.id,
      company_id: target.company_id,
      role: "ADMIN",
      status: "APPROVED",
    },
    select: { id: true },
  });
  if (!actorIsAdmin) {
    throw new OnboardingError("You don't administer that company", "INVALID");
  }
  if (target.status !== "PENDING") {
    throw new OnboardingError("That request has already been decided", "INVALID");
  }

  await prisma.companyMembership.update({
    where: { id: target.id },
    data: {
      status: decision,
      decided_at: new Date(),
      decided_by_person_id: person.id,
    },
  });

  if (decision === "APPROVED") {
    const joiner = await prisma.person.findUnique({
      where: { id: target.person_id },
      select: { company_id: true },
    });
    if (joiner) await moveInto(target.person_id, target.company_id, joiner.company_id);
    await refreshProviderScore(target.person_id);
  }

  await notifyJoinDecided(target.company_id, target.person_id, decision === "APPROVED");
  return { ok: true as const, status: decision };
}

/** Accept (or re-accept) the company ToS. Admins only. */
export async function acceptCompanyTos(viewer: Viewer, companyId: string) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new OnboardingError("No person record", "INVALID");

  const isAdmin = await prisma.companyMembership.findFirst({
    where: {
      person_id: person.id,
      company_id: companyId,
      role: "ADMIN",
      status: "APPROVED",
    },
    select: { id: true },
  });
  if (!isAdmin) {
    throw new OnboardingError(
      "Only a company admin can accept the company terms",
      "INVALID"
    );
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      company_tos_accepted_by: person.id,
      company_tos_accepted_at: new Date(),
      company_tos_version: COMPANY_TOS_VERSION,
    },
  });
  return { ok: true as const };
}

async function refreshProviderScore(personId: string): Promise<void> {
  try {
    const profile = await prisma.providerProfile.findFirst({
      where: { person_id: personId },
      select: { id: true },
    });
    if (profile) await recomputeCompleteness(profile.id);
  } catch (e) {
    console.error("[company] completeness refresh failed (non-fatal):", e);
  }
}

/**
 * After a user verifies their email: if its domain matches exactly one company's domain, create a PENDING
 * request there (never an approval). Free-mail domains and existing memberships do nothing.
 */
export async function requestDomainJoin(userId: string): Promise<{ companyId: string } | null> {
  const person = await prisma.person.findUnique({
    where: { user_id: userId },
    select: { id: true, company_id: true, user: { select: { email: true, email_verified: true } }, companyMemberships: { select: { company_id: true } } },
  });
  if (!person?.user?.email_verified) return null;
  const domain = emailDomain(person.user.email);
  if (!domain || !isWorkDomain(domain)) return null;
  const matches = await prisma.company.findMany({ where: { email_domain: domain }, select: { id: true }, take: 2 });
  if (matches.length !== 1) return null;
  const companyId = matches[0].id;
  if (person.company_id === companyId || person.companyMemberships.some((m) => m.company_id === companyId)) return null;
  await prisma.companyMembership.create({
    data: { person_id: person.id, company_id: companyId, role: "MEMBER", status: "PENDING", auto_approved: false },
  });
  await notifyJoinRequested(companyId, person.id);
  return { companyId };
}
