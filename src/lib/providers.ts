import { prisma } from "@/lib/prisma";
import { isMarketplaceVisible } from "@/lib/access";

/**
 * A provider's PUBLIC marketplace profile by profile id. Public surface — no
 * PAccount scope — but gated on VISIBILITY (brief_K): only an ACTIVE, ≥80%-
 * complete, un-paused profile is returned, so a hidden profile never leaks.
 * The OWNER bypasses the gate (they always see their own profile) — pass their
 * user id as `viewerUserId`. Returns null when not found or not visible.
 *
 * Sets the profile-read pattern for the marketplace browse/detail endpoints.
 */
export async function getPublicProviderProfile(
  id: string,
  opts: { viewerUserId?: string } = {}
) {
  const profile = await prisma.providerProfile.findUnique({
    where: { id },
    include: {
      person: {
        select: {
          user_id: true,
          first_name: true,
          last_name: true,
          title: true,
          photo_url: true,
        },
      },
      region: { select: { id: true, name: true } },
      specializations: {
        include: { specialization: { select: { id: true, name: true, kind: true } } },
      },
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
      employers: {
        orderBy: [{ sort_order: "asc" }, { start_date: "desc" }],
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

  // Visibility gate — owner always bypasses; everyone else needs the profile to
  // be marketplace-visible.
  const isOwner =
    opts.viewerUserId != null && profile.person.user_id === opts.viewerUserId;
  if (!isOwner && !isMarketplaceVisible(profile)) return null;

  return {
    id: profile.id,
    // Validated is a public badge (brief_K) — visible to everyone; does NOT
    // affect base visibility.
    validated: profile.validation_status === "VALIDATED",
    headline: profile.headline,
    overview: profile.overview,
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
    // Cross-cutting specializations (brief_R) — systems, processes, industries.
    specializations: profile.specializations.map((s) => ({
      id: s.specialization.id,
      name: s.specialization.name,
      kind: s.specialization.kind,
    })),
    experience: profile.employers.map((we) => ({
      id: we.id,
      employer: we.name,
      roleTitle: we.role_title ?? "",
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
