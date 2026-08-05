import { prisma } from "@/lib/prisma";
import {
  scopedToPAccount,
  withPAccount,
  isMarketplaceVisible,
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
      // Profile summaries so the dashboard/self-profile can resolve them from
      // /api/me without a second round trip.
      providerProfile: {
        select: {
          id: true,
          status: true,
          validation_status: true,
          completeness: true,
          paused_at: true,
          available_for_messages: true,
          rating: true,
          currency: true,
          onsite_rate_cents: true,
          remote_rate_cents: true,
        },
      },
      buyerProfile: { select: { id: true, subscription_tier: true } },
      // P1-J1.2 — Requester and Buyer are BOTH is_service_buyer, so the flag
      // alone can't route a signed-in buyer-side user back to their own
      // onboarding. Owning a requester profile is what distinguishes the job.
      requesterProfile: { select: { id: true, completed_at: true } },
    },
  });

  if (!person) return null;

  const provider = person.providerProfile;

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
        isServiceBuyer: person.is_service_buyer,
        /** USER_JOB Requester, expressed as "owns a RequesterProfile". */
        isRequester: !!person.requesterProfile,
        isServiceProvider: person.is_service_provider,
        isServiceCoordinator: person.is_service_coordinator,
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
    providerProfile: provider
      ? {
          id: provider.id,
          status: provider.status,
          validationStatus: provider.validation_status,
          completeness: provider.completeness,
          paused: provider.paused_at != null,
          availableForMessages: provider.available_for_messages,
          visible: isMarketplaceVisible(provider),
          rating: provider.rating === null ? null : Number(provider.rating),
          rates: {
            currency: provider.currency,
            onsiteCents: provider.onsite_rate_cents,
            remoteCents: provider.remote_rate_cents,
          },
        }
      : null,
    buyerProfile: person.buyerProfile
      ? {
          id: person.buyerProfile.id,
          subscriptionTier: person.buyerProfile.subscription_tier,
        }
      : null,
    orgCompanyCount,
  };
}
