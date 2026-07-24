import { prisma } from "@/lib/prisma";

/**
 * The four actor-role flags, sourced from the User's linked Person. These are
 * the "roles as variables" that ride in the JWT/session (brief_J). Defaults are
 * all-false, so a user with no linked Person yet (mid-signup, system admin
 * before onboarding) simply has no actor capabilities — fail closed.
 */
export type ActorFlags = {
  isServiceBuyer: boolean;
  isServiceProvider: boolean;
  isServiceCoordinator: boolean;
  isSupport: boolean;
};

export const NO_ACTOR_FLAGS: ActorFlags = {
  isServiceBuyer: false,
  isServiceProvider: false,
  isServiceCoordinator: false,
  isSupport: false,
};

/** Load a user's actor flags from their linked Person (all-false if none). */
export async function getActorFlags(userId: string): Promise<ActorFlags> {
  const person = await prisma.person.findUnique({
    where: { user_id: userId },
    select: {
      is_service_buyer: true,
      is_service_provider: true,
      is_service_coordinator: true,
      is_support: true,
    },
  });
  if (!person) return { ...NO_ACTOR_FLAGS };
  return {
    isServiceBuyer: person.is_service_buyer,
    isServiceProvider: person.is_service_provider,
    isServiceCoordinator: person.is_service_coordinator,
    isSupport: person.is_support,
  };
}
