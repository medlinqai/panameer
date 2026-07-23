import { prisma } from "@/lib/prisma";
import {
  scopedToPAccount,
  withPAccount,
  type Viewer,
} from "@/lib/access";

/**
 * "Who am I" — the logged-in Person plus their Company (and Site), resolved
 * from the User↔Person link. This is the reference API-first lib function:
 * all logic lives here and route handlers (web + future mobile) call it, so we
 * never rebuild it per client.
 *
 * Returns null when the User has no linked Person yet (e.g. the system admin
 * before onboarding).
 */
export async function getMe(viewer: Viewer) {
  // Own-identity lookup, keyed by the unique user_id — not a cross-tenant
  // query, so it is deliberately NOT PAccount-scoped.
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    include: {
      company: {
        include: { pAccount: { select: { id: true, name: true, kind: true } } },
      },
      site: { select: { id: true, name: true } },
    },
  });

  if (!person) return null;

  // Now that we know the person's org, enrich the viewer with the tenancy
  // fence and use it for a genuinely PAccount-scoped read — demonstrating the
  // private-query boundary end to end. Company carries `p_account_id`, so the
  // fence applies directly; models that don't (Person, Site) scope through
  // their Company relation instead.
  const scopedViewer = withPAccount(viewer, person.company.p_account_id);
  const orgCompanyCount = await prisma.company.count({
    where: scopedToPAccount(scopedViewer, {}),
  });

  return {
    person: {
      id: person.id,
      firstName: person.first_name,
      lastName: person.last_name,
      title: person.title,
      phone: person.phone,
      photoUrl: person.photo_url,
      status: person.status,
      roles: {
        isBuyer: person.is_buyer,
        isProvider: person.is_provider,
        isCoordinator: person.is_coordinator,
        isSupport: person.is_support,
      },
      site: person.site,
    },
    company: {
      id: person.company.id,
      name: person.company.name,
      vertical: person.company.vertical,
      website: person.company.website,
      logoUrl: person.company.logo_url,
    },
    pAccount: person.company.pAccount,
    orgCompanyCount,
  };
}
