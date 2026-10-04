import { prisma } from "@/lib/prisma";
import type { UserId } from "@/lib/learn-identity";

export type CertificationTest = {
  /** The `LearnAssessment` row — the actual certification test. */
  assessmentId: string;
  learningPathId: string;
  learningPathTitle: string;
};

export async function certificationTestForSkill(
  skillId: string
): Promise<CertificationTest | null> {
  const row = await prisma.learningPathSkill.findFirst({
    where: {
      skill_id: skillId,
      learningPath: {
        status: "PUBLISHED",
        assessment: { status: "PUBLISHED" },
      },
    },
    orderBy: { learningPath: { created_at: "asc" } },
    select: {
      learning_path_id: true,
      learningPath: { select: { title: true, assessment: { select: { id: true } } } },
    },
  });
  if (!row?.learningPath.assessment) return null;
  return {
    assessmentId: row.learningPath.assessment.id,
    learningPathId: row.learning_path_id,
    learningPathTitle: row.learningPath.title,
  };
}

export async function hasPassed(
  userId: UserId,
  assessmentId: string
): Promise<boolean> {
  const attempt = await prisma.certificationAttempt.findFirst({
    where: { user_id: userId, certification_test_id: assessmentId, passed: true },
    select: { id: true },
  });
  return attempt != null;
}

export type TestButtonState =
  | { state: "NO_TEST" }
  /** A test exists and this provider has not passed it. */
  | { state: "CAN_REQUEST"; test: CertificationTest }
  | { state: "ALREADY_PASSED"; test: CertificationTest };

export async function testButtonState(
  userId: UserId,
  skillId: string
): Promise<TestButtonState> {
  const test = await certificationTestForSkill(skillId);
  if (!test) return { state: "NO_TEST" };
  return (await hasPassed(userId, test.assessmentId))
    ? { state: "ALREADY_PASSED", test }
    : { state: "CAN_REQUEST", test };
}
