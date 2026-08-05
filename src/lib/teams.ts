import { prisma } from "@/lib/prisma";
import { isMarketplaceVisible, type Viewer } from "@/lib/access";

/**
 * MY TEAMS (PHASE 2 / WS2-D) — who you work alongside.
 *
 * REAL DATA, and it already existed: brief_I built the Service Coordinator
 * model — `ProviderProfile.coordinator_person_id` points at the Person who
 * represents that provider, `CoordinatorInvite` carries the pending asks, and
 * `/coordinator` has been rendering a roster off it since. What did not exist
 * was anywhere for the OTHER side to see it.
 *
 * SO THIS READS BOTH DIRECTIONS, which is the difference between "My Teams" and
 * the existing coordinator console:
 *
 *   DOWN — the providers this person represents (they are a recruiter).
 *   UP   — the recruiter who represents this person (they are a provider on
 *          someone's roster).
 *
 * A person can be both, one, or neither, and each half renders independently.
 * The existing `getRoster` could not be reused: it calls `resolveCoordinator`,
 * which fails closed for anyone without the coordinator capability — correct
 * for the coordinator console, wrong for a page every member of the community
 * can open.
 */

export type TeamMember = {
  profileId: string;
  name: string;
  headline: string | null;
  photoUrl: string | null;
  visible: boolean;
  validated: boolean;
  completeness: number;
};

export type MyTeams = {
  /** Providers this person coordinates. Empty when they coordinate nobody. */
  represents: TeamMember[];
  /** Pending invites they have sent that nobody has accepted yet. */
  pendingInvites: { id: string; email: string; name: string | null; invitedAt: string }[];
  /** The coordinator who represents THIS person, if any. */
  representedBy: { name: string; title: string | null; photoUrl: string | null } | null;
  /** True when this person holds the coordinator capability at all. */
  isCoordinator: boolean;
};

export async function getMyTeams(viewer: Viewer): Promise<MyTeams> {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      is_service_coordinator: true,
      providerProfile: {
        select: {
          coordinator: {
            select: { first_name: true, last_name: true, title: true, photo_url: true },
          },
        },
      },
    },
  });

  if (!person) {
    return { represents: [], pendingInvites: [], representedBy: null, isCoordinator: false };
  }

  /*
    DOWN — read by coordinator_person_id rather than by the capability flag. A
    person who was given a roster and later lost the flag still has providers
    pointing at them, and hiding that would make those providers look
    unrepresented to everyone except themselves.
  */
  const reps = await prisma.providerProfile.findMany({
    where: { coordinator_person_id: person.id },
    orderBy: { updated_at: "desc" },
    select: {
      id: true,
      headline: true,
      status: true,
      paused_at: true,
      completeness: true,
      validation_status: true,
      person: { select: { first_name: true, last_name: true, photo_url: true } },
    },
  });

  const pending = await prisma.coordinatorInvite.findMany({
    where: { inviter_person_id: person.id, status: "PENDING" },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      invitee_email: true,
      invitee_first_name: true,
      invitee_last_name: true,
      created_at: true,
    },
  });

  const up = person.providerProfile?.coordinator ?? null;

  return {
    isCoordinator: person.is_service_coordinator,
    represents: reps.map((p) => ({
      profileId: p.id,
      name: `${p.person.first_name} ${p.person.last_name}`.trim(),
      headline: p.headline || null,
      photoUrl: p.person.photo_url,
      visible: isMarketplaceVisible(p),
      validated: p.validation_status === "VALIDATED",
      completeness: p.completeness,
    })),
    pendingInvites: pending.map((i) => ({
      id: i.id,
      email: i.invitee_email,
      name:
        [i.invitee_first_name, i.invitee_last_name].filter(Boolean).join(" ") ||
        null,
      invitedAt: i.created_at.toISOString(),
    })),
    representedBy: up
      ? {
          name: `${up.first_name} ${up.last_name}`.trim(),
          title: up.title,
          photoUrl: up.photo_url,
        }
      : null,
  };
}
