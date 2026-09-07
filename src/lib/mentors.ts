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
  /**
   * ⚠⚠ THE RECRUITER FORK (`P2-J1.1-E028` WS-1). `WorkMethod.RECRUITER` is the
   * user-type fork — *"a recruiter sells the services of OTHERS and is the app's
   * Coordinator role"*. It rides on the card so the CALLER can split one list
   * into two rows.
   * ⚠ IT IS NOT A FILTER HERE, AND THAT IS DELIBERATE: `marketplaceVisibleWhere()`
   * is untouched, so recruiters stay in search. Scott asked for two carousels,
   * not an exclusion — *"some will still only want to work with recruiters"*.
   */
  isRecruiter: boolean;
  /**
   * ⚠ WHAT A RECRUITER ASKS. Scott: *"EVERY recruiter asks the same questions…
   * how many years of experience do you have? How many projects have you been
   * on?"* ⚠ `_count`s, NOT rows — the house rule from `explore.ts`: pulling
   * eight employer records to call `.length` on them would ship a provider's
   * work history to render one digit.
   */
  employerCount: number;
  projectCount: number;
  /**
   * ⚠ SCOTT ASKED FOR THIS ONE BY NAME — *"Specialties (2)"*. It needed NO NEW
   * QUERY: `specializations` is a relation on `ProviderProfile`, so it is one
   * more `_count` on the SAME select, which is the sanctioned pattern rather
   * than the over-fetch the house rule forbids.
   */
  specialtyCount: number;
  /** `0..100`. ⚠ RANKING INPUT — and it is visible, as the fields it counts. */
  completeness: number;
  /** Their published hourly range, when they have one. Cents. */
  rateMinCents: number | null;
  rateMaxCents: number | null;
  /**
   * ⚠⚠ THE OTHER TWO OF THE FIVE THE GATE ACCEPTS (`E028` WS-4).
   * `marketplaceVisibleWhere()` REQUIRES a rate, ORing across FIVE fields —
   * hourly, min, max, onsite, remote — so a profile with NO rate cannot be
   * visible at all. The card read a SUBSET, so anyone priced onsite- or
   * remote-only rendered blank and looked unpriced. They were not.
   */
  onsiteRateCents: number | null;
  remoteRateCents: number | null;
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
 * ── ⚠⚠ RANK ON WHAT YOU SHOW (`P2-J1.1-E028` WS-5) ──────────────────────────
 *
 * SCOTT, 2026-09-07, on the inputs he had just approved: *"Number 1 is correct,
 * but I cannot see those things on the cards I am looking at."*
 *
 * THAT IS THE RULE. A ranking whose inputs are invisible cannot be explained to
 * the provider it ranks low. EVERY INPUT BELOW IS A FIELD THE CARD RENDERS:
 *
 *   1  VALIDATION      — the `Validated` pill (green when yes, grey when not)
 *   2  COMPLETENESS    — not a number on the card, but what it COUNTS is: the
 *                        photo, the headline, the skills, the rate. A profile
 *                        with a placeholder avatar and no rate scores low and
 *                        sinks, which fixes the visible problem for free.
 *   3  EMPLOYER COUNT  — "N Companies" on the card   ⚠ TIEBREAKER ONLY
 *   4  PROJECT COUNT   — "N Projects" on the card    ⚠ TIEBREAKER ONLY
 *
 * ⚠⚠ YOE AND PROJECT COUNT ARE TIEBREAKERS, NOT THE SPINE, AND THAT IS A
 * PRODUCT DECISION NOT A WEIGHTING ACCIDENT. Ranked on their own they measure
 * TENURE, NOT FIT: a thirty-year veteran with forty projects would outrank the
 * person who did exactly this implementation last year — backwards for a
 * marketplace whose whole value is matching.
 *
 * ⚠⚠ THE CLIENT-VERIFIED RECOMMENDATION INPUT IS DROPPED, AND IT IS DROPPED ON
 * EVIDENCE. `E014` MERGED — but it shipped NO badge, because nothing on
 * `RecommendationRequest` records a RELATIONSHIP (`recommender_company` is free
 * text, `contact_off_platform` proves only that an address has an account) and
 * `model WorkOrder` does not exist, so there is no engagement to join back to.
 * Ranking on a signal with no badge behind it would break this work-stream's own
 * rule on its first input. It returns when `E044`'s `Relationship` field lands.
 *
 * ⚠ THE SCORE IS HIDDEN. A visible number invites gaming and argument; the FACTS
 * are visible and the arithmetic is not.
 *
 * ⚠⚠ COLD START — NAMED SO IT IS NOT MISTAKEN FOR INTELLIGENCE IT DOES NOT HAVE.
 * With this few providers and fewer validated ones, this mostly surfaces
 * whoever filled their profile in most completely. That is fine and arguably
 * ideal this early, but THE RANKING'S REAL JOB TODAY IS QUALITY CONTROL, NOT
 * MATCHING. It does not know what the buyer needs, because nothing on the card
 * tells it. When there is demand data, this ordering is the first thing to go.
 *
 * ⚠ SUPERSEDED, QUOTED NOT DELETED: *"ORDERED BY COMPLETENESS then rating: with
 * no opt-in and no reviews yet, the least-arbitrary ranking available is 'who
 * has actually filled their profile in'."* Still true, and completeness is still
 * here — it is now the THIRD tier rather than the first, behind validation.
 * ⚠ `rating` LEAVES THE ORDERING: it is not on the card, so under Scott's rule
 * it cannot rank. Nothing has been rated yet either.
 */
export async function listMentors(opts: { skill?: string } = {}): Promise<MentorCard[]> {
  const rows = await prisma.providerProfile.findMany({
    where: {
      ...marketplaceVisibleWhere(),
      ...(opts.skill
        ? { skills: { some: { skill: { name: { contains: opts.skill, mode: "insensitive" } } } } }
        : {}),
    },
    /*
      ⚠ THE DATABASE ORDERS BY COMPLETENESS SO THE `take` KEEPS THE RIGHT 48;
      the ranking proper is applied below, in memory, because it is a COMPOSITE
      and Postgres cannot order an enum by anything but its declaration order —
      see the `validation_status` note under the sort.
    */
    orderBy: [{ completeness: "desc" }, { updated_at: "desc" }],
    take: 48,
    select: {
      id: true,
      headline: true,
      hourly_rate_cents: true,
      rate_min_cents: true,
      rate_max_cents: true,
      currency: true,
      validation_status: true,
      work_method: true,
      completeness: true,
      onsite_rate_cents: true,
      remote_rate_cents: true,
      /* ⚠ `_count`, not rows — see `employerCount` on the type. */
      _count: { select: { employers: true, projects: true, specializations: true } },
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

  const cards = rows.map((p) => ({
    profileId: p.id,
    name: `${p.person.first_name} ${p.person.last_name}`.trim(),
    firstName: p.person.first_name,
    lastName: p.person.last_name,
    headline: p.headline,
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
