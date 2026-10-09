import { prisma } from "@/lib/prisma";
import type { PaymentTerms, PaymentTrigger } from "@prisma/client";
import { PAYMENT_TERMS_LABEL, PAYMENT_TRIGGER_LABEL } from "@/lib/billing-terms";
import { publishGate } from "@/lib/my-catalog";
import { solutionViolations } from "@/lib/catalog/solution-types";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { OnboardingError } from "@/lib/onboarding";
import { gapSentence, sellGaps } from "@/lib/gate-reads";

export const DEFAULT_MILESTONES = [
  { label: "Upfront", percent: 50, sequence: 0 },
  { label: "On completion", percent: 50, sequence: 1 },
];

export type MilestoneInput = { label: string; percent: number; trigger?: PaymentTrigger | null };

export type ServiceProductInput = {
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
  capabilityDomainIds?: string[];
  paymentTerms?: PaymentTerms | null;
  paymentTrigger?: PaymentTrigger | null;
  /** CAT-E003 wizard fields. */
  kind?: "DELIVERABLE" | "DEPLOYABLE" | "BLANKET" | null;
  pricingType?: "FIXED" | "RECURRING" | "NOT_TO_EXCEED" | null;
  billingPeriod?: "MONTHLY" | "ANNUAL" | null;
  coverCode?: string | null;
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
  payment_terms?: PaymentTerms | null;
  payment_trigger?: PaymentTrigger | null;
  kind?: string;
  billing_period?: string | null;
  cover_code?: string | null;
  cover_image_url: string | null;
  status: string;
  role_type_id: string | null;
  roleType?: { id: string; name: string } | null;
  deliverables: { id: string; text: string; sequence: number }[];
  milestones: { id: string; label: string; percent: number; sequence: number; trigger?: PaymentTrigger | null }[];
  skills?: { skill: { id: string; name: string } }[];
  capabilityDomains?: {
    capability_domain_id: string;
    capabilityDomain: { id: string; process: string; name: string };
  }[];
}) => ({
  id: p.id,
  title: p.title,
  summary: p.summary,
  durationWeeks: p.duration_weeks,
  pricingType: p.pricing_type,
  priceCents: p.price_cents,
  currency: p.currency,
  paymentTerms: p.payment_terms ?? null,
  paymentTrigger: p.payment_trigger ?? null,
  kind: p.kind ?? "DELIVERABLE",
  billingPeriod: p.billing_period ?? null,
  coverCode: p.cover_code ?? null,
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
    .map((m) => ({ id: m.id, label: m.label, percent: m.percent, trigger: m.trigger ?? null })),
  skills: (p.skills ?? []).map((s) => ({ id: s.skill.id, name: s.skill.name })),
  /* the saved selection, so re-opening the form shows what was chosen */
  capabilityDomainIds: (p.capabilityDomains ?? []).map((c) => c.capability_domain_id),
  process: (p.capabilityDomains ?? [])[0]?.capabilityDomain.process ?? null,
});

const INCLUDE = {
  roleType: { select: { id: true, name: true } },
  deliverables: true,
  milestones: true,
  skills: { include: { skill: { select: { id: true, name: true } } } },
  capabilityDomains: {
    include: { capabilityDomain: { select: { id: true, process: true, name: true } } },
  },
} as const;

export async function listCapabilityDomains() {
  return prisma.capabilityDomain.findMany({
    orderBy: [{ process: "asc" }, { sort_order: "asc" }, { name: "asc" }],
    select: { id: true, process: true, name: true, key: true },
  });
}

/** Every package the owner has, draft and published. */
export async function listOwnServiceProducts(viewer: Viewer) {
  const profileId = await ownedProfileId(viewer);
  const rows = await prisma.serviceProduct.findMany({
    where: { provider_profile_id: profileId },
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    include: INCLUDE,
  });
  return rows.map(shape);
}

