import { prisma } from "@/lib/prisma";
import { isMarketplaceVisible, providerMeetsRequired, type Viewer } from "@/lib/access";
import { shownSkills, selectedRoleIds } from "@/lib/shown-skills";
import { normalizeEmail } from "@/lib/normalizeEmail";

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

  const reps = await prisma.providerProfile.findMany({
    where: { coordinator_person_id: person.id },
    orderBy: { updated_at: "desc" },
    select: {
      id: true,
      status: true,
      paused_at: true,
      completeness: true,
      validation_status: true,
      role_type_id: true,
      hourly_rate_cents: true,
      rate_min_cents: true,
      rate_max_cents: true,
      onsite_rate_cents: true,
      remote_rate_cents: true,
      skills: { select: { id: true } },
      person: {
        select: {
          first_name: true,
          last_name: true,
          title: true,
          photo_url: true,
          phone: true,
          site: { select: { addresses: { select: { id: true } } } },
        },
      },
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
      // THE DTO KEY STAYS `headline`; the SOURCE is `Person.title` since
      headline: p.person.title || null,
      photoUrl: p.person.photo_url,
      visible: isMarketplaceVisible({ ...p, meetsRequired: providerMeetsRequired(p) }),
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

/** THE ROSTER'S COVERAGE WS-D) */
export async function rosterCoverage(coordinatorPersonId: string): Promise<string[]> {
  const members = await prisma.providerProfile.findMany({
    where: { coordinator_person_id: coordinatorPersonId },
    select: {
      role_type_id: true,
      roles: { select: { role_type_id: true } },
      skills: {
        select: { skill: { select: { name: true, role_type_id: true } } },
      },
    },
  });

  const names = new Set<string>();
  for (const m of members) {
    // ONE RULE, THE SAME ONE THE PROFILE AND THE MATCHER READ. Not a second
    for (const s of shownSkills(selectedRoleIds(m), m.skills, (x) => x.skill.role_type_id)) {
      names.add(s.skill.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** AN INVITATION MUST NOT BE BLIND WS-D item 4) */
export type IncomingRosterInvite = {
  id: string;
  invitedAt: string;
  recruiter: { name: string; title: string | null; photoUrl: string | null };
  rosterSize: number;
  coverage: string[];
};

export async function incomingRosterInvites(
  viewer: Viewer
): Promise<IncomingRosterInvite[]> {
  const user = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { email: true },
  });
  if (!user?.email) return [];

  // MATCHED ON THE ADDRESS, because an invite is sent before the invitee is
  const invites = await prisma.coordinatorInvite.findMany({
    where: { invitee_email: normalizeEmail(user.email), status: "PENDING" },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      created_at: true,
      inviter: {
        select: { id: true, first_name: true, last_name: true, title: true, photo_url: true },
      },
    },
  });
  if (invites.length === 0) return [];

  return Promise.all(
    invites.map(async (i) => ({
      id: i.id,
      invitedAt: i.created_at.toISOString(),
      recruiter: {
        name: `${i.inviter.first_name} ${i.inviter.last_name}`.trim(),
        title: i.inviter.title,
        photoUrl: i.inviter.photo_url,
      },
      rosterSize: await prisma.providerProfile.count({
        where: { coordinator_person_id: i.inviter.id },
      }),
      // THE SAME ROLLUP THE RECRUITER SEES ON THEIR OWN PAGE — one function
      coverage: await rosterCoverage(i.inviter.id),
    }))
  );
}
