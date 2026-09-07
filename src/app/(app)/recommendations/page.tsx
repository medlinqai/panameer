import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { defaultMessage, listRecommendations } from "@/lib/recommendations";
import { RecommendationsClient } from "@/components/console/RecommendationsClient";

/**
 * REQUEST RECOMMENDATIONS (J2.4 WS-F / E012) — built from empty.
 *
 * Server component for the read; the composer and the list live in a client
 * component below it so sending refreshes the list without a round trip through
 * the router. Everything is owner-scoped in the lib — nothing on this page
 * names a record.
 */
export const metadata = { title: "Request Recommendations · Panameer" };

export default async function RecommendationsPage() {
  /* ⚠ `authenticated` (`P2-J1.1-E044`) — ⚠ SUPERSEDED, quoted:
     `guardPage("canProvideServices")`. Offered in the persona menu a buyer sees,
     so the gate turned a visible item into a bounce to /dashboard?noaccess=1. */
  const viewer = await guardPage("authenticated");

  /*
    ⚠⚠ THIS GUARD IS LOAD-BEARING, NOT DEFENSIVE. `listRecommendations` calls
    `ownedProfile`, which THROWS `NOT_A_PROVIDER` when there is no provider
    profile — a `RecommendationRequest` hangs off `provider_profile_id`, and a
    buyer has no profile for it to hang off. Opening the gate WITHOUT this turns
    a redirect into a crash, which is worse.

    ⚠ THE SAME SHAPE AND THE SAME SENTENCE `account-health` and `/stats` already
    use — copied deliberately rather than invented, so the three persona pages
    answer "you are not a seller" identically.
  */
  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  if (!profile) {
    return (
      <p className="text-ink-2">
        This account has no provider profile, so there is nothing to request yet.
      </p>
    );
  }

  const { providerFirstName, rows } = await listRecommendations(viewer);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
        A recommendation from someone you&apos;ve worked with does more for a
        buyer&apos;s confidence than anything you can write about yourself. Ask
        the people who already know your work.
      </p>
      <RecommendationsClient
        template={defaultMessage(providerFirstName)}
        initialRows={rows}
      />
    </div>
  );
}
