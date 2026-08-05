import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { NOTIFICATION_CATEGORIES, findCategory } from "@/lib/notification-categories";
import { formFor } from "@/lib/tax";

/**
 * Reads and writes for the Settings sub-pages (J2.4 WS-H / E014–E020).
 *
 * ONE MODULE, because every one of these pages does the same three things —
 * resolve the viewer's own records, hand a page a plain object, write a small
 * patch back — and eight copies of that would be eight chances to forget the
 * owner scope. Nothing here takes an id from a caller: the person and the
 * profile are both resolved from the session, every time.
 */

export class SettingsError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "INVALID" | "GATED") {
    super(message);
    this.name = "SettingsError";
  }
}

async function ownIds(viewer: Viewer) {
  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true, person_id: true },
  });
  if (!profile) throw new SettingsError("No provider profile", "NOT_FOUND");
  return { profileId: profile.id, personId: profile.person_id };
}

/* ---- Contact Info (E014) ------------------------------------------------ */

export async function getContactInfo(viewer: Viewer) {
  const { personId } = await ownIds(viewer);
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
      providerProfile: { select: { id: true } },
      buyerProfile: { select: { id: true } },
      requesterProfile: { select: { id: true } },
    },
  });

  return {
    /*
      The "User ID" the page shows is the PERSON id, not the auth user id.
      It is the identifier support will ask for, and exposing the auth row's
      primary key on a settings page is a gift to anyone doing reconnaissance.
    */
    userId: person.id,
    firstName: person.first_name,
    lastName: person.last_name,
    email: person.user?.email ?? null,
    phone: person.phone,
    timeZone: person.time_zone,
    company: person.company,
    memberships: {
      provider: !!person.providerProfile,
      buyer: !!person.buyerProfile,
      requester: !!person.requesterProfile,
    },
  };
}

