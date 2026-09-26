import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { NOTIFICATION_CATEGORIES, findCategory } from "@/lib/notification-categories";
import { w9Signature } from "@/lib/w9";
import type { TaxType } from "@prisma/client";
import { formFor } from "@/lib/tax";
/* ⚠ THE ONE ADDRESS WRITER (brief 10 WS-B). Settings calls it; it does not
   write its own upsert — see `updateContactInfo`. */
import { saveProviderAddress } from "@/lib/onboarding";

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

/**
 * ── ⚠⚠ THE PERSON, RESOLVED AS THE PERSON (`P2-J1.1-E046`, 2026-09-06) ───────
 *
 * ⚠ SUPERSEDED, quoted not deleted — every reader below used to go through this:
 *
 *     async function ownIds(viewer: Viewer) {
 *       const profile = await prisma.providerProfile.findFirst({
 *         where: ownedProviderProfile(viewer),
 *         select: { id: true, person_id: true },
 *       });
 *       if (!profile) throw new SettingsError("No provider profile", "NOT_FOUND");
 *       return { profileId: profile.id, personId: profile.person_id };
 *     }
 *
 * IT REACHED THE PERSON THROUGH THE PROVIDER PROFILE. Thirteen of its fifteen
 * call sites want only `personId` — Contact Info, Billing, Withdrawals, Identity
 * and Notification Settings are all about the PERSON — so a buyer, who has a
 * Person and no ProviderProfile, got a 500 on five settings pages the moment
 * `E046` opened the tree. An empty state would have stopped the crash and left
 * Scott's actual complaint true: *a buyer cannot change their email, their 2FA,
 * their notification preferences or their billing.*
 *
 * ⚠⚠ THE VALUE IS IDENTICAL FOR EVERY EXISTING USER, AND THAT IS PROVABLE, NOT
 * HOPED: `ownedProviderProfile(viewer)` is `{ person: { user_id: viewer.userId } }`,
 * so the old `profile.person_id` WAS the viewer's own Person id. This resolves
 * the same row by the same key. Nothing that used to work resolves differently;
 * what used to throw now succeeds.
 *
 * ⚠⚠ OWNER-SCOPED BY CONSTRUCTION, AND NOT ONE STEP LOOSER. `user_id` comes from
 * the SESSION and never from client input — the same rule `ownedProviderProfile`
 * follows, and `Person.user_id` is `@unique`, so this can match at most one row:
 * the caller's own. No write below can be steered at another person's record.
 */
async function ownPersonId(viewer: Viewer): Promise<string> {
  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new SettingsError("This account has no person record", "NOT_FOUND");
  return person.id;
}

/**
 * ⚠ STILL PROFILE-SCOPED, AND STILL THROWS — for the two readers that genuinely
 * need a `ProviderProfile.id` rather than a person: the provider's own profile
 * settings and its public-visibility pair. A buyer has no profile there, and
 * "no provider profile" is the correct answer to those two questions.
 */
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
      /* ⚠⚠ THE ADDRESS LIVES ON THE BACKBONE (`E019`): P-Account → Company →
         Site → Address → Person. ⚠ Read here so Settings can EDIT it — the page
         used to point away at the wizard instead. */
      site: {
        select: {
          addresses: {
            orderBy: { created_at: "asc" },
            take: 1,
            select: { line1: true, line2: true, city: true, state: true, postal_code: true, country: true },
          },
        },
      },
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
    /* ⚠ SHAPED FOR `LocationFields`, the same block the profile editor and the
       employer modal use — empty strings rather than nulls, because the inputs
       are controlled. */
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
    memberships: {
      provider: !!person.providerProfile,
      buyer: !!person.buyerProfile,
      requester: !!person.requesterProfile,
    },
  };
}

/**
 * ── ⚠⚠ THE ADDRESS IS WRITTEN BY `saveProviderAddress`, NOT HERE ─────────
 *
 * ⚠⚠⚠ **IT IS THE ONE WRITER AND IT OWNS THE BACKBONE STEP** — creating the
 * `Site` on first save (`E019`). ⚠ A second upsert in this file would be `E585`
 * on the record a buyer uses to reach somebody, **and only one of the two would
 * know about the Site.**
 * ⚠⚠ `address` IS OPTIONAL AND THE TEST IS `!== undefined` (ruling 67), the
 * same as every other field here: **absent means "this caller is not speaking
 * about the address", not "clear it".**
 */
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
  const personId = await ownPersonId(viewer);
  return prisma.billingMethod.findMany({
    where: { person_id: personId },
    orderBy: [{ is_default: "desc" }, { created_at: "asc" }],
  });
}

