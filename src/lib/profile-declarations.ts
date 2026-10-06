import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { OnboardingError } from "@/lib/onboarding";
import type { Viewer } from "@/lib/access";

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
  // A TIMESTAMP, NOT A BOOLEAN. `null` is unanswered; a date is the
  const declaredAt = declared ? new Date() : null;

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { [column]: declaredAt },
  });

  // THE SCORE IS RECOMPUTED HERE, NOT LEFT TO DRIFT. A declaration that did
  const { recomputeCompleteness } = await import("@/lib/onboarding");
  await recomputeCompleteness(profile.id);

  return { line, declaredAt };
}