export async function updateContactInfo(
  viewer: Viewer,
  patch: { firstName?: string; lastName?: string; phone?: string | null; timeZone?: string | null }
) {
  const { personId } = await ownIds(viewer);
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

/* ---- Profile Settings (E015) -------------------------------------------- */

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
    roles: p.roles.map((r) => r.roleType.name),
    /*
      CATEGORIES = PANAMEER'S OWN CATALOG (Confirm #2). Role → Domain → Skill,
      read from what this provider actually claimed, not a competitor's
      taxonomy. Read-only here on purpose: the catalog picker is a step in the
      wizard with its own filtering and its own 15-skill cap, and a second
      editor for the same data is how the two drift.
    */
    categories: p.skills.map((s) => ({
      id: s.skill.id,
      skill: s.skill.name,
      role: s.skill.roleType?.name ?? null,
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
    aiTrainingOptIn?: boolean;
    linkedGithub?: string | null;
    linkedStackoverflow?: string | null;
  }
) {
  const { profileId } = await ownIds(viewer);
  await prisma.providerProfile.update({
    where: { id: profileId },
    data: {
      /*
        VISIBILITY IS THE PAUSE, and it is the only lever here that touches the
        marketplace gate. `paused_at` is a timestamp rather than a boolean
        because "since when" is the useful question when a provider asks why
        they stopped getting work.
      */
      ...(patch.paused !== undefined
        ? { paused_at: patch.paused ? new Date() : null }
        : {}),
      ...(patch.projectPreference !== undefined
        ? { project_preference: patch.projectPreference }
        : {}),
      ...(patch.earningsPrivate !== undefined
        ? { earnings_private: patch.earningsPrivate }
        : {}),
      ...(patch.aiTrainingOptIn !== undefined
        ? { ai_training_opt_in: patch.aiTrainingOptIn }
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

/* ---- Billing & Payments (E016) ------------------------------------------ */

export async function listBillingMethods(viewer: Viewer) {
  const { personId } = await ownIds(viewer);
  return prisma.billingMethod.findMany({
    where: { person_id: personId },
    orderBy: [{ is_default: "desc" }, { created_at: "asc" }],
  });
}

export async function addBillingMethod(
  viewer: Viewer,
  input: { kind: "CARD" | "PAYPAL" | "BANK_DEBIT"; label: string; last4?: string | null; expMonth?: number | null; expYear?: number | null }
) {
  const { personId } = await ownIds(viewer);
  const count = await prisma.billingMethod.count({ where: { person_id: personId } });
  return prisma.billingMethod.create({
    data: {
      person_id: personId,
      kind: input.kind,
      label: input.label.trim().slice(0, 80),
      last4: digits(input.last4, 4),
      exp_month: input.expMonth ?? null,
      exp_year: input.expYear ?? null,
      // First one in is the default; there is no meaningful alternative.
      is_default: count === 0,
    },
  });
}

export async function removeBillingMethod(viewer: Viewer, id: string) {
  const { personId } = await ownIds(viewer);
  // Owner scope enforced in the WHERE, so a foreign id deletes nothing.
  await prisma.billingMethod.deleteMany({ where: { id, person_id: personId } });
}

/* ---- Withdrawals (E017) -------------------------------------------------- */

export async function getWithdrawals(viewer: Viewer) {
  const { personId } = await ownIds(viewer);
  const [tax, methods] = await Promise.all([
    prisma.taxProfile.findUnique({ where: { person_id: personId } }),
    prisma.payoutMethod.findMany({
      where: { person_id: personId },
      orderBy: [{ is_default: "desc" }, { created_at: "asc" }],
    }),
  ]);
  return { tax, methods };
}

export async function saveTaxProfile(
  viewer: Viewer,
  input: { legalName: string; country: string; asEntity: boolean; tinLast4?: string | null; signedName: string }
) {
  const { personId } = await ownIds(viewer);
  const form = formFor(input.country, input.asEntity);
  const data = {
    form,
    legal_name: input.legalName.trim().slice(0, 160),
    country: input.country.trim().slice(0, 80),
    tin_last4: digits(input.tinLast4, 4),
    signed_name: input.signedName.trim().slice(0, 160),
    signed_at: new Date(),
  };
  return prisma.taxProfile.upsert({
    where: { person_id: personId },
    update: data,
    create: { person_id: personId, ...data },
  });
}

export async function addPayoutMethod(
  viewer: Viewer,
  input: { kind: "BANK_ACCOUNT" | "PAYPAL" | "WIRE"; label: string; last4?: string | null; country: string }
) {
  const { personId } = await ownIds(viewer);

  /*
    THE MONEY GATE. A payout method cannot exist before a tax profile does.
    Enforced HERE rather than only in the UI: the button being disabled is a
    courtesy, this is the rule. Paying someone with no form on file is the one
    thing in this area that creates a real obligation for Panameer.
  */
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
      country: input.country.trim().slice(0, 80),
      is_default: count === 0,
    },
  });
}

export async function removePayoutMethod(viewer: Viewer, id: string) {
  const { personId } = await ownIds(viewer);
  await prisma.payoutMethod.deleteMany({ where: { id, person_id: personId } });
}

/* ---- Identity Verification (E019) ---------------------------------------- */

export async function getIdentity(viewer: Viewer) {
  const { personId } = await ownIds(viewer);
  return prisma.identityVerification.findUnique({ where: { person_id: personId } });
}

export async function submitIdentity(viewer: Viewer, document: string) {
  const { personId } = await ownIds(viewer);
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
  const { personId } = await ownIds(viewer);
  const rows = await prisma.notificationPreference.findMany({
    where: { person_id: personId },
  });
  const byKey = new Map(rows.map((r) => [r.category, r]));

  /*
    AN ABSENT ROW MEANS THE DECLARED DEFAULT, resolved here rather than
    backfilled on write. That is what lets a new category ship without a
    migration: it simply arrives with the behaviour its definition states.
  */
  return NOTIFICATION_CATEGORIES.map((c) => {
    const row = byKey.get(c.key);
    return {
      key: c.key,
      inApp: row?.in_app ?? c.defaults.inApp,
      email: row?.email ?? c.defaults.email,
      sms: row?.sms ?? c.defaults.sms,
    };
  });
}

export async function setNotificationPref(
  viewer: Viewer,
  category: string,
  channels: { inApp?: boolean; email?: boolean; sms?: boolean }
) {
  const { personId } = await ownIds(viewer);
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
