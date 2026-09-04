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
 * ── ⚠⚠ SUPERSEDED 2026-09-03 (`P1-ALL-E374`). PHASE 4 IS CANCELLED. ────────
 *
 * THIS HEADER USED TO SAY, and it is quoted rather than deleted because the plan
 * it describes was real and was called off by name:
 *   *"there is no `MentorProfile`, so nobody has OPTED IN to mentoring and
 *   nobody has set a micro-session price. **PHASE 4 adds that model, the
 *   storefront and the booking.** Until then this lists providers who are
 *   ELIGIBLE — visible, with skills — and says so, rather than implying they
 *   have agreed to mentor."*
 * and:
 *   *"THE RATE ANCHOR IS THE PRODUCT'S, NOT THE PERSON'S. $49.99 / 15 min is the
 *   platform anchor from the brief; it is rendered as the anchor and explicitly
 *   not as a quote from that provider, because none of them has set one."*
 *
 * ⚠⚠ THERE IS NO OPT-IN AND THERE NEVER WILL BE. SCOTT, 2026-09-03: *"EVERYONE
 * may be a mentor. I do not want to get into that. I can request mentoring from
 * anyone...you. I should be able to see your rate...which you specified in your
 * onboarding...just use that."* And, sharpening it: *"everyone CAN be. the
 * determining factor is if anyone wants you to be...and therefore makes a
 * request from you."*
 *
 * SO: no `MentorProfile`, no storefront, no booking, no opt-in, no mentor rate
 * field, and NO SCHEMA CHANGE. **Mentor is not a status somebody claims — it is
 * one demand confers.** A member becomes a mentor the moment another member
 * connects to them as one, which `E372`'s `MENTOR` connection row already does
 * in full. There was never anything to build.
 *
 * ⚠ THE RATE IS THE PERSON'S OWN, from their onboarding, via
 * `lib/rate-display.ts`. The platform anchor is parked below — a fixed price
 * goes stale, cannot answer demand, and tells a genuinely senior person their
 * hour is worth what everyone else's is. Scott's reasons: COMPETITION, and
 * INFLATION OR DEFLATION.
 *
 * ⚠ THE OLD HONESTY IS WHY THE ANCHOR REMOVED CLEANLY: the header already said
 * it was *"explicitly not a quote from that provider, because none of them has
 * set one"*. Nothing depended on it being true.
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
  /**
   * ⚠ ADDED BY `P1-ALL-E374` AND IT IS NOT OPTIONAL POLISH. The decided display
   * rule falls back to `hourly_rate_cents` when there is no min/max range, and
   * MEASURED AGAINST LIVE DATA that fallback carries 19 of 25 marketplace-visible
   * providers. Without this field the card would show no rate for 76% of the
   * directory — which reads as "they have not priced themselves" and is false.
   */
  hourlyRateCents: number | null;
  /**
   * ⚠ THE USER, FOR CONNECTING. A `MENTOR` connection is written against
   * `to_user_id`, so a card cannot offer `Connect as mentor` without it.
   * `personId` comes along for the same read.
   */
  userId: string | null;
  personId: string;
  currency: string;
  /** Learning paths they teach — real evidence they explain things for a living. */
  teaches: number;
};

/* ⚠⚠ THE PLATFORM MICRO-SESSION ANCHOR — PARKED 2026-09-03 (`P1-ALL-E374`).
   ⚠ COMMENTED OUT, NOT DELETED, AND IT MUST NOT BE DELETED.

   WHY IT GOES: a platform-fixed rate goes stale, cannot answer demand, and tells
   a genuinely senior person their hour is worth what everyone else's is. Scott's
   reasons, verbatim: COMPETITION, and INFLATION OR DEFLATION.

   ⚠ WHAT REPLACES IT IS NOT ANOTHER CONSTANT — it is the provider's OWN rate,
   already captured in onboarding, rendered through `lib/rate-display.ts`. Scott:
   *"I should be able to see your rate...which you specified in your
   onboarding...just use that."*

   ⚠ `check:community` ASSERTS THESE HAVE NO LIVE CALLER, and that a rate on any
   community or profile surface comes from the provider's own fields rather than
   a constant. Uncommenting either of these without removing that assertion will
   turn the gate red — which is the point.

   Its original docblock, preserved: *"The platform's micro-session anchor. One
   place, so the copy can't drift."* */
// export const MICRO_SESSION_PRICE = "$49.99";
// export const MICRO_SESSION_MINUTES = 15;

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
      hourly_rate_cents: true,
      rate_min_cents: true,
      rate_max_cents: true,
      currency: true,
      validation_status: true,
      person: {
        select: {
          id: true,
          user_id: true,
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
    hourlyRateCents: p.hourly_rate_cents,
    userId: p.person.user_id,
    personId: p.person.id,
    currency: p.currency,
    teaches: p.person.learnLessons.length,
  }));
}