export async function addBillingMethod(
  viewer: Viewer,
  input: { kind: "CARD" | "PAYPAL" | "BANK_DEBIT"; label: string; last4?: string | null; expMonth?: number | null; expYear?: number | null }
) {
  const personId = await ownPersonId(viewer);
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
  const personId = await ownPersonId(viewer);
  // Owner scope enforced in the WHERE, so a foreign id deletes nothing.
  await prisma.billingMethod.deleteMany({ where: { id, person_id: personId } });
}

/* ---- Withdrawals (E017) -------------------------------------------------- */

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

/**
 * ⚠⚠ "DOCUMENT ALL OCCASIONS OF USER ACCESS" (`P1-ALL-E404` WS-3).
 *
 * One of the IRS's four conditions for an electronic substitute Form W-9, and
 * the one that is not about submitting: OPENING the form is an occasion of
 * access. ⚠ Called from the page's render as well as from the write below.
 *
 * ⚠ IT NEVER THROWS INTO THE CALLER. A failed audit write must not stop somebody
 * filing their tax form — the log is evidence, not a gate — but it must not fail
 * silently either, so it is reported without a TIN or a name in the message.
 */
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

  /*
    ── ⚠⚠ THE CERTIFICATION IS STORED AS TEXT, NOT AS A FLAG (`E404` WS-3) ────

    `w9Signature()` builds the name and the exact wording together so a caller
    cannot record one without the other. If IRS Part II wording ever changes, an
    old row still proves what ITS signer saw — which a boolean, or a pointer to
    "the current text", could not.

    ⚠ ONLY ON A W-9. A W-8 has different certifications and `E404` forbids
    building those forms here; attaching W-9 wording to a W-8 record would be a
    false statement about what was agreed.
  */
  const cert = form === "W9" ? w9Signature(input.signedName) : null;

  const data = {
    form,
    legal_name: input.legalName.trim().slice(0, 160),
    country: input.country.trim().slice(0, 80),
    /* ⚠ LAST FOUR ONLY. The full TIN is not stored — see the schema note. */
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
      /*
        ── ⚠⚠⚠ IS THIS A CHOICE, OR JUST THE DEFAULT? (`P2-A3-E620`, ruling 34d)

        ⚠ SCOTT, 2026-09-24, CORRECTING RULING 13: *"Keep absent-means-default.
        The settings page shows the EFFECTIVE value and says plainly when it is
        the default rather than a choice."*
        ⚠⚠ RULING 13 HAD SAID the opposite — *"never an absent row read as
        yes"* — and it was **withdrawn** because `E612`'s group-type precedent
        does not transfer: a stored enum where *"nobody decided"* is dangerous
        is not a preference where *"I never touched this"* is a real and useful
        state. ⚠⚠⚠ Writing a row on first notification would **freeze every
        member's settings against the defaults of the day they were first
        notified**, and those defaults should be free to improve.
        ⚠ THE VALUES ABOVE ARE ALREADY EFFECTIVE — this flag is the only new
        thing, and it is what lets the page say WHY a switch is where it is.
      */
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

/**
 * ── ⚠⚠⚠ WHAT EACH SECTION NEEDS FROM THE MEMBER, OR `null` ──────────────
 *
 * ⚠ SCOTT, on the fixed `/settings`: *"looks like a menu within the menu."* The
 * rail and the index cards were **the same eight labels and blurbs side by
 * side.**
 * ⚠⚠ **RULING 77 SETTLES WHICH HALF GIVES WAY: the rail is the navigation and
 * DOES NOT GO** — *"de-duplicate data and logic; do not de-duplicate doors."*
 * ⚠⚠⚠ **SO THE CARDS STOP REPEATING THE LIST AND START REPORTING STATE.** The
 * rail navigates; the cards say **which section needs the member.**
 *
 * ── ⚠⚠ THE WRITER TEST, APPLIED PER CARD AND MEASURED BEFORE BUILDING ────
 *
 * ⚠ Counted across the whole database, not inferred from the schema:
 *   `Person.phone` 61 · `Address` 233 · `providerProfile.paused_at` 0 of 63
 *   `TwoFactorSetting` 0 · `IdentityVerification` 0 · `TaxProfile` 0
 *   `PayoutMethod` 0 · `BillingMethod` 0 · `NotificationPreference` 0
 *
 * ⚠⚠⚠ **FIVE OF THOSE TABLES HOLD ZERO ROWS AND THAT IS NOT A MISSING WRITER —
 * IT IS THE STATE.** `IdentityVerification.status` **defaults to
 * `NOT_STARTED`**, so *"Not started"* is TRUE for everyone and a real writer
 * (`submitIdentity`) would flip it. ⚠ *"Two-step off"* and *"No card on file"*
 * are the same shape: **a binary whose other side has a writer.** That is
 * ruling 24's test passing, not failing — **unlike a counted zero, which
 * reports a quantity nobody measured.**
 *
 * ── ⚠⚠ TWO SECTIONS GET NO STATUS LINE, AND BOTH REFUSALS ARE DELIBERATE ─
 *
 * ⚠⚠⚠ **`membership` — REFUSED AS A MONEY CLAIM.** There is **no plan column
 * anywhere in the schema**, and the membership page's own comment records that
 * its "cycle" is **the account's anniversary, not a billing period**. ⚠ Scott's
 * example line was *"Membership — Plus, renews 14 Oct"*; **`Plus` does not
 * exist and `renews` asserts a charge.** Ruling 25 — no money moves — and
 * ruling 18 — no promises. **It keeps its blurb.**
 * ⚠⚠ **`notifications` — REFUSED AS UNINFORMATIVE.** Ruling 13 ships every
 * category ON and the table holds 0 rows, so the status would read the same
 * for **every member on the platform**. ⚠ A line that cannot differ is not a
 * status; it is decoration that costs a row of the member's attention.
 *
 * ⚠ **THE BLURBS DO NOT MOVE.** `SETTINGS_NAV` still owns them and the rail and
 * the cards keep reading that one source (`E585`); this adds a SECOND line, it
 * does not replace the first.
 */
export async function getSettingsStatuses(
  viewer: Viewer
): Promise<Record<string, string | null>> {
  const personId = await ownPersonId(viewer);

  /* ⚠⚠ THE `providerProfile` READ WENT WITH THE `/settings/profile` STATUS
     (ruling 78). ⚠ `76a` again: removing the line left its QUERY behind — an
     unused variable, and a round trip to the database for a card that no
     longer exists. **A deletion leaves a hole with a shape, and sometimes the
     shape is a query.**
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   prisma.providerProfile.findFirst({
     //     where: { person_id: personId }, select: { paused_at: true } }), */
  const [person, twoFactor, identity, tax, payouts, billing] = await Promise.all([
    prisma.person.findUnique({
      where: { id: personId },
      select: { phone: true, site: { select: { addresses: { select: { line1: true }, take: 1 } } } },
    }),
    /* ⚠ KEYED ON THE USER, because two-step is an AUTH fact and
       `TwoFactorSetting.user_id` is its `@unique`. ⚠⚠ The other rows here are
       keyed on the PERSON — the two are not interchangeable, which is the
       distinction `levels.ts` and `community-hero.ts` both record. */
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
  /* ⚠ NAMES WHAT IS MISSING, because that is what a landing page is for. When
     both are present it says so once rather than listing them. */
  const contact = !hasPhone && !hasAddress
    ? "No phone or address yet"
    : !hasPhone
      ? "No phone yet"
      : !hasAddress
        ? "No address yet"
        : "Phone and address on file";

  /* ⚠⚠ THE IDV STATUS IS THE COLUMN'S OWN ENUM, mapped to the member's words.
     ⚠ A MISSING ROW IS `NOT_STARTED` — the schema's default, so absence and
     the explicit value say the same thing and neither is invented. */
  const idv = identity?.status ?? "NOT_STARTED";
  const identityLine =
    idv === "VERIFIED" ? "Verified" : idv === "SUBMITTED" ? "In review" : "Not started";

  return {
    "/settings/contact": contact,
    /* ⚠ REFUSED — see the docblock. No plan column, and "renews" is a money
       claim on a page where no money moves. */
    "/settings/membership": null,
    /* ⚠ `/settings/profile` IS GONE (ruling 78) — the section is deleted and
       Visibility lives on `/profile` now, so there is no card to status. */
    "/settings/billing": billing === 0 ? "No payment method yet" : `${billing} on file`,
    /* ⚠⚠ THE SECTION IS *"How Panameer pays you, AND the tax details required
       first"* — so the status reads BOTH, in the order the blurb states them.
       ⚠ I had queried `payouts` and then ignored it; lint caught the unused
       variable and the real defect underneath was that **a provider with tax
       details and no payout method would have been told they were done.** */
    "/settings/withdrawals": !tax
      ? "Tax details needed first"
      : payouts === 0
        ? "No payout method yet"
        : "Tax details and payout method on file",
    "/settings/security": twoFactor?.confirmed_at ? "Two-step on" : "Two-step off",
    "/settings/identity": identityLine,
    /* ⚠ REFUSED — ruling 13 ships every category ON, so this would read the
       same for every member. A line that cannot differ is not a status. */
    "/settings/notifications": null,
  };
}
