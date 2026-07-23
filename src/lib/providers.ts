import { prisma } from "@/lib/prisma";

/**
 * A provider's PUBLIC marketplace profile by profile id. Public surface — no
 * viewer, NOT PAccount-scoped — but gated on visibility: only a `published` +
 * `APPROVED` profile is returned (providers are reviewed before going live), so
 * this endpoint can never leak a draft or rejected profile. Returns null when
 * not found or not yet public.
 *
 * Sets the profile-read pattern for the marketplace browse/detail endpoints.
 */
export async function getPublicProviderProfile(id: string) {
  const profile = await prisma.providerProfile.findFirst({
    where: { id, published: true, approval_status: "APPROVED" },
    include: {
      person: {
        select: {
          first_name: true,
          last_name: true,
          title: true,
          photo_url: true,
        },
      },
      region: { select: { id: true, name: true } },
      skills: {
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              roleType: { select: { code: true, display: true } },
            },
          },
        },
      },
      workExperiences: {
        orderBy: { start_date: "desc" },
        include: {
          projects: { select: { id: true, name: true, description: true } },
        },
      },
      certifications: true,
      education: true,
      languages: true,
    },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    headline: profile.headline,
    overview: profile.overview,
    experienceLevel: profile.experience_level,
    workTypes: profile.work_types,
    // Money stays in integer cents; the client formats it.
    rates: {
      currency: profile.currency,
      onsiteCents: profile.onsite_rate_cents,
      remoteCents: profile.remote_rate_cents,
    },
    // Decimal → number for JSON; null when unrated.
    rating: profile.rating === null ? null : Number(profile.rating),
    idBadge: profile.id_badge,
    region: profile.region,
    person: {
      firstName: profile.person.first_name,
      lastName: profile.person.last_name,
      title: profile.person.title,
      photoUrl: profile.person.photo_url,
    },
    skills: profile.skills.map((ps) => ({
      id: ps.skill.id,
      name: ps.skill.name,
      roleType: ps.skill.roleType.display,
    })),
    experience: profile.workExperiences.map((we) => ({
      id: we.id,
      employer: we.employer,
      roleTitle: we.role_title,
      description: we.description,
      startDate: we.start_date,
      endDate: we.end_date,
      projects: we.projects,
    })),
    certifications: profile.certifications.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      year: c.year,
    })),
    education: profile.education.map((e) => ({
      id: e.id,
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      year: e.year,
    })),
    languages: profile.languages.map((l) => ({
      id: l.id,
      name: l.name,
      proficiency: l.proficiency,
    })),
  };
}