function normalizeMilestones(input?: MilestoneInput[]) {
  const raw = (input ?? []).filter((m) => clean(m?.label));
  const list = raw.length > 0 ? raw : DEFAULT_MILESTONES;

  const milestones = list.map((m, i) => ({
    label: clean(m.label, 120)!,
    percent: Math.round(Number(m.percent)),
    sequence: i,
    trigger: (m as MilestoneInput).trigger && (m as MilestoneInput).trigger! in PAYMENT_TRIGGER_LABEL ? (m as MilestoneInput).trigger! : null,
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

function serviceProductData(input: ServiceProductInput) {
  const title = clean(input.title, 200);
  if (!title) throw new OnboardingError("A service product needs a title", "INVALID");

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
    payment_terms: input.paymentTerms && input.paymentTerms in PAYMENT_TERMS_LABEL ? input.paymentTerms : null,
    payment_trigger: input.paymentTrigger && input.paymentTrigger in PAYMENT_TRIGGER_LABEL ? input.paymentTrigger : null,
    ...(input.kind ? { kind: input.kind } : {}),
    ...(input.pricingType ? { pricing_type: input.pricingType } : {}),
    ...(input.pricingType ? { billing_period: input.pricingType === "RECURRING" ? input.billingPeriod ?? "MONTHLY" : null } : {}),
    ...(input.kind === "DEPLOYABLE" ? { duration_weeks: null } : {}),
    ...(input.coverCode !== undefined ? { cover_code: clean(input.coverCode, 4)?.toUpperCase() ?? null } : {}),
  };
}

const deliverableRows = (input: ServiceProductInput) =>
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
    // NO `status` FILTER HERE, DELIBERATELY . This
    where: { id: { in: wanted } },
    select: { id: true },
  });
  return found.map((f) => f.id);
}

/** Filters to capability domains that really exist. Mirrors `validSkillIds`, with one */
async function validCapabilityDomainIds(ids?: string[]): Promise<string[]> {
  const wanted = [...new Set(ids ?? [])].slice(0, 100);
  if (wanted.length === 0) return [];
  const found = await prisma.capabilityDomain.findMany({
    where: { id: { in: wanted } },
    select: { id: true },
  });
  return found.map((f) => f.id);
}

/** WHEN AT LEAST ONE DOMAIN IS REQUIRED — AND WHY IT IS NOT SIMPLY "ALWAYS". */
function requireDomains(resolved: string[], hadBefore: number, isCreate: boolean) {
  const mustHave = isCreate || hadBefore > 0;
  if (mustHave && resolved.length === 0) {
    throw new OnboardingError(
      "Pick at least one capability domain — it is how buyers find this product from their roadmap.",
      "INVALID"
    );
  }
}

export async function createServiceProduct(viewer: Viewer, input: ServiceProductInput) {
  const profileId = await ownedProfileId(viewer);
  const milestones = normalizeMilestones(input.milestones);
  const skillIds = await validSkillIds(input.skillIds);
  const domainIds = await validCapabilityDomainIds(input.capabilityDomainIds);
  requireDomains(domainIds, 0, true);
  const count = await prisma.serviceProduct.count({
    where: { provider_profile_id: profileId },
  });

  const row = await prisma.serviceProduct.create({
    data: {
      provider_profile_id: profileId,
      sort_order: count * 10,
      // New packages start as DRAFT so nothing half-written is ever public.
      status: "DRAFT",
      ...serviceProductData(input),
      deliverables: { create: deliverableRows(input) },
      milestones: { create: milestones },
      skills: { create: skillIds.map((skill_id) => ({ skill_id })) },
      capabilityDomains: {
        create: domainIds.map((capability_domain_id) => ({ capability_domain_id })),
      },
    },
    select: { id: true },
  });
  return row.id;
}

export async function updateServiceProduct(
  viewer: Viewer,
  serviceProductId: string,
  input: ServiceProductInput
) {
  const profileId = await ownedProfileId(viewer);
  const owned = await prisma.serviceProduct.findFirst({
    where: { id: serviceProductId, provider_profile_id: profileId },
    select: { id: true },
  });
  if (!owned) throw new OnboardingError("ServiceProduct not found", "INVALID");

  const milestones = normalizeMilestones(input.milestones);
  const skillIds = await validSkillIds(input.skillIds);
  const domainIds = await validCapabilityDomainIds(input.capabilityDomainIds);
  /* how many it had BEFORE this edit — that is what decides whether zero is allowed */
  const hadDomains = await prisma.serviceProductCapabilityDomain.count({
    where: { service_product_id: owned.id },
  });
  requireDomains(domainIds, hadDomains, false);

  // Children are small owned sets the editor posts whole — replace them rather
  // than diffing, inside one transaction so a package can never be left with
  // milestones from one edit and deliverables from another.
  await prisma.$transaction([
    prisma.serviceProductDeliverable.deleteMany({ where: { service_product_id: owned.id } }),
    prisma.serviceProductMilestone.deleteMany({ where: { service_product_id: owned.id } }),
    prisma.serviceProductSkill.deleteMany({ where: { service_product_id: owned.id } }),
    prisma.serviceProductCapabilityDomain.deleteMany({ where: { service_product_id: owned.id } }),
    prisma.serviceProduct.update({
      where: { id: owned.id },
      data: {
        ...serviceProductData(input),
        deliverables: { create: deliverableRows(input) },
        milestones: { create: milestones },
        skills: { create: skillIds.map((skill_id) => ({ skill_id })) },
        capabilityDomains: {
          create: domainIds.map((capability_domain_id) => ({ capability_domain_id })),
        },
      },
    }),
  ]);
}

