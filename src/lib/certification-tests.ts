import { prisma } from "@/lib/prisma";
/* ⚠ The branded account id and the ONE Person->User resolver (`P2-A4-E711`, 102c). */
import type { UserId } from "@/lib/learn-identity";

/**
 * ── ⚠⚠⚠ IS THERE A PUBLISHED CERTIFICATION TEST FOR THIS SKILL? ─────────────
 *
 * `P2-A4-E701` WS-B. **ONE DEFINITION, ONE PLACE (`E585`).** The greyed-out button, any
 * search ranking and any future report all ask this function — they do not each walk
 * `learning_path_skills` and decide for themselves.
 *
 * ⚠⚠ **SCOTT'S RULE:** *"that button should be greyed out if there is no certification
 * for that/those skills."*
 *
 * ── ⚠⚠⚠ A `DRAFT` ASSESSMENT IS NOT A CERTIFICATION, AND THAT IS THE WHOLE POINT ─
 *
 * ⚠ The schema's own rule: **"a generated test nobody has read must not award a
 * certificate."** ⚠⚠ `93e`: **generation is automatic; PUBLISHING is the human act.**
 * ⚠⚠⚠ **SO `status: "PUBLISHED"` IS NOT AN OPTIMISATION HERE — IT IS THE RULE. A
 * RESOLVER THAT COUNTED DRAFTS WOULD LIGHT THE BUTTON FOR A TEST NOBODY HAS READ, AND
 * WOULD BE WORSE THAN NO RESOLVER.**
 * ⚠ Measured 2026-09-29: **8 assessments, 2 PUBLISHED and 6 DRAFT** — so the difference
 * is not hypothetical, it is most of the table.
 *
 * ── ⚠⚠ THE JOIN IS EMPTY TODAY AND THE ANSWER IS THEREFORE "NO", HONESTLY ────
 *
 * ⚠ `learning_path_skills` is seeded with nothing (`WS-A`). ⚠⚠ **SO EVERY SKILL RESOLVES
 * TO `null` RIGHT NOW, WHICH IS THE TRUTH: no path has been declared to certify any
 * skill yet.** ⚠⚠⚠ **A CALLER MUST NOT READ `null` AS "BROKEN" AND FALL BACK TO
 * SOMETHING PERMISSIVE** — greyed out is the correct, intended state.
 */

export type CertificationTest = {
  /** The `LearnAssessment` row — the actual certification test. */
  assessmentId: string;
  learningPathId: string;
  learningPathTitle: string;
};

/**
 * The published certification test covering this skill, or `null`.
 *
 * ⚠⚠ **`null` IS A REAL ANSWER, NOT AN ERROR.** It means *"no published test covers
 * this skill"*, which is the greyed-out state.
 *
 * ⚠ **IF SEVERAL PATHS COVER THE SKILL, THE OLDEST PUBLISHED TEST WINS, AND THAT IS A
 * CHOICE RATHER THAN AN ACCIDENT:** it is stable. Picking the newest would move a
 * provider's target every time somebody published a path, so a pass earned yesterday
 * could stop being the thing the button asks for.
 */
export async function certificationTestForSkill(
  skillId: string
): Promise<CertificationTest | null> {
  const row = await prisma.learningPathSkill.findFirst({
    where: {
      skill_id: skillId,
      learningPath: {
        /* ⚠⚠ THE PATH ITSELF MUST BE PUBLISHED TOO. A published test on an unpublished
           path is not reachable by anybody, so offering it is a door onto a wall. */
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

/**
 * ⚠⚠ THE THIRD BUTTON STATE, WHICH IS THE ONE THAT GETS MISSED (ruling 93d).
 *
 * ⚠⚠⚠ **THE RESULT IS REUSABLE, SO THE SECOND REQUESTER ASKS FOR NOTHING.** A button
 * that requests a test this provider has already passed proves the certification is not
 * being read at all.
 *
 * ⚠ Keyed on the ATTEMPT, not on `Certification`: a `Certification` row can be
 * `SELF_REPORTED` — **measured 2026-09-29, all 12 rows in the database are, and ZERO
 * carry a `learning_path_id`** — and a self-uploaded PDF is not a pass.
 * ⚠⚠ **The pass is the attempt that passed.**
 *
 * ⚠⚠⚠ **IT TAKES A `userId`, NOT A `personId`, AND THAT ASYMMETRY IS REAL: `LearnTestAttempt`
 * KEYS ON `user_id` WHILE THE WHOLE SOURCING CHAIN KEYS ON `Person`.** Learn was built
 * against the account and sourcing against the person. ⚠ **PASSING A `personId` HERE
 * WOULD COMPILE THE DAY THE TYPES ARE BOTH `string` AND SILENTLY MATCH NOTHING** — which
 * is `ALREADY_PASSED` collapsing into `CAN_REQUEST` and a provider being asked to re-sit
 * a test they passed. **The parameter is named for what it is, and reported.**
 */
/*
  ── ⚠⚠⚠ THE COMMENT ABOVE WAS A WARNING. IT IS NOW A COMPILE ERROR (`P2-A4-E711`) ──

  ⚠⚠ The paragraph above says *"PASSING A `personId` HERE WOULD COMPILE THE DAY THE TYPES
  ARE BOTH `string`"* — and they were both `string`, so it did. ⚠⚠⚠ **A COMMENT THAT
  CORRECTLY PREDICTS A DEFECT DOES NOT PREVENT IT.** `UserId` is branded, so the
  prediction can no longer come true: a `PersonId`, or a bare `string` that nobody has
  named, is rejected by `tsc`.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   userId: string,
*/
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

/** The three states the button may be in. ⚠ Named so no caller invents a fourth. */
export type TestButtonState =
  /** ⚠ No published test covers this skill — greyed, **not absent** (the capability stays discoverable). */
  | { state: "NO_TEST" }
  /** A test exists and this provider has not passed it. */
  | { state: "CAN_REQUEST"; test: CertificationTest }
  /** ⚠⚠ A test exists and this provider HAS passed it — show the pass, ask for nothing. */
  | { state: "ALREADY_PASSED"; test: CertificationTest };

/**
 * ⚠⚠ THE BUTTON'S STATE, RESOLVED IN ONE PLACE SO THREE SURFACES CANNOT DISAGREE.
 *
 * ⚠ Returns a discriminated union rather than two booleans: **two booleans permit a
 * fourth, impossible combination** (`NO_TEST` and `ALREADY_PASSED` at once), and
 * somebody would eventually render it.
 */
export async function testButtonState(
  /*
    ⚠⚠⚠ THE ACCOUNT id, AND THE TYPE NOW SAYS SO (`P2-A4-E711`, ruling 102c). Learn keys
    on `User`; the sourcing surface that will call this holds a `Person`.
    ⚠⚠ **A CALLER WITH A `personId` MUST GO THROUGH `userIdForPerson`** — one named place,
    which REFUSES when a person has no account rather than answering *"has not passed"*.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   userId: string,
  */
  userId: UserId,
  skillId: string
): Promise<TestButtonState> {
  const test = await certificationTestForSkill(skillId);
  if (!test) return { state: "NO_TEST" };
  return (await hasPassed(userId, test.assessmentId))
    ? { state: "ALREADY_PASSED", test }
    : { state: "CAN_REQUEST", test };
}
