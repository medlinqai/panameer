import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { OnboardingError } from "@/lib/onboarding";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠ "I HAVE NONE" — THE WRITE PATH (`P2-J3-E590` WS-B) ─────────────────
 *
 * ⚠⚠⚠ SCOTT, 2026-09-20: *"If Panameer provided a field that says 'I do not
 * have any of these'. It is empty...but complete. Getting me closer to my
 * 100%."*
 *
 * ⚠ THE FIVE DECLARABLE LINES AND NOTHING ELSE. The six find-me lines (Title,
 * Field, Skills, Rate, Photo, Identity Verified) carry NO none option — an
 * opt-out there would let a provider declare their way to invisible, and those
 * six ARE the visibility predicate.
 *
 * ⚠⚠ A DECLARATION IS REVERSIBLE. Adding a real row supersedes it (the scorer
 * treats `filled` as the stronger state), and `undeclare` clears it outright —
 * a provider who ticked the wrong line is not stuck with it.
 */

/** ⚠ The closed set. A key outside it is REFUSED, never ignored. */
export const DECLARABLE_LINES = {
  workHistory: "declared_no_work_history_at",
  education: "declared_no_education_at",
  specializations: "declared_no_specializations_at",
  certifications: "declared_no_certifications_at",
  soloProjects: "declared_no_solo_projects_at",
} as const;

export type DeclarableLine = keyof typeof DECLARABLE_LINES;

export function isDeclarableLine(k: unknown): k is DeclarableLine {
  return typeof k === "string" && k in DECLARABLE_LINES;
}

/**
 * ⚠ Owner-scoped: the profile is resolved FROM THE SESSION, never from input
 * (load-bearing rule 5). The body carries a line key and a direction, nothing
 * that identifies a profile.
 */
export async function setLineDeclaration(
  viewer: Viewer,
  line: unknown,
  declared: boolean
): Promise<{ line: DeclarableLine; declaredAt: Date | null }> {
  if (!isDeclarableLine(line)) {
    throw new OnboardingError(`Not a declarable line: ${String(line)}`, "INVALID");
  }

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  if (!profile) {
    throw new OnboardingError("No provider profile for this user", "NOT_A_PROVIDER");
  }

  const column = DECLARABLE_LINES[line];
  /* ⚠⚠ A TIMESTAMP, NOT A BOOLEAN. `null` is unanswered; a date is the
     declaration and says when it was made. See the schema comments. */
  const declaredAt = declared ? new Date() : null;

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { [column]: declaredAt },
  });

  /*
    ⚠⚠⚠ THE SCORE IS RECOMPUTED HERE, NOT LEFT TO DRIFT. A declaration that did
    not move the stored number would show the provider a ring that disagrees
    with the list beside it — the exact disagreement `E590` exists to remove.
    ⚠ Imported lazily to keep this module free of the onboarding barrel at
    import time; `recomputeCompleteness` reads `buildCompletenessInput`, the one
    write path, so the number cannot be computed a second way.
  */
  const { recomputeCompleteness } = await import("@/lib/onboarding");
  await recomputeCompleteness(profile.id);

  return { line, declaredAt };
}
