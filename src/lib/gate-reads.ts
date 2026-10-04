import { prisma } from "@/lib/prisma";
import { missingForLearn, missingForSell, type GateGap } from "@/lib/identity-bar";

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
    hasApprovedCompanyMembership: false,
    companyName: null,
    companyCountry: null,
    skillCount: person.providerProfile?.skills.length ?? 0,
  });
}

export async function sellGaps(viewerUserId: string): Promise<GateGap[]> {
  const pp = await prisma.providerProfile.findFirst({
    where: { person: { user_id: viewerUserId } },
    select: {
      role_type_id: true,
      hourly_rate_cents: true,
      rate_min_cents: true,
      rate_max_cents: true,
      onsite_rate_cents: true,
      remote_rate_cents: true,
      skills: { select: { id: true } },
      person: {
        select: {
          title: true,
          photo_url: true,
          phone: true,
          payoutMethods: { select: { id: true }, take: 1 },
          site: { select: { addresses: { select: { line1: true }, take: 1 } } },
        },
      },
    },
  });
  if (!pp) {
    return missingForSell({
      headline: null, role_type_id: null, skills: [], photoUrl: null,
      hasAddress: false, hasPhone: false, payoutMethodCount: 0,
    });
  }
  return missingForSell({
    headline: pp.person.title,
    role_type_id: pp.role_type_id,
    skills: pp.skills,
    photoUrl: pp.person.photo_url,
    hourly_rate_cents: pp.hourly_rate_cents,
    rate_min_cents: pp.rate_min_cents,
    rate_max_cents: pp.rate_max_cents,
    onsite_rate_cents: pp.onsite_rate_cents,
    remote_rate_cents: pp.remote_rate_cents,
    hasAddress: Boolean(pp.person.site?.addresses?.[0]?.line1?.trim()),
    hasPhone: Boolean(pp.person.phone?.trim()),
    payoutMethodCount: pp.person.payoutMethods.length,
  });
}

/** The refusal, flattened for a client that only reads the string. */
export const gapSentence = (gaps: GateGap[]) =>
  gaps.map((g) => `${g.field} — ${g.reason}`).join(" ");
