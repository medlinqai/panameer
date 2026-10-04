import { roleLong } from "@/lib/role-labels";
import { formatLocality } from "@/lib/locality";
import { prisma } from "@/lib/prisma";
import { countryName } from "@/lib/country";
import { canSeeRate } from "@/lib/rate-visibility";
import { isMarketplaceVisible, providerMeetsRequired } from "@/lib/access";
import { aiExtractionAvailable } from "@/lib/resume/ai-extract";
import { missingRequired, profileEnrichmentGaps, VISIBILITY_THRESHOLD } from "@/lib/completeness";
import { shownSkills, selectedRoleIds } from "@/lib/shown-skills";
import { listPublishedServiceProducts } from "@/lib/service-products";
import { toView as toArtifactView } from "@/lib/artifacts";
import {
  viewerIsPlus,
  contactVisibility,
  clientNameVisibility,
  identityVisibility,
} from "@/lib/plus";
import { experienceLabel } from "@/lib/experience";
import { isRecruiterProfile } from "@/lib/onboarding";

export async function getProviderProfileView(
  profileId: string,
  opts: {
    viewerUserId?: string;
    /** Full viewer, when available — needed for the WS5 Plus gate. */
    viewer?: import("@/lib/access").Viewer | null;
    previewAsPeer?: boolean;
  } = {}
) {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    include: {
      person: {
        select: {
          id: true,
          user_id: true,
          first_name: true,
          last_name: true,
          title: true,
          photo_url: true,
          phone: true,
          phone_verified_at: true,
          created_at: true,
          // WS6 — the required-set gate reads these. Loaded explicitly so a
          // missing relation is a compile error rather than a provider quietly
          // hidden from the marketplace.
          site: {
            select: {
              addresses: {
                select: { city: true, state: true, country: true, country_code: true },
                take: 1,
              },
            },
          },
          user: { select: { email_verified: true } },
        },
      },
      roleType: { select: { name: true, display: true } },
      pillar: { select: { name: true } },
      region: { select: { id: true, name: true } },
      skills: {
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              role_type_id: true,
              pillar: { select: { id: true, name: true } },
            },
          },
        },
      },
      roles: { select: { role_type_id: true } },
      specializations: {
        include: { specialization: { select: { id: true, name: true, kind: true } } },
      },
      employers: {
        orderBy: [{ sort_order: "asc" }, { is_current: "desc" }, { start_date: "desc" }],
        include: {
          artifacts: { orderBy: [{ sort_order: "asc" }] },
          projects: { orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] },
          validations: {
            where: { status: "CONFIRMED" },
            orderBy: { responded_at: "desc" },
            take: 1,
            select: {
              responded_at: true,
              contact_email: true,
              confirmed_by_person_id: true,
            },
          },
        },
      },
      projects: {
        orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
        include: {
          employer: { select: { id: true, name: true } },
          roleType: { select: { id: true, name: true } },
          industry: { select: { id: true, name: true } },
          applications: {
            include: { application: { select: { id: true, name: true } } },
          },
          outcomes: { orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] },
          artifacts: { orderBy: [{ sort_order: "asc" }] },
          // The CONFIRMED response, for the "Confirmed March 2026" note.
          validations: {
            where: { status: "CONFIRMED" },
            orderBy: { responded_at: "desc" },
            take: 1,
            select: { responded_at: true },
          },
        },
      },
      education: { orderBy: { created_at: "asc" } },
      languages: { orderBy: { created_at: "asc" } },
    },
  });

  if (!profile) return null;

  const certifications = profile.person?.user_id
    ? await prisma.certification.findMany({
        where: { user_id: profile.person.user_id },
        orderBy: [{ issued_on: "desc" }, { year: "desc" }, { name: "asc" }],
      })
    : [];

  const isOwner =
    opts.viewerUserId != null && profile.person.user_id === opts.viewerUserId;
  if (
    !isOwner &&
    !isMarketplaceVisible({
      ...profile,
      meetsRequired: providerMeetsRequired(profile),
    })
  ) {
    return null;
  }

  // brief_V — the sellable catalog. PUBLISHED only, for the owner too: what a
  // provider sees here is exactly what a buyer sees, so a draft can never look
  // live. Drafts are managed at /settings/packages.
  const packages = await listPublishedServiceProducts(profile.id);

  const isPlus = await viewerIsPlus(opts.viewer ?? null);
  // Staff see unredacted client names — they arbitrate validation disputes and
  const isAdmin = Boolean(opts.viewer?.isSystemAdmin);

  const { showSurname } = identityVisibility({ isOwner, isAdmin });

  const experience = experienceLabel([
    ...profile.employers.map((e) => ({
      start: e.start_date,
      end: e.end_date,
      isCurrent: e.is_current,
    })),
    ...profile.projects.map((pr) => ({
      start: pr.start_date,
      end: pr.end_date,
      isCurrent: pr.is_current,
    })),
  ]);
  const gateContact = (email: string | null | undefined) =>
    contactVisibility({ isOwner, isPlus, contactEmail: email });

  const addr = profile.person.site?.addresses?.[0] ?? null;
  const location = formatLocality({ city: addr?.city, state: addr?.state });
  // The hero's meta rail (WS3, mockup pg1) shows Country on its own line, and
  // the primary LANGUAGE — the first one listed, which is the order the
  // provider entered them in.
  const lastImport = isOwner
    ? await prisma.profileImport.findFirst({
        where: { provider_profile_id: profile.id, raw_text: { not: null } },
        orderBy: { created_at: "desc" },
        select: { created_at: true },
      })
    : null;

  const country = countryName(addr?.country_code, addr?.country)?.trim() || null;
  const primaryLanguage = profile.languages[0]?.name ?? null;

  return {
    id: profile.id,
    isOwner,
    validated: profile.validation_status === "VALIDATED",
    openForMentoring: profile.open_for_mentoring,
    visible: isMarketplaceVisible({
      ...profile,
      meetsRequired: providerMeetsRequired(profile),
    }),
    viewerIsPlus: isPlus,
    completeness: profile.completeness,
    visibilityThreshold: VISIBILITY_THRESHOLD,
    resumeRerun: {
      available: aiExtractionAvailable() && Boolean(lastImport),
      lastParseAt: lastImport?.created_at?.toISOString() ?? null,
    },
    missingRequired: missingRequired({
      headline: profile.person.title,
      role_type_id: profile.role_type_id,
      skills: profile.skills,
      photoUrl: profile.person.photo_url,
      hasAddress: (profile.person.site?.addresses?.length ?? 0) > 0,
      hasPhone: Boolean(profile.person.phone?.trim()),
      hourly_rate_cents: profile.hourly_rate_cents,
      rate_min_cents: profile.rate_min_cents,
      rate_max_cents: profile.rate_max_cents,
      onsite_rate_cents: profile.onsite_rate_cents,
      remote_rate_cents: profile.remote_rate_cents,
    }),
    enrichmentGaps: profileEnrichmentGaps({
      employers: profile.employers.length,
      projects: profile.projects.length,
      certifications: certifications.length,
      education: profile.education.length,
      specializations: profile.specializations.length,
    }),
    paused: profile.paused_at != null,
    previewHidden: profile.preview_hidden_at != null,
    publicName: profile.public_name_at != null,
    publicUrl: null as string | null,
    published: profile.onboarding_completed_at != null,
    daysSinceUpdate: isOwner
      ? Math.floor(
          (Date.now() - profile.updated_at.getTime()) / (1000 * 60 * 60 * 24)
        )
      : null,

    identityMasked: !showSurname,
    person: {
      firstName: profile.person.first_name,
      lastName: showSurname ? profile.person.last_name : "",
      title: profile.person.title,
      photoUrl: profile.person.photo_url,
      memberSince: profile.person.created_at.toISOString(),
      userId: profile.person.user_id,
      personId: profile.person.id,
    },
    location,
    country,
    primaryLanguage,
    experience,
    headline: profile.person.title ?? "",
    overview: profile.overview,
    field:
      profile.roleType && profile.pillar
        ? { role: roleLong(profile.roleType.name), domain: profile.pillar.name }
        : null,
    rates: opts.previewAsPeer || !canSeeRate({ isOwner, viewer: opts.viewer })
      ? null
      : {
      currency: profile.currency,
      hourlyCents: profile.hourly_rate_cents,
      // WS0/E078c — the advertised RANGE. Falls back to the legacy single rate
      // so a profile saved before the migration still shows something.
      minCents: profile.rate_min_cents ?? profile.hourly_rate_cents,
      maxCents: profile.rate_max_cents ?? profile.hourly_rate_cents,
      onsiteCents: profile.onsite_rate_cents,
      remoteCents: profile.remote_rate_cents,
      columns: [
        { key: "onsite", label: "Onsite rate", cents: profile.onsite_rate_cents },
        { key: "remote", label: "Offsite rate", cents: profile.remote_rate_cents },
      ] as { key: string; label: string; cents: number | null }[],
    },
    serviceFeeBps: profile.service_fee_bps,
    isRecruiter: isRecruiterProfile(profile),
    rating: profile.rating === null ? null : Number(profile.rating),

    accountHealth: {
      canSignIn: true,
      receivesMessages: profile.available_for_messages,
      statusActive: profile.status === "ACTIVE",
      emailVerified: profile.person.user?.email_verified != null,
    },

    verifications: {
      emailVerified: profile.person.user?.email_verified != null,
      // "verified", so the badge never overstates what we actually checked.
      phoneOnFile: Boolean(profile.person.phone?.trim()),
      phoneVerified: profile.person.phone_verified_at != null,
    },

    skills: shownSkills(
      selectedRoleIds(profile),
      profile.skills,
      (s) => s.skill.role_type_id
    ).map((s) => ({
      id: s.skill.id,
      name: s.skill.name,
      pillar: s.skill.pillar?.name ?? null,
    })),
    specializations: profile.specializations.map((s) => ({
      id: s.specialization.id,
      name: s.specialization.name,
      kind: s.specialization.kind,
    })),

    packages: packages.map((pk) => ({
      id: pk.id,
      title: pk.title,
      summary: pk.summary,
      durationWeeks: pk.durationWeeks,
      priceCents: pk.priceCents,
      currency: pk.currency,
      coverImageUrl: pk.coverImageUrl,
      deliverables: pk.deliverables,
      milestones: pk.milestones,
    })),

    // brief_project_model_v2 — the full card payload. `clientName` is sent as
    // stored; the REDACTION is applied at render (see `ProjectCard`), so the
    // one rule lives in one place and the future Plus tier can lift it without
    // touching every query.
    projects: profile.projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      url: p.url,
      imageUrl: p.image_url,
      employer: p.employer?.name ?? null,
      startDate: p.start_date ? p.start_date.toISOString().slice(0, 10) : null,
      endDate: p.end_date ? p.end_date.toISOString().slice(0, 10) : null,
      isCurrent: p.is_current,
      ...clientNameVisibility({
        visibility: p.client_visibility,
        isOwner,
        isPlus,
        isAdmin,
        clientName: p.client_name,
      }),
      clientVisibility: p.client_visibility,
      codeName: p.code_name,
      validationStatus: p.validation_status,
      validatedAt: p.validations[0]?.responded_at?.toISOString() ?? null,
      highlights: p.highlights,
      videoUrl: p.video_url,
      documentName: p.document_name,
      logoUrl: p.logo_url,
      roleType: p.roleType ? { id: p.roleType.id, name: p.roleType.name } : null,
      industry: p.industry ? { id: p.industry.id, name: p.industry.name } : null,
      applications: p.applications.map((a) => a.application),
      outcomes: p.outcomes.map((o) => ({ id: o.id, label: o.label, value: o.value })),
      artifacts: p.artifacts.map(toArtifactView),
      ...gateContact(p.contact_email),
    })),
    // WorkExperience rendering is gone.
    employers: profile.employers.map((e) => ({
      id: e.id,
      name: e.name,
      roleTitle: e.role_title,
      validated: e.validation_status === "VALIDATED",
      validationPending: e.validation_status === "PENDING",
      validatedAt: e.validations?.[0]?.responded_at?.toISOString() ?? null,
      validatedBy: e.validations?.[0]
        ? e.validations[0].confirmed_by_person_id
          ? ("colleague" as const)
          : ((e.validations[0].contact_email.split("@").pop() ?? null) as string | null)
        : null,
      location: e.location,
      logoUrl: e.logo_url,
      isCurrent: e.is_current,
      description: e.description,
      startDate: e.start_date ? e.start_date.toISOString().slice(0, 10) : null,
      endDate: e.end_date ? e.end_date.toISOString().slice(0, 10) : null,
      artifacts: e.artifacts.map(toArtifactView),
      ...gateContact(e.contact_email),
      projects: e.projects.map((pr) => ({
        id: pr.id,
        name: pr.name,
        description: pr.description,
      })),
    })),
    certifications: certifications.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      year: c.year,
      issuedFrom: c.issued_from,
      issuedOn: c.issued_on ? c.issued_on.toISOString().slice(0, 10) : null,
      expiresOn: c.expires_on ? c.expires_on.toISOString().slice(0, 10) : null,
      credentialId: c.credential_id,
      url: c.url,
      attachmentName: c.attachment_name,
      notes: c.notes,
    })),
    education: profile.education.map((e) => ({
      id: e.id,
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      startYear: e.start_year,
      endYear: e.end_year ?? e.year,
    })),
    languages: profile.languages.map((l) => ({
      id: l.id,
      name: l.name,
      level: l.level,
      proficiency: l.proficiency,
    })),
  };
}

export type ProviderProfileView = NonNullable<
  Awaited<ReturnType<typeof getProviderProfileView>>
>;

/** The signed-in provider's own profile view, or null if they aren't one. */
export async function getOwnProviderProfileView(
  userId: string,
  viewer?: import("@/lib/access").Viewer | null
) {
  const profile = await prisma.providerProfile.findFirst({
    where: { person: { user_id: userId } },
    select: { id: true },
  });
  if (!profile) return null;
  return getProviderProfileView(profile.id, { viewerUserId: userId, viewer });
}
