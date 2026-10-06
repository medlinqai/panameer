import { roleLong } from "@/lib/role-labels";
import { prisma } from "@/lib/prisma";
import { countryColumns } from "@/lib/country";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { NOTIFICATION_CATEGORIES, findCategory } from "@/lib/notification-categories";
import { w9Signature } from "@/lib/w9";
import type { TaxType } from "@prisma/client";
import { formFor } from "@/lib/tax";
import { saveProviderAddress } from "@/lib/onboarding";

export class SettingsError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "INVALID" | "GATED") {
    super(message);
    this.name = "SettingsError";
  }
}

async function ownPersonId(viewer: Viewer): Promise<string> {
  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new SettingsError("This account has no person record", "NOT_FOUND");
  return person.id;
}

async function ownIds(viewer: Viewer) {
  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true, person_id: true },
  });
  if (!profile) throw new SettingsError("No provider profile", "NOT_FOUND");
  return { profileId: profile.id, personId: profile.person_id };
}

export async function getContactInfo(viewer: Viewer) {
  const personId = await ownPersonId(viewer);
  const person = await prisma.person.findUniqueOrThrow({
    where: { id: personId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      phone: true,
      time_zone: true,
      user: { select: { id: true, email: true } },
      company: { select: { id: true, name: true } },
      site: {
        select: {
          addresses: {
            orderBy: { created_at: "asc" },
            take: 1,
            select: { line1: true, line2: true, city: true, state: true, postal_code: true, country: true },
          },
        },
      },
    },
  });

  return {
    userId: person.id,
    firstName: person.first_name,
    lastName: person.last_name,
    email: person.user?.email ?? null,
    phone: person.phone,
    timeZone: person.time_zone,
    company: person.company,
    address: (() => {
      const a = person.site?.addresses?.[0];
      return {
        country: a?.country ?? "",
        line1: a?.line1 ?? "",
        line2: a?.line2 ?? "",
        city: a?.city ?? "",
        state: a?.state ?? "",
        postalCode: a?.postal_code ?? "",
      };
    })(),
  };
}

export async function updateContactInfo(
  viewer: Viewer,
  patch: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    timeZone?: string | null;
    address?: {
      country?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    };
  }
) {
  const personId = await ownPersonId(viewer);
  if (patch.address !== undefined) {
    await saveProviderAddress(personId, patch.address as never);
  }
  await prisma.person.update({
    where: { id: personId },
    data: {
      ...(patch.firstName !== undefined ? { first_name: patch.firstName.trim().slice(0, 80) } : {}),
      ...(patch.lastName !== undefined ? { last_name: patch.lastName.trim().slice(0, 80) } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone?.trim().slice(0, 40) || null } : {}),
      ...(patch.timeZone !== undefined ? { time_zone: patch.timeZone?.trim().slice(0, 60) || null } : {}),
    },
  });
}

