import { prisma } from "@/lib/prisma";
import { isMarketplaceVisible, providerMeetsRequired, type Viewer } from "@/lib/access";
/* `P2-J3-E558` WS-D — coverage rolls up through E517's offer-side filter. */
import { shownSkills, selectedRoleIds } from "@/lib/shown-skills";
import { normalizeEmail } from "@/lib/normalizeEmail";

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
      /* ⚠ `headline` COLUMN IS GONE (`E595` WS-B) — the title is on the person. */
      status: true,
      paused_at: true,
      completeness: true,
      validation_status: true,
      /*
        ⚠⚠ WIDENED FOR THE ONE GATE (`P2-J3-E590` WS-A0). `isMarketplaceVisible`
        now REQUIRES `meetsRequired`, and `providerMeetsRequired` reads the
        required set — so the fields it needs have to be in the query.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        // person: { select: { first_name: true, last_name: true, photo_url: true } },
        ⚠ This row previously fell back to `completeness >= 80`, which is why it
        could show a coordinator a rep as VISIBLE while the profile page 404'd
        for the same person.
      */
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
          /* ⚠ `title` — the profile's title lives on the PERSON since `E595` WS-B. */
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
      /* ⚠ THE DTO KEY STAYS `headline`; the SOURCE is `Person.title` since
       `E595` WS-B collapsed the two columns into one. */
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

/**
 * ── ⚠⚠ THE ROSTER'S COVERAGE (`P2-J3-E558` WS-D) ──────────────────────────
 *
 * ⚠⚠ THIS IS THE RECRUITER'S PROFILE, NOT A STATISTIC. A recruiter's skills roll
 * up from their team the way a provider's roll up from their jobs — it is what
 * they can field, stated as skills.
 *
 * ⚠⚠⚠ ROLLED UP THROUGH `shown-skills.ts`, SO `E517`'s OFFER-SIDE FILTER APPLIES.
 * Coverage shows what the roster OFFERS, not everything its people HOLD. A
 * provider who narrowed their roles is making an offer-side statement, and a
 * recruiter's coverage is an offer-side surface — quoting held-but-hidden skills
 * there would re-expose exactly what `E517` hid.
 * ⚠ `E481`: FILTER WHAT IS OFFERED, NEVER WHAT IS HELD.
 */
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
    /* ⚠ ONE RULE, THE SAME ONE THE PROFILE AND THE MATCHER READ. Not a second
       copy of "which skills count" — `check:shown-skills` holds it. */
    for (const s of shownSkills(selectedRoleIds(m), m.skills, (x) => x.skill.role_type_id)) {
      names.add(s.skill.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/**
 * ── ⚠⚠ AN INVITATION MUST NOT BE BLIND (`P2-J3-E558` WS-D item 4) ─────────
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the brief first asked for:
 * *"An invitation carries the work — who the buyer is, the scope, the viewer's
 * part. An invitation without the work attached is a request to trust the
 * recruiter."*
 *
 * ⚠⚠ `CoordinatorInvite` HAS NO RELATION TO `WorkRequest` AND NONE WAS ADDED.
 * ⚠⚠⚠ THE ROSTER IS STANDING, NOT PER-JOB — accepting sets
 * `coordinator_person_id` permanently, and the schema comment says it *"ATTACHES
 * THE provider"*. ⚠ SO BEING ASKED TO TRUST THE RECRUITER **IS** THE
 * TRANSACTION, not a defect in it. Attaching a single work request to a standing
 * commitment would misdescribe what accepting does.
 *
 * ⚠ THE PRINCIPLE SURVIVES ON THE RIGHT OBJECT: the invitation carries WHO THE
 * RECRUITER IS, HOW BIG THE ROSTER IS, AND WHAT IT COVERS — what a person needs
 * to judge a standing commitment.
 */
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

  /* ⚠ MATCHED ON THE ADDRESS, because an invite is sent before the invitee is
     known to exist — the same reason `CoordinatorInvite` stores an email rather
     than a person id. ⚠ `normalizeEmail` is what the invite path stores with. */
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
      /* ⚠ THE SAME ROLLUP THE RECRUITER SEES ON THEIR OWN PAGE — one function,
         so the invitation cannot describe a roster differently from the roster. */
      coverage: await rosterCoverage(i.inviter.id),
    }))
  );
}
