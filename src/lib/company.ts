import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { OnboardingError } from "@/lib/onboarding";
import {
  COMPANY_TOS_VERSION,
  companyTosCurrent,
  domainMatches,
  emailDomain,
  isWorkDomain,
} from "@/lib/tos";
import type { TaxType } from "@prisma/client";

/**
 * COMPANY — the identity primitive (brief_company_model).
 *
 * One building block used by BOTH onboarding tracks. Every buyer and every
 * provider is a company; a sole proprietor is a company of one, defined by the
 * person who is also its admin. There is no "individual" path — the tax type
 * carries that case, and it is what the payout gate reads later.
 *
 * Everything here is owner-scoped: the acting person is resolved from the
 * session, never from a body field.
 */

export type DefineInput = {
  name: string;
  taxType: TaxType;
  website?: string | null;
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

/**
 * DEFINE a company. The definer becomes its admin with an APPROVED membership,
 * and accepts the company ToS on its behalf.
 *
 * Reuses the signup placeholder rather than creating a second company: the
 * Person FK already points at it, and leaving it behind is how the database
 * fills with one empty company per signup.
 */
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
      tax_type: input.taxType,
      website,
      // Only a WORK domain is stored. Recording gmail.com here would auto-
      // approve every Gmail user in the world into this company.
      email_domain: isWorkDomain(domain) ? domain : null,
      company_tos_accepted_by: person.id,
      company_tos_accepted_at: new Date(),
      company_tos_version: COMPANY_TOS_VERSION,
    },
    select: { id: true, name: true, p_account_id: true },
  });

  // Keep the P-Account name in step — it is the placeholder's person-name
  // otherwise, and the admin console lists accounts by it.
  await prisma.pAccount.update({
    where: { id: company.p_account_id },
    data: { name },
  });

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

  return { companyId: company.id, name: company.name, status: "APPROVED" as const };
}

/**
 * JOIN an existing company. Auto-approved on a work-email domain match,
 * otherwise a PENDING request for that company's admin.
 *
 * A PENDING joiner is NOT moved onto the company — they stay where they are
 * until somebody approves. Moving first would give an unapproved person a
 * company binding, which is the exact hole this brief closes.
 */
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

  const auto = domainMatches(person.user?.email, target.email_domain);
  const now = new Date();

  const membership = await prisma.companyMembership.upsert({
    where: { person_id_company_id: { person_id: person.id, company_id: target.id } },
    update: {
      // Re-requesting after a rejection reopens the SAME row rather than
      // stacking requests, so an admin sees one decision to make.
      status: auto ? "APPROVED" : "PENDING",
      attestation_accepted_at: now,
      auto_approved: auto,
      decided_at: auto ? now : null,
      decided_by_person_id: null,
    },
    create: {
      person_id: person.id,
      company_id: target.id,
      role: "MEMBER",
      status: auto ? "APPROVED" : "PENDING",
      attestation_accepted_at: now,
      auto_approved: auto,
      decided_at: auto ? now : null,
    },
    select: { status: true },
  });

  if (auto) await moveInto(person.id, target.id, person.company_id);

  return {
    companyId: target.id,
    name: target.name,
    status: membership.status,
    autoApproved: auto,
  };
}

/**
 * Move a person onto their approved company, taking their sites with them.
 *
 * The sites carry the addresses they typed during onboarding — their own and
 * the engagement deliver-to — and they were created under the placeholder. Left
 * behind they would be deleted with it; cleared, the requester loses two
 * addresses they already entered. Re-pointing keeps both, and a requester's
 * deliver-to belongs to their company anyway.
 */
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

/** Companies a person can join. Names + headcount only. */
export async function searchCompanies(q: string) {
  const term = q.trim();
  if (term.length < 2) return [];
  const rows = await prisma.company.findMany({
    where: {
      name: { contains: term, mode: "insensitive" },
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

/**
 * The viewer's company binding — the one read every gate and page uses.
 *
 * Returns the APPROVED membership when there is one, otherwise the most recent
 * pending/rejected request, so a page can say "waiting on Acme" rather than
 * "no company".
 */
export async function getCompanyBinding(viewer: Viewer) {
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
              website: true,
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

/**
 * Approve or reject a pending request.
 *
 * AUTHORISATION IS THE POINT of this function: the acting viewer must hold an
 * APPROVED ADMIN membership on the same company as the request. The membership
 * id alone is not enough — anyone could guess one — so the company is read from
 * the request and checked against the actor's own admin rows.
 */
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
  }

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
