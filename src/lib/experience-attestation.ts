import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { OnboardingError } from "@/lib/onboarding";
import type { Viewer } from "@/lib/access";
import {
  ATTESTATION_CATEGORIES,
  MAX_ATTESTED_YEARS,
  type AttestationCategory,
} from "@/lib/service-product-categories";

/**
 * ── ⚠⚠ THE 3-YEAR EXPERIENCE ATTESTATION (`P2-J2-E563` WS-B item 8) ─────────
 *
 * ⚠ Scott, 2026-09-17, on what he wants providers to do: *"ONE — complete their
 * profile. TWO — check their 'have you done this for > 3 years' related to
 * auto-service product creation."*
 *
 * ⚠⚠⚠ THIS MODULE CAPTURES THE CLAIM. IT DOES NOT CREATE ANYTHING.
 * **No service product is auto-created by this brief**, and four decisions in
 * `service_products_and_provider_quality.md` are unruled: whether the generic
 * categories are a new model or an extension of `Package`; whether `validated`
 * is the hook for the rungs; where a retainer sits; whether a team is an
 * object. ⚠ **DO NOT INVENT THE MODEL BY BUILDING AGAINST THIS FILE.**
 *
 * ── ⚠⚠ THE LIST IS CLOSED AND IT IS SCOTT'S ────────────────────────────────
 *
 * ⚠ *"The categories are Scott's and the list is closed: Pre-Project
 * Consultation · Training · Testing · Mentoring. DO NOT ADD TO IT — he names
 * things."* ⚠⚠ The enum lives in the SCHEMA for the same reason, so adding a
 * fifth takes a `db push` — a decision, not a typo.
 */

/*
  ⚠⚠ THE CLOSED LIST LIVES IN `service-product-categories.ts`, WHICH IMPORTS
  NOTHING. ⚠ This module imports `prisma`, and the capture UI is a CLIENT
  component — importing the list from here dragged `@prisma/adapter-pg` and `pg`
  into the browser bundle and FAILED THE BUILD (measured 2026-09-19).
  ⚠ One list, two consumers, no server code in the client bundle.
*/
export {
  ATTESTATION_CATEGORIES,
  ATTESTATION_THRESHOLD_YEARS,
  meetsThreshold,
} from "@/lib/service-product-categories";

const VALID = new Set<string>(ATTESTATION_CATEGORIES.map((c) => c.value));

/**
 * ⚠⚠ `0` IS A MEANINGFUL ANSWER — it says "I do not do this" — and is stored
 * rather than dropped, because an absent row and a claimed zero are different
 * states: one was never answered.
 */
const MAX_YEARS = MAX_ATTESTED_YEARS;

export type AttestationClaim = { category: AttestationCategory; years: number };

/** ⚠ Owner-scoped. The profile is resolved FROM THE SESSION, never from input. */
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

/** What this provider has already claimed, as a category → years map. */
export async function readAttestations(
  viewer: Viewer
): Promise<Record<string, number>> {
  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: {
      experienceAttestations: { select: { category: true, years: true } },
    },
  });
  const out: Record<string, number> = {};
  for (const row of profile?.experienceAttestations ?? []) {
    out[row.category] = row.years;
  }
  return out;
}

/**
 * ⚠⚠ UPSERT PER CATEGORY, SCOPED TO THE OWNER. A category the caller does not
 * mention is LEFT ALONE — this is a save of what was answered, not a rewrite of
 * the set.
 *
 * ⚠⚠⚠ THAT IS THE HOUSE RULE, NOT A PREFERENCE: *"A SAVE DELETES DATA IT DID
 * NOT CREATE"* is the sentence behind `E552`, `E553` and `E517`. A save here
 * that cleared unmentioned categories would be the same defect in a new table,
 * on its first day.
 */
export async function saveAttestations(
  viewer: Viewer,
  claims: unknown
): Promise<Record<string, number>> {
  const profileId = await ownedProfileId(viewer);

  if (!Array.isArray(claims)) {
    throw new OnboardingError("Expected a list of claims", "INVALID");
  }

  const clean: AttestationClaim[] = [];
  for (const raw of claims) {
    if (!raw || typeof raw !== "object") continue;
    const { category, years } = raw as { category?: unknown; years?: unknown };
    if (typeof category !== "string" || !VALID.has(category)) {
      /* ⚠ A CATEGORY OUTSIDE THE CLOSED LIST IS REFUSED, NOT IGNORED. Silently
         dropping it would let a client believe it had saved something. */
      throw new OnboardingError(`Unknown category: ${String(category)}`, "INVALID");
    }
    if (typeof years !== "number" || !Number.isInteger(years) || years < 0 || years > MAX_YEARS) {
      throw new OnboardingError(
        `Years must be a whole number between 0 and ${MAX_YEARS}`,
        "INVALID"
      );
    }
    clean.push({ category: category as AttestationCategory, years });
  }

  for (const claim of clean) {
    await prisma.providerExperienceAttestation.upsert({
      where: {
        provider_profile_id_category: {
          provider_profile_id: profileId,
          category: claim.category,
        },
      },
      /* ⚠ `attested_at` IS NOT TOUCHED ON UPDATE — it records when the person
         first made a claim about this category. `updated_at` carries the edit. */
      update: { years: claim.years },
      create: {
        provider_profile_id: profileId,
        category: claim.category,
        years: claim.years,
      },
    });
  }

  return readAttestations(viewer);
}