export async function deleteServiceProduct(viewer: Viewer, serviceProductId: string) {
  const profileId = await ownedProfileId(viewer);
  const res = await prisma.serviceProduct.deleteMany({
    where: { id: serviceProductId, provider_profile_id: profileId },
  });
  if (res.count === 0) throw new OnboardingError("ServiceProduct not found", "INVALID");
}

/** Draft ⇄ Publish. Publishing is what puts a package in front of buyers, so it */
export async function setServiceProductStatus(
  viewer: Viewer,
  serviceProductId: string,
  status: "DRAFT" | "PUBLISHED"
) {
  const profileId = await ownedProfileId(viewer);
  const pkg = await prisma.serviceProduct.findFirst({
    where: { id: serviceProductId, provider_profile_id: profileId },
    include: { deliverables: true, milestones: true },
  });
  if (!pkg) throw new OnboardingError("ServiceProduct not found", "INVALID");

  if (status === "PUBLISHED") {
    // THE SELLER GATE RUNS FIRST, BEFORE THE PRODUCT GATE. The product checks
    const gaps = await sellGaps(viewer.userId);
    if (gaps.length > 0) {
      throw new OnboardingError(gapSentence(gaps), "GATE_UNMET", gaps);
    }
    // CAT-E004: no Panameer review — a validated seller company is the gate.
    const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
    if (!me || !(await publishGate(me.id)).ok) throw new OnboardingError("You can publish once your company is validated.", "GATE_UNMET");

    const missing: string[] = [];
    if (!pkg.title.trim()) missing.push("a title");
    if (pkg.price_cents == null) missing.push("a price");
    // CAT-E003: duration and deliverables describe a Deliverable; agents run and blankets draw down.
    if (pkg.kind === "DELIVERABLE" && pkg.duration_weeks == null) missing.push("a duration");
    if (pkg.kind === "DELIVERABLE" && pkg.deliverables.length === 0) missing.push("at least one deliverable");
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

  await prisma.serviceProduct.update({ where: { id: pkg.id }, data: { status } });
}

/** PUBLISHED packages for the buyer-facing catalog. Takes a profile id, not a */
export async function listPublishedServiceProducts(profileId: string) {
  const rows = await prisma.serviceProduct.findMany({
    where: { provider_profile_id: profileId, status: "PUBLISHED" },
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    include: INCLUDE,
  });
  return rows.map(shape);
}

/** CAT-E003/E004: the wizard's save — create or update, then publish when asked (validated company + the product checks). */
export async function saveServiceProductFromWizard(viewer: Viewer, id: string | null, input: ServiceProductInput, publish: boolean) {
  if (input.kind) {
    const pricing = input.pricingType ?? (input.kind === "DEPLOYABLE" ? "RECURRING" : input.kind === "BLANKET" ? "NOT_TO_EXCEED" : "FIXED");
    const bad = solutionViolations({ kind: input.kind, pricing_type: pricing, billing_period: pricing === "RECURRING" ? input.billingPeriod ?? "MONTHLY" : null, duration_weeks: input.kind === "DEPLOYABLE" ? null : input.durationWeeks ?? null, milestones: input.kind === "DEPLOYABLE" ? 0 : (input.milestones ?? []).length, deliverables: input.kind === "DEPLOYABLE" ? 0 : (input.deliverables ?? []).length });
    if (bad.length) throw new OnboardingError(bad[0], "INVALID");
    input = { ...input, pricingType: pricing, ...(input.kind === "DEPLOYABLE" ? { milestones: [], deliverables: [] } : {}) };
  }
  const savedId = id ? (await updateServiceProduct(viewer, id, input), id) : await createServiceProduct(viewer, input);
  if (publish) {
    const person = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
    const gate = person ? await publishGate(person.id) : null;
    if (!gate?.ok) throw new OnboardingError("You can publish once your company is validated.", "GATE_UNMET");
    await setServiceProductStatus(viewer, savedId, "PUBLISHED");
  } else if (id) await setServiceProductStatus(viewer, savedId, "DRAFT");
  return savedId;
}