export async function getProfileSettings(viewer: Viewer) {
  const { profileId } = await ownIds(viewer);
  const p = await prisma.providerProfile.findUniqueOrThrow({
    where: { id: profileId },
    select: {
      paused_at: true,
      completeness: true,
      project_preference: true,
      earnings_private: true,
      ai_training_opt_in: true,
      linked_github: true,
      linked_stackoverflow: true,
      roles: { select: { roleType: { select: { id: true, name: true } } } },
      skills: {
        select: {
          skill: {
            select: {
              id: true,
              name: true,
              roleType: { select: { name: true } },
              pillar: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return {
    paused: p.paused_at != null,
    completeness: p.completeness,
    projectPreference: p.project_preference,
    earningsPrivate: p.earnings_private,
    aiTrainingOptIn: p.ai_training_opt_in,
    linkedGithub: p.linked_github,
    linkedStackoverflow: p.linked_stackoverflow,
    roles: p.roles.map((r) => roleLong(r.roleType.name)),
    categories: p.skills.map((s) => ({
      id: s.skill.id,
      skill: s.skill.name,
      role: roleLong(s.skill.roleType?.name ?? null),
      domain: s.skill.pillar?.name ?? null,
    })),
  };
}

export async function updateProfileSettings(
  viewer: Viewer,
  patch: {
    paused?: boolean;
    projectPreference?: "ANY" | "SHORT_TERM" | "LONG_TERM" | "CONTRACT_TO_HIRE" | null;
    earningsPrivate?: boolean;
    previewHidden?: boolean;
    publicName?: boolean;
    linkedGithub?: string | null;
    linkedStackoverflow?: string | null;
  }
) {
  const { profileId } = await ownIds(viewer);
  await prisma.providerProfile.update({
    where: { id: profileId },
    data: {
      ...(patch.paused !== undefined
        ? { paused_at: patch.paused ? new Date() : null }
        : {}),
      ...(patch.projectPreference !== undefined
        ? { project_preference: patch.projectPreference }
        : {}),
      ...(patch.earningsPrivate !== undefined
        ? { earnings_private: patch.earningsPrivate }
        : {}),
      ...(patch.previewHidden !== undefined
        ? { preview_hidden_at: patch.previewHidden ? new Date() : null }
        : {}),
      ...(patch.publicName !== undefined
        ? { public_name_at: patch.publicName ? new Date() : null }
        : {}),
      ...(patch.linkedGithub !== undefined
        ? { linked_github: handle(patch.linkedGithub) }
        : {}),
      ...(patch.linkedStackoverflow !== undefined
        ? { linked_stackoverflow: handle(patch.linkedStackoverflow) }
        : {}),
    },
  });
}

/** Accept a URL or a bare handle; store the handle. */
function handle(raw: string | null): string | null {
  const v = raw?.trim();
  if (!v) return null;
  const last = v.replace(/\/+$/, "").split("/").pop() ?? v;
  return last.replace(/^@/, "").slice(0, 60) || null;
}

export async function listBillingMethods(viewer: Viewer) {
  const personId = await ownPersonId(viewer);
  return prisma.billingMethod.findMany({
    where: { person_id: personId },
    orderBy: [{ is_default: "desc" }, { created_at: "asc" }],
  });
}

export async function addBillingMethod(
  viewer: Viewer,
  input: { kind: "CARD" | "PAYPAL" | "BANK_DEBIT"; label: string; last4?: string | null }
) {
  const personId = await ownPersonId(viewer);
  const count = await prisma.billingMethod.count({ where: { person_id: personId } });
  return prisma.billingMethod.create({
    data: {
      person_id: personId,
      kind: input.kind,
      label: input.label.trim().slice(0, 80),
      last4: digits(input.last4, 4),
      // First one in is the default; there is no meaningful alternative.
      is_default: count === 0,
    },
  });
}

export async function removeBillingMethod(viewer: Viewer, id: string) {
  const personId = await ownPersonId(viewer);
  // Owner scope enforced in the WHERE, so a foreign id deletes nothing.
  await prisma.billingMethod.deleteMany({ where: { id, person_id: personId } });
}

export async function getWithdrawals(viewer: Viewer) {
  const personId = await ownPersonId(viewer);
  const [tax, methods] = await Promise.all([
    prisma.taxProfile.findUnique({ where: { person_id: personId } }),
    prisma.payoutMethod.findMany({
      where: { person_id: personId },
      orderBy: [{ is_default: "desc" }, { created_at: "asc" }],
    }),
  ]);
  return { tax, methods };
}

export async function logTaxFormAccess(
  viewer: Viewer,
  form: "W9" | "W8BEN" | "W8BENE",
  action: "VIEW" | "SUBMIT"
) {
  try {
    const personId = await ownPersonId(viewer);
    await prisma.taxFormAccess.create({
      data: { person_id: personId, form, action },
    });
  } catch (e) {
    console.error(
      `tax form access log failed (${form}/${action})`,
      e instanceof Error ? e.message : "unknown"
    );
  }
}

export async function saveTaxProfile(
  viewer: Viewer,
  input: {
    legalName: string;
    country: string;
    asEntity: boolean;
    tinLast4?: string | null;
    signedName: string;
    tinKind?: "EIN" | "SSN" | null;
    classification?: TaxType | null;
  }
) {
  const personId = await ownPersonId(viewer);
  const form = formFor(input.country, input.asEntity);

  // THE CERTIFICATION IS STORED AS TEXT, NOT AS A FLAG ( WS-3)
  const cert = form === "W9" ? w9Signature(input.signedName) : null;

  const data = {
    form,
    legal_name: input.legalName.trim().slice(0, 160),
    // BOTH COLUMNS ( WS-C) — `country` is NOT NULL here too, and it is what
    country: countryColumns(input.country).country ?? input.country.trim().slice(0, 80),
    country_code: countryColumns(input.country).country_code,
    /* LAST FOUR ONLY. The full TIN is not stored — see the schema note. */
    tin_last4: digits(input.tinLast4, 4),
    tin_kind: input.tinKind ?? null,
    classification: input.classification ?? null,
    signed_name: input.signedName.trim().slice(0, 160),
    signed_at: new Date(),
    certification_text: cert?.certificationText ?? null,
    certification_version: cert?.certificationVersion ?? null,
    certified_at: cert?.certifiedAt ?? null,
  };
  const saved = await prisma.taxProfile.upsert({
    where: { person_id: personId },
    update: data,
    create: { person_id: personId, ...data },
  });
  await logTaxFormAccess(viewer, form, "SUBMIT");
  return saved;
}

export async function addPayoutMethod(
  viewer: Viewer,
  input: { kind: "BANK_ACCOUNT" | "PAYPAL" | "WIRE"; label: string; last4?: string | null; country: string }
) {
  const personId = await ownPersonId(viewer);

  // THE MONEY GATE. A payout method cannot exist before a tax profile does.
  const tax = await prisma.taxProfile.findUnique({
    where: { person_id: personId },
    select: { id: true },
  });
  if (!tax) {
    throw new SettingsError(
      "Add your tax details before adding a withdrawal method.",
      "GATED"
    );
  }

  const count = await prisma.payoutMethod.count({ where: { person_id: personId } });
  return prisma.payoutMethod.create({
    data: {
      person_id: personId,
      kind: input.kind,
      label: input.label.trim().slice(0, 80),
      last4: digits(input.last4, 4),
      // BOTH COLUMNS ( WS-C) — AND `country` IS NOT NULL ON THIS MODEL, so the raw
      country: countryColumns(input.country).country ?? input.country.trim().slice(0, 80),
      country_code: countryColumns(input.country).country_code,
      is_default: count === 0,
    },
  });
}

export async function removePayoutMethod(viewer: Viewer, id: string) {
  const personId = await ownPersonId(viewer);
  await prisma.payoutMethod.deleteMany({ where: { id, person_id: personId } });
}

/* ---- Identity Verification (E019) ---------------------------------------- */

export async function getIdentity(viewer: Viewer) {
  const personId = await ownPersonId(viewer);
  return prisma.identityVerification.findUnique({ where: { person_id: personId } });
}

export async function submitIdentity(viewer: Viewer, document: string) {
  const personId = await ownPersonId(viewer);
  const data = {
    status: "SUBMITTED" as const,
    document: document.trim().slice(0, 80),
    submitted_at: new Date(),
    reviewed_at: null,
    note: null,
  };
  return prisma.identityVerification.upsert({
    where: { person_id: personId },
    update: data,
    create: { person_id: personId, ...data },
  });
}

/* ---- Notification Settings (E020) ---------------------------------------- */

export async function getNotificationPrefs(viewer: Viewer) {
  const personId = await ownPersonId(viewer);
  const rows = await prisma.notificationPreference.findMany({
    where: { person_id: personId },
  });
  const byKey = new Map(rows.map((r) => [r.category, r]));

  // AN ABSENT ROW MEANS THE DECLARED DEFAULT, resolved here rather than
  return NOTIFICATION_CATEGORIES.map((c) => {
    const row = byKey.get(c.key);
    return {
      key: c.key,
      inApp: row?.in_app ?? c.defaults.inApp,
      email: row?.email ?? c.defaults.email,
      sms: row?.sms ?? c.defaults.sms,
      // IS THIS A CHOICE, OR JUST THE DEFAULT? , ruling 34d)
      isDefault: row === undefined,
    };
  });
}

export async function setNotificationPref(
  viewer: Viewer,
  category: string,
  channels: { inApp?: boolean; email?: boolean; sms?: boolean }
) {
  const personId = await ownPersonId(viewer);
  const def = findCategory(category);
  if (!def) throw new SettingsError("Unknown notification category", "INVALID");
  if (def.locked) {
    throw new SettingsError("That notification can't be switched off.", "GATED");
  }

  const existing = await prisma.notificationPreference.findUnique({
    where: { person_id_category: { person_id: personId, category } },
  });
  const base = {
    in_app: existing?.in_app ?? def.defaults.inApp,
    email: existing?.email ?? def.defaults.email,
    sms: existing?.sms ?? def.defaults.sms,
  };
  const next = {
    in_app: channels.inApp ?? base.in_app,
    email: channels.email ?? base.email,
    sms: channels.sms ?? base.sms,
  };

  await prisma.notificationPreference.upsert({
    where: { person_id_category: { person_id: personId, category } },
    update: next,
    create: { person_id: personId, category, ...next },
  });
}

/** Keep only digits, keep only the last `n`. Used for display-only remnants. */
function digits(raw: string | null | undefined, n: number): string | null {
  const d = (raw ?? "").replace(/\D/g, "");
  return d ? d.slice(-n) : null;
}

/* ---- The settings landing page's status lines (ruling 77) ---------------- */

/** WHAT EACH SECTION NEEDS FROM THE MEMBER, OR `null` */
export async function getSettingsStatuses(
  viewer: Viewer
): Promise<Record<string, string | null>> {
  const personId = await ownPersonId(viewer);

  // THE `providerProfile` READ WENT WITH THE `/settings/profile` STATUS
  const [person, twoFactor, identity, tax, payouts, billing] = await Promise.all([
    prisma.person.findUnique({
      where: { id: personId },
      select: { phone: true, site: { select: { addresses: { select: { line1: true }, take: 1 } } } },
    }),
    // KEYED ON THE USER, because two-step is an AUTH fact and
    prisma.twoFactorSetting.findUnique({
      where: { user_id: viewer.userId },
      select: { confirmed_at: true },
    }),
    prisma.identityVerification.findUnique({
      where: { person_id: personId },
      select: { status: true },
    }),
    prisma.taxProfile.findUnique({ where: { person_id: personId }, select: { id: true } }),
    prisma.payoutMethod.count({ where: { person_id: personId } }),
    prisma.billingMethod.count({ where: { person_id: personId } }),
  ]);

  const hasPhone = Boolean(person?.phone?.trim());
  const hasAddress = Boolean(person?.site?.addresses?.[0]?.line1?.trim());
  // NAMES WHAT IS MISSING, because that is what a landing page is for. When
  const contact = !hasPhone && !hasAddress
    ? "No phone or address yet"
    : !hasPhone
      ? "No phone yet"
      : !hasAddress
        ? "No address yet"
        : "Phone and address on file";

  // THE IDV STATUS IS THE COLUMN'S OWN ENUM, mapped to the member's words.
  const idv = identity?.status ?? "NOT_STARTED";
  const identityLine =
    idv === "VERIFIED" ? "Verified" : idv === "SUBMITTED" ? "In review" : "Not started";

  return {
    "/settings/contact": contact,
    // REFUSED — see the docblock. No plan column, and "renews" is a money
    "/settings/membership": null,
    // Visibility lives on `/profile` now, so there is no card to status.
    "/settings/billing": billing === 0 ? "No payment method yet" : `${billing} on file`,
    // THE SECTION IS *"How Panameer pays you, AND the tax details required
    "/settings/withdrawals": !tax
      ? "Tax details needed first"
      : payouts === 0
        ? "No payout method yet"
        : "Tax details and payout method on file",
    "/settings/security": twoFactor?.confirmed_at ? "Two-step on" : "Two-step off",
    "/settings/identity": identityLine,
    // REFUSED — ruling 13 ships every category ON, so this would read the
    "/settings/notifications": null,
  };
}
