import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { OnboardingError } from "@/lib/onboarding";

/**
 * Packages — the provider's sellable catalog (brief_V / E045).
 *
 * A Package is a productized, a-la-carte offering a buyer can buy today:
 * scope + deliverables + timeline + a FIXED price + payment terms. Standalone
 * on the provider, deliberately NOT hung off a past Project — a Project is
 * proof of work already delivered, a Package is something on sale.
 *
 * OWNER-SCOPED throughout: the profile comes from the session via
 * `ownedProviderProfile`, and every client-supplied id is ANDed with it, so a
 * foreign id resolves to nothing rather than to someone else's package.
 *
 * Deliberately does NOT touch completeness. Packages are optional and must
 * never affect the publish gate (brief_R/U invariant) — a provider with no
 * packages is still a complete, visible profile.
 */

/** Payment terms default to the shape Scott specified: 50% up front, 50% on completion. */
export const DEFAULT_MILESTONES = [
  { label: "Upfront", percent: 50, sequence: 0 },
  { label: "On completion", percent: 50, sequence: 1 },
];

export type MilestoneInput = { label: string; percent: number };

export type PackageInput = {
  title: string;
  summary?: string | null;
  deliverables?: string[];
  durationWeeks?: number | null;
  priceCents?: number | null;
  currency?: string | null;
  roleTypeId?: string | null;
  skillIds?: string[];
  coverImageUrl?: string | null;
  milestones?: MilestoneInput[];
};

async function ownedProfileId(viewer: Viewer): Promise<string> {
  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  if (!profile) {
    throw new OnboardingError("No provider profile for this user", "NOT_A_PROVIDER");
  }
  return profile.id;
}

