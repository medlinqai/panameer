import { prisma } from "@/lib/prisma";
import {
  scopedToPAccount,
  withPAccount,
  isMarketplaceVisible, providerMeetsRequired,
  type Viewer,
} from "@/lib/access";

export async function getMe(viewer: Viewer) {
  // Own-identity lookup, keyed by the unique user_id — not a cross-tenant
  // query, so it is deliberately NOT PAccount-scoped.
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    include: {
      company: {
        include: { pAccount: { select: { id: true, name: true, kind: true } } },
      },
      site: {
        select: { id: true, name: true, addresses: { select: { id: true } } },
      },
      companyMemberships: {
        where: { status: "APPROVED" },
        select: { id: true, role: true, company_id: true },
      },
      // Profile summaries so the dashboard/self-profile can resolve them from
      // /api/me without a second round trip.
      providerProfile: {
        select: {
          id: true,
          status: true,
          validation_status: true,
          completeness: true,
          paused_at: true,
          role_type_id: true,
          hourly_rate_cents: true,
          rate_min_cents: true,
          rate_max_cents: true,
          skills: { select: { id: true } },
          onboarding_completed_at: true,
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
  const scopedViewer = withPAccount(viewer, person.company.p_account_id);
  const orgCompanyCount = await prisma.company.count({
    where: scopedToPAccount(scopedViewer, {}),
  });

  const notificationsUnread = await prisma.notification.count({
    where: { person_id: person.id, delivered_in_app_at: { not: null }, read_at: null },
  });

  return {
    notificationsUnread,
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
        isBuyer: !!person.buyerProfile,
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
      isAdmin: person.companyMemberships.some((m) => m.role === "ADMIN"),
      /** An approved member of a company — the Company area exists only then. */
      isMember: person.companyMemberships.length > 0,
    },
    pAccount: person.company.pAccount,
    providerProfile: provider
      ? {
          id: provider.id,
          status: provider.status,
          validationStatus: provider.validation_status,
          completeness: provider.completeness,
          paused: provider.paused_at != null,
          published: provider.onboarding_completed_at != null,
          availableForMessages: provider.available_for_messages,
          visible: isMarketplaceVisible({
            ...provider,
            meetsRequired: providerMeetsRequired({
              ...provider,
              person: {
                title: person.title,
                photo_url: person.photo_url,
                phone: person.phone,
                site: person.site,
              },
            }),
          }),
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
