import { prisma } from "@/lib/prisma";
import { missingForLearn, missingForSell, type GateGap } from "@/lib/identity-bar";

/**
 * THE GATE LADDER'S DATABASE READS (`P1-ALL-E034`).
 *
 * ⚠ THE RULE IS NOT HERE. Every set, every field and every reason lives in
 * `lib/identity-bar.ts`, which is deliberately pure so both harnesses can drive
 * it with no fixture and no database. This file only fetches the columns those
 * predicates need. ⚠ IF YOU ARE ADDING A REQUIREMENT, IT GOES THERE, NOT HERE.
 *
 * ⚠ EVERY READ IS OWNER-SCOPED FROM THE SESSION. Nothing takes a person or
 * profile id from a caller.
 */

/** `LEARN` — `IDENTITY` plus one skill. No company, no address, no phone. */
export async function learnGaps(userId: string): Promise<GateGap[]> {
  const person = await prisma.person.findUnique({
    where: { user_id: userId },
    select: {
      first_name: true,
      last_name: true,
      photo_url: true,
      title: true,
      providerProfile: { select: { skills: { select: { id: true }, take: 1 } } },
    },
  });
  /*
    ⚠ NO PERSON MEANS NO PROFILE AT ALL, so everything in the set is missing.
    Returning an empty list here would let a row-less account through the one
    gate that exists to stop exactly that.
  */
  if (!person) {
    return missingForLearn({
      firstName: null, lastName: null, photoUrl: null, jobTitle: null,
      hasApprovedCompanyMembership: false, companyName: null, companyCountry: null,
      skillCount: 0,
    });
  }
  return missingForLearn({
    firstName: person.first_name,
    lastName: person.last_name,
    photoUrl: person.photo_url,
    jobTitle: person.title,
    /* ⚠ NOT IN `LEARN_BAR`, so these three are never consulted. Passed only
       because `IdentitySubject` is a total shape on purpose. */
    hasApprovedCompanyMembership: false,
    companyName: null,
    companyCountry: null,
    skillCount: person.providerProfile?.skills.length ?? 0,
  });
}

/**
 * `SELL` — `SEARCHABLE` (via `missingRequired()`) plus a payout method.
 *
 * ⚠ THE COLUMN LIST IS THE ONE `lib/onboarding.ts:2374` ALREADY BUILDS for the
 * provider publish gate, deliberately identical: publishing a profile and
 * publishing a product must not disagree about what "searchable" means.
 */
export async function sellGaps(viewerUserId: string): Promise<GateGap[]> {
  const pp = await prisma.providerProfile.findFirst({
    where: { person: { user_id: viewerUserId } },
    select: {
      headline: true,
      role_type_id: true,
      hourly_rate_cents: true,
      rate_min_cents: true,
      rate_max_cents: true,
      onsite_rate_cents: true,
      remote_rate_cents: true,
      skills: { select: { id: true } },
      person: {
        select: {
          photo_url: true,
          phone: true,
          companyMemberships: { where: { status: "APPROVED" }, select: { id: true }, take: 1 },
          payoutMethods: { select: { id: true }, take: 1 },
          site: { select: { addresses: { select: { line1: true }, take: 1 } } },
        },
      },
    },
  });
  if (!pp) {
    return missingForSell({
      headline: null, role_type_id: null, skills: [], photoUrl: null,
      hasCompany: false, hasAddress: false, hasPhone: false, payoutMethodCount: 0,
    });
  }
  return missingForSell({
    headline: pp.headline,
    role_type_id: pp.role_type_id,
    skills: pp.skills,
    photoUrl: pp.person.photo_url,
    hourly_rate_cents: pp.hourly_rate_cents,
    rate_min_cents: pp.rate_min_cents,
    rate_max_cents: pp.rate_max_cents,
    onsite_rate_cents: pp.onsite_rate_cents,
    remote_rate_cents: pp.remote_rate_cents,
    hasCompany: pp.person.companyMemberships.length > 0,
    hasAddress: Boolean(pp.person.site?.addresses?.[0]?.line1?.trim()),
    hasPhone: Boolean(pp.person.phone?.trim()),
    payoutMethodCount: pp.person.payoutMethods.length,
  });
}

/** The refusal, flattened for a client that only reads the string. */
export const gapSentence = (gaps: GateGap[]) =>
  gaps.map((g) => `${g.field} — ${g.reason}`).join(" ");
