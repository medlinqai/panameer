import { prisma } from "@/lib/prisma";
import { isMarketplaceVisible } from "@/lib/access";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";
import { listPublishedPackages } from "@/lib/packages";
import { toView as toArtifactView } from "@/lib/artifacts";
import { viewerIsPlus, contactVisibility, clientNameVisibility } from "@/lib/plus";
import { experienceLabel } from "@/lib/experience";

/**
 * The full provider Profile View (brief_S / E037) — the Upwork-style page that
 * REPLACES the thin dashboard as the provider's home.
 *
 * Owner-first: this is the surface a provider lands on after publishing, so the
 * OWNER always sees it regardless of the visibility gate, and gets the
 * completeness / visibility banner. Everyone else sees it only when the profile
 * is marketplace-visible (brief_K) — the gate is unchanged, just applied here
 * too so a hidden profile can never leak through the new page.
 */
export async function getProviderProfileView(
  profileId: string,
  opts: {
    viewerUserId?: string;
    /** Full viewer, when available — needed for the WS5 Plus gate. */
    viewer?: import("@/lib/access").Viewer | null;
  } = {}
) {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    include: {
      person: {
        select: {
          user_id: true,
          first_name: true,
          last_name: true,
          title: true,
          photo_url: true,
          phone: true,
          phone_verified_at: true,
          site: {
            select: {
              addresses: {
                select: { city: true, state: true, country: true },
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
        include: { skill: { select: { id: true, name: true } } },
      },
      specializations: {
        include: { specialization: { select: { id: true, name: true, kind: true } } },
      },
      employers: {
        orderBy: [{ sort_order: "asc" }, { is_current: "desc" }, { start_date: "desc" }],
        include: {
          artifacts: { orderBy: [{ sort_order: "asc" }] },
          projects: { orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] },
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
      certifications: {
        orderBy: [{ issued_on: "desc" }, { year: "desc" }, { name: "asc" }],
      },
      education: { orderBy: { created_at: "asc" } },
      languages: { orderBy: { created_at: "asc" } },
    },
  });

  if (!profile) return null;

  const isOwner =
    opts.viewerUserId != null && profile.person.user_id === opts.viewerUserId;
  if (!isOwner && !isMarketplaceVisible(profile)) return null;

  // brief_V — the sellable catalog. PUBLISHED only, for the owner too: what a
  // provider sees here is exactly what a buyer sees, so a draft can never look
  // live. Drafts are managed at /settings/packages.
  const packages = await listPublishedPackages(profile.id);

  /**
   * WS5 — the Plus gate is applied HERE, at the read, so a non-Plus viewer's
   * payload simply does not contain the contact address. See lib/plus.ts.
   */
  const isPlus = await viewerIsPlus(opts.viewer ?? null);
  // Staff see unredacted client names — they arbitrate validation disputes and
  // cannot do that against a record with the client removed (E114).
  const isAdmin = Boolean(opts.viewer?.isSystemAdmin);

  /**
   * WS6 (E068) — years of experience DERIVED from the work history, as the union
   * of employer and project spans. Replaces the self-reported level entirely.
   */
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
  const location =
    [addr?.city, addr?.state, addr?.country].filter(Boolean).join(", ") || null;
  // The hero's meta rail (WS3, mockup pg1) shows Country on its own line, and
  // the primary LANGUAGE — the first one listed, which is the order the
  // provider entered them in.
  const country = addr?.country?.trim() || null;
  const primaryLanguage = profile.languages[0]?.name ?? null;

  return {
    id: profile.id,
    isOwner,
    validated: profile.validation_status === "VALIDATED",
    visible: isMarketplaceVisible(profile),
    viewerIsPlus: isPlus,
    completeness: profile.completeness,
    visibilityThreshold: VISIBILITY_THRESHOLD,
    paused: profile.paused_at != null,
    published: profile.onboarding_completed_at != null,

    person: {
      firstName: profile.person.first_name,
      lastName: profile.person.last_name,
      title: profile.person.title,
      photoUrl: profile.person.photo_url,
    },
    location,
    country,
    primaryLanguage,
    experience,
    headline: profile.headline,
    overview: profile.overview,
    field:
      profile.roleType && profile.pillar
        ? { role: profile.roleType.name, domain: profile.pillar.name }
        : null,
    /*
      WS9 / E006(3) — THE RATE IS DATA-DRIVEN, verified rather than assumed.
      Every figure below is read off the profile row. The $90/$125 that appeared
      on every profile during the walk came from the SEED writing 12500 to each
      demo record, not from a constant here: grouping the live table gives eight
      distinct rate tuples (8500, 9900, 10000, 10500, 12000, 12500, 13000,
      14000), which a hardcode could not produce.
    */
    rates: {
      currency: profile.currency,
      hourlyCents: profile.hourly_rate_cents,
      // WS0/E078c — the advertised RANGE. Falls back to the legacy single rate
      // so a profile saved before the migration still shows something.
      minCents: profile.rate_min_cents ?? profile.hourly_rate_cents,
      maxCents: profile.rate_max_cents ?? profile.hourly_rate_cents,
      onsiteCents: profile.onsite_rate_cents,
      remoteCents: profile.remote_rate_cents,
    },
    serviceFeeBps: profile.service_fee_bps,
    rating: profile.rating === null ? null : Number(profile.rating),

    verifications: {
      emailVerified: profile.person.user?.email_verified != null,
      // brief_S/E036 stubbed SMS; a number on file shows as "on file", not
      // "verified", so the badge never overstates what we actually checked.
      phoneOnFile: Boolean(profile.person.phone?.trim()),
      phoneVerified: profile.person.phone_verified_at != null,
    },

    skills: profile.skills.map((s) => ({
      id: s.skill.id,
      name: s.skill.name,
    })),
    specializations: profile.specializations.map((s) => ({
      id: s.specialization.id,
      name: s.specialization.name,
      kind: s.specialization.kind,
    })),

    // E045 — the offerings a buyer can buy, not past work.
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

    // --- E037 portfolio entities ------------------------------------------
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
      /*
        E114 — the real client name is REDACTED HERE, at the read, not hidden at
        render. It was emitted unconditionally: `clientLabel()` correctly showed
        the code name for a CONFIDENTIAL project, but the real one still travelled
        in the payload, so it was one View-Source away on a public page. A
        confidentiality setting that survives only as long as nobody looks at the
        network tab is not a confidentiality setting.

        Same principle as the WS5 validation-contact gate: the name must not leave
        the server for a viewer who may not see it.
      */
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
    // E042 — Employer is the ONE work-history model; the duplicate flat
    // WorkExperience rendering is gone.
    employers: profile.employers.map((e) => ({
      id: e.id,
      name: e.name,
      roleTitle: e.role_title,
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
    // E044 — standalone; no employer anywhere.
    certifications: profile.certifications.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      year: c.year,
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
