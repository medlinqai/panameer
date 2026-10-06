import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { OnboardingError } from "@/lib/onboarding";
import type { Viewer } from "@/lib/access";
import {
  ATTESTATION_CATEGORIES,
  MAX_ATTESTED_YEARS,
  type AttestationCategory,
} from "@/lib/service-product-categories";

export {
  ATTESTATION_CATEGORIES,
  ATTESTATION_THRESHOLD_YEARS,
  meetsThreshold,
} from "@/lib/service-product-categories";

const VALID = new Set<string>(ATTESTATION_CATEGORIES.map((c) => c.value));

const MAX_YEARS = MAX_ATTESTED_YEARS;

export type AttestationClaim = { category: AttestationCategory; years: number };

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
      // first made a claim about this category. `updated_at` carries the edit.
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
