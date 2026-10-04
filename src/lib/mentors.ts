import { prisma } from "@/lib/prisma";
import { marketplaceVisibleWhere } from "@/lib/access";

export type MentorCard = {
  profileId: string;
  name: string;
  firstName: string;
  lastName: string;
  headline: string;
  photoUrl: string | null;
  validated: boolean;
  /** Up to six, for the card. Their claimed catalog skills. */
  skills: string[];
  isRecruiter: boolean;
  employerCount: number;
  projectCount: number;
  specialtyCount: number;
  completeness: number;
  /** Their published hourly range, when they have one. Cents. */
  rateMinCents: number | null;
  rateMaxCents: number | null;
  onsiteRateCents: number | null;
  remoteRateCents: number | null;
  hourlyRateCents: number | null;
  userId: string | null;
  personId: string;
  currency: string;
  /** Learning paths they teach — real evidence they explain things for a living. */
  teaches: number;
};

// export const MICRO_SESSION_PRICE = "$49.99";
// export const MICRO_SESSION_MINUTES = 15;

export async function listMentors(
  opts: { skill?: string; openOnly?: boolean } = {}
): Promise<MentorCard[]> {
  const rows = await prisma.providerProfile.findMany({
    where: {
      ...marketplaceVisibleWhere(),
      ...(opts.openOnly ? { open_for_mentoring: true } : {}),
      ...(opts.skill
        ? { skills: { some: { skill: { name: { contains: opts.skill, mode: "insensitive" } } } } }
        : {}),
    },
    orderBy: [{ completeness: "desc" }, { updated_at: "desc" }],
    take: 48,
    select: {
      id: true,
      hourly_rate_cents: true,
      rate_min_cents: true,
      rate_max_cents: true,
      currency: true,
      validation_status: true,
      work_method: true,
      completeness: true,
      onsite_rate_cents: true,
      remote_rate_cents: true,
      _count: { select: { employers: true, projects: true, specializations: true } },
      person: {
        select: {
          id: true,
          user_id: true,
          first_name: true,
          last_name: true,
          title: true,
          photo_url: true,
          learnLessons: { select: { id: true }, take: 1 },
        },
      },
      skills: {
        take: 6,
        select: { skill: { select: { name: true } } },
      },
    },
  });

  const cards = rows.map((p) => ({
    profileId: p.id,
    name: `${p.person.first_name} ${p.person.last_name}`.trim(),
    firstName: p.person.first_name,
    lastName: p.person.last_name,
    /* ⚠ THE DTO KEY STAYS `headline`; the SOURCE is `Person.title` since
       `E595` WS-B collapsed the two columns into one. */
    headline: p.person.title ?? "",
    photoUrl: p.person.photo_url,
    validated: p.validation_status === "VALIDATED",
    skills: p.skills.map((s) => s.skill.name),
    isRecruiter: p.work_method === "RECRUITER",
    employerCount: p._count.employers,
    projectCount: p._count.projects,
    specialtyCount: p._count.specializations,
    completeness: p.completeness,
    rateMinCents: p.rate_min_cents,
    rateMaxCents: p.rate_max_cents,
    hourlyRateCents: p.hourly_rate_cents,
    onsiteRateCents: p.onsite_rate_cents,
    remoteRateCents: p.remote_rate_cents,
    userId: p.person.user_id,
    personId: p.person.id,
    currency: p.currency,
    teaches: p.person.learnLessons.length,
  }));

  /*
    ⚠⚠ SORTED IN MEMORY, AND THAT IS NOT LAZINESS. Postgres orders an enum by
    DECLARATION order, and `ValidationStatus` is declared
    `NOT_REQUESTED, REQUESTED, VALIDATED, REJECTED` — so `asc` puts UNVALIDATED
    first and `desc` puts REJECTED first. NEITHER DIRECTION LEADS WITH VALIDATED.
    A boolean derived in the mapping can be ordered correctly; the column cannot.
    ⚠ The page is already bounded at 48, so this sorts a page, not a table.
  */
  return cards.sort(
    (a, b) =>
      Number(b.validated) - Number(a.validated) ||
      b.completeness - a.completeness ||
      b.employerCount - a.employerCount ||
      b.projectCount - a.projectCount
  );
}
