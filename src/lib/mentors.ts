import { prisma } from "@/lib/prisma";
import { marketplaceVisibleWhere } from "@/lib/access";

/**
 * FIND A MENTOR — the directory shell (PHASE 2 / WS2-E).
 *
 * REAL PROVIDERS, NOT FIXTURES. Every card is a marketplace-visible
 * ProviderProfile read through `marketplaceVisibleWhere()` — the same predicate
 * the public marketplace uses, so a mentor card can never show somebody the
 * marketplace itself would hide. A directory of invented experts would be the
 * single most damaging fake data in this build: it advertises people who cannot
 * be booked.
 *
 * WHAT IS NOT REAL YET, and is labelled as such on the card: there is no
 * `MentorProfile`, so nobody has OPTED IN to mentoring and nobody has set a
 * micro-session price. PHASE 4 adds that model, the storefront and the booking.
 * Until then this lists providers who are ELIGIBLE — visible, with skills — and
 * says so, rather than implying they have agreed to mentor.
 *
 * THE RATE ANCHOR IS THE PRODUCT'S, NOT THE PERSON'S. $49.99 / 15 min is the
 * platform anchor from the brief; it is rendered as the anchor and explicitly
 * not as a quote from that provider, because none of them has set one. Their
 * own hourly range is shown separately where they have published it — that IS
 * theirs.
 */

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
  /** Their published hourly range, when they have one. Cents. */
  rateMinCents: number | null;
  rateMaxCents: number | null;
  currency: string;
  /** Learning paths they teach — real evidence they explain things for a living. */
  teaches: number;
};

/** The platform's micro-session anchor. One place, so the copy can't drift. */
export const MICRO_SESSION_PRICE = "$49.99";
export const MICRO_SESSION_MINUTES = 15;

/**
 * Eligible mentors, most-complete first.
 *
 * ORDERED BY COMPLETENESS then rating: with no opt-in and no reviews yet, the
 * least-arbitrary ranking available is "who has actually filled their profile
 * in". It is honest about being a proxy — when MentorProfile and session
 * feedback exist in PHASE 4, this ordering is the first thing that should go.
 */
export async function listMentors(opts: { skill?: string } = {}): Promise<MentorCard[]> {
  const rows = await prisma.providerProfile.findMany({
    where: {
      ...marketplaceVisibleWhere(),
      ...(opts.skill
        ? { skills: { some: { skill: { name: { contains: opts.skill, mode: "insensitive" } } } } }
        : {}),
    },
    orderBy: [{ completeness: "desc" }, { rating: "desc" }],
    take: 48,
    select: {
      id: true,
      headline: true,
      rate_min_cents: true,
      rate_max_cents: true,
      currency: true,
      validation_status: true,
      person: {
        select: {
          first_name: true,
          last_name: true,
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

  return rows.map((p) => ({
    profileId: p.id,
    name: `${p.person.first_name} ${p.person.last_name}`.trim(),
    firstName: p.person.first_name,
    lastName: p.person.last_name,
    headline: p.headline,
    photoUrl: p.person.photo_url,
    validated: p.validation_status === "VALIDATED",
    skills: p.skills.map((s) => s.skill.name),
    rateMinCents: p.rate_min_cents,
    rateMaxCents: p.rate_max_cents,
    currency: p.currency,
    teaches: p.person.learnLessons.length,
  }));
}