const clean = (v?: string | null, max = 400) => {
  const s = (v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

const shape = (p: {
  id: string;
  title: string;
  summary: string | null;
  duration_weeks: number | null;
  pricing_type: string;
  price_cents: number | null;
  currency: string;
  cover_image_url: string | null;
  status: string;
  role_type_id: string | null;
  roleType?: { id: string; name: string } | null;
  deliverables: { id: string; text: string; sequence: number }[];
  milestones: { id: string; label: string; percent: number; sequence: number }[];
  skills?: { skill: { id: string; name: string } }[];
}) => ({
  id: p.id,
  title: p.title,
  summary: p.summary,
  durationWeeks: p.duration_weeks,
  pricingType: p.pricing_type,
  priceCents: p.price_cents,
  currency: p.currency,
  coverImageUrl: p.cover_image_url,
  status: p.status,
  roleTypeId: p.role_type_id,
  roleTypeName: p.roleType?.name ?? null,
  deliverables: p.deliverables
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((d) => ({ id: d.id, text: d.text })),
  milestones: p.milestones
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((m) => ({ id: m.id, label: m.label, percent: m.percent })),
  skills: (p.skills ?? []).map((s) => ({ id: s.skill.id, name: s.skill.name })),
});

const INCLUDE = {
  roleType: { select: { id: true, name: true } },
  deliverables: true,
  milestones: true,
  skills: { include: { skill: { select: { id: true, name: true } } } },
} as const;

/** Every package the owner has, draft and published. */
export async function listOwnPackages(viewer: Viewer) {
  const profileId = await ownedProfileId(viewer);
  const rows = await prisma.package.findMany({
    where: { provider_profile_id: profileId },
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    include: INCLUDE,
  });
  return rows.map(shape);
}

/**
 * Validate + normalize the payment terms.
 *
 * Percent-of-total (not amounts) so changing the price can never leave the
 * milestones disagreeing with it. They must sum to EXACTLY 100 — "90% up
 * front" with the remainder unaccounted for is a contract nobody can settle.
 */
function normalizeMilestones(input?: MilestoneInput[]) {
  const raw = (input ?? []).filter((m) => clean(m?.label));
  const list = raw.length > 0 ? raw : DEFAULT_MILESTONES;

  const milestones = list.map((m, i) => ({
    label: clean(m.label, 120)!,
    percent: Math.round(Number(m.percent)),
    sequence: i,
  }));

  for (const m of milestones) {
    if (!Number.isFinite(m.percent) || m.percent <= 0 || m.percent > 100) {
      throw new OnboardingError(
        `"${m.label}" must be between 1% and 100%.`,
        "INVALID"
      );
    }
  }

  const total = milestones.reduce((sum, m) => sum + m.percent, 0);
  if (total !== 100) {
    throw new OnboardingError(
      `Payment milestones must add up to 100% — they currently total ${total}%.`,
      "INVALID"
    );
  }
  return milestones;
}

function packageData(input: PackageInput) {
  const title = clean(input.title, 200);
  if (!title) throw new OnboardingError("A package needs a title", "INVALID");

  const price =
    input.priceCents == null || input.priceCents === ("" as unknown)
      ? null
      : Math.round(Number(input.priceCents));
  if (price != null && (!Number.isFinite(price) || price < 0)) {
    throw new OnboardingError("That price isn't valid", "INVALID");
  }

  const weeks =
    input.durationWeeks == null ? null : Math.round(Number(input.durationWeeks));
  if (weeks != null && (!Number.isFinite(weeks) || weeks < 0 || weeks > 520)) {
    throw new OnboardingError("That duration isn't valid", "INVALID");
  }

  return {
    title,
    summary: clean(input.summary, 4000),
    duration_weeks: weeks,
    price_cents: price,
    currency: clean(input.currency, 8) ?? "USD",
    cover_image_url: clean(input.coverImageUrl, 1000),
    role_type_id: input.roleTypeId || null,
  };
}

const deliverableRows = (input: PackageInput) =>
  (input.deliverables ?? [])
    .map((d) => clean(d, 500))
    .filter((d): d is string => Boolean(d))
    .slice(0, 30)
    .map((text, sequence) => ({ text, sequence }));

/** Skill tags, scoped to real catalog skills. Silently drops unknown ids. */
async function validSkillIds(ids?: string[]): Promise<string[]> {
  const wanted = (ids ?? []).slice(0, 20);
  if (wanted.length === 0) return [];
  const found = await prisma.skill.findMany({
    where: { id: { in: wanted } },
    select: { id: true },
  });
  return found.map((f) => f.id);
}

export async function createPackage(viewer: Viewer, input: PackageInput) {
  const profileId = await ownedProfileId(viewer);
  const milestones = normalizeMilestones(input.milestones);
  const skillIds = await validSkillIds(input.skillIds);
  const count = await prisma.package.count({
    where: { provider_profile_id: profileId },
  });

  const row = await prisma.package.create({
    data: {
      provider_profile_id: profileId,
      sort_order: count * 10,
      // New packages start as DRAFT so nothing half-written is ever public.
      status: "DRAFT",
      ...packageData(input),
      deliverables: { create: deliverableRows(input) },
      milestones: { create: milestones },
      skills: { create: skillIds.map((skill_id) => ({ skill_id })) },
    },
    select: { id: true },
  });
  return row.id;
}

export async function updatePackage(
  viewer: Viewer,
  packageId: string,
  input: PackageInput
) {
  const profileId = await ownedProfileId(viewer);
  const owned = await prisma.package.findFirst({
    where: { id: packageId, provider_profile_id: profileId },
    select: { id: true },
  });
  if (!owned) throw new OnboardingError("Package not found", "INVALID");

  const milestones = normalizeMilestones(input.milestones);
  const skillIds = await validSkillIds(input.skillIds);

  // Children are small owned sets the editor posts whole — replace them rather
  // than diffing, inside one transaction so a package can never be left with
  // milestones from one edit and deliverables from another.
  await prisma.$transaction([
    prisma.packageDeliverable.deleteMany({ where: { package_id: owned.id } }),
    prisma.packageMilestone.deleteMany({ where: { package_id: owned.id } }),
    prisma.packageSkill.deleteMany({ where: { package_id: owned.id } }),
    prisma.package.update({
      where: { id: owned.id },
      data: {
        ...packageData(input),
        deliverables: { create: deliverableRows(input) },
        milestones: { create: milestones },
        skills: { create: skillIds.map((skill_id) => ({ skill_id })) },
      },
    }),
  ]);
}

export async function deletePackage(viewer: Viewer, packageId: string) {
  const profileId = await ownedProfileId(viewer);
  const res = await prisma.package.deleteMany({
    where: { id: packageId, provider_profile_id: profileId },
  });
  if (res.count === 0) throw new OnboardingError("Package not found", "INVALID");
}

/**
 * Draft ⇄ Publish. Publishing is what puts a package in front of buyers, so it
 * requires the parts a buyer needs to make a decision — a nameless, priceless
 * package on the catalog would be worse than no package.
 */
export async function setPackageStatus(
  viewer: Viewer,
  packageId: string,
  status: "DRAFT" | "PUBLISHED"
) {
  const profileId = await ownedProfileId(viewer);
  const pkg = await prisma.package.findFirst({
    where: { id: packageId, provider_profile_id: profileId },
    include: { deliverables: true, milestones: true },
  });
  if (!pkg) throw new OnboardingError("Package not found", "INVALID");

  if (status === "PUBLISHED") {
    const missing: string[] = [];
    if (!pkg.title.trim()) missing.push("a title");
    if (pkg.price_cents == null) missing.push("a price");
    if (pkg.duration_weeks == null) missing.push("a duration");
    if (pkg.deliverables.length === 0) missing.push("at least one deliverable");
    if (missing.length > 0) {
      throw new OnboardingError(
        `Before publishing this package, add ${missing.join(", ")}.`,
        "INCOMPLETE"
      );
    }
    // Guards against a row that predates the validator or was edited oddly.
    const total = pkg.milestones.reduce((s, m) => s + m.percent, 0);
    if (pkg.milestones.length > 0 && total !== 100) {
      throw new OnboardingError(
        `Payment milestones must add up to 100% — they currently total ${total}%.`,
        "INVALID"
      );
    }
  }

  await prisma.package.update({ where: { id: pkg.id }, data: { status } });
}

/**
 * PUBLISHED packages for the buyer-facing catalog. Takes a profile id, not a
 * viewer — the profile page has already applied brief_K's visibility gate.
 */
export async function listPublishedPackages(profileId: string) {
  const rows = await prisma.package.findMany({
    where: { provider_profile_id: profileId, status: "PUBLISHED" },
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    include: INCLUDE,
  });
  return rows.map(shape);
}
