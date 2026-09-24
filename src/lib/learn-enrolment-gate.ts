import { gapSentence, learnGaps } from "@/lib/gate-reads";
import { pathHasPlayableLessons, pathIsOpenTo } from "@/lib/learn";
import { prisma } from "@/lib/prisma";
import type { GateGap } from "@/lib/identity-bar";

/**
 * ── ⚠⚠⚠ THE ONE RULE FOR WRITING A `LearnEnrollment` (`P2-A4-E610`) ───────
 *
 * ⚠⚠ SCOTT, 2026-09-23: *"Enrolment is forum membership, so marking one lesson
 * complete grants forum access the enrol route refuses. Apply the same two
 * checks. One rule, called twice — import it, do not restate it."*
 *
 * ── ⚠⚠ THE DEFECT THIS CLOSES, MEASURED 2026-09-23 ───────────────────────
 *
 * ⚠ `/api/learn/enroll` ran BOTH checks — `learnGaps` (the identity bar) and
 * `pathIsOpenTo` (the path has something to watch). ⚠⚠ `/api/learn/progress`
 * ran NEITHER, and it upserts a `LearnEnrollment` of its own so a progress row
 * is never orphaned from the path it belongs to.
 * ⚠⚠⚠ AND `canAccessPathForum` READS `LearnEnrollment` DIRECTLY, so the weaker
 * door did not merely skip a form check — it handed out membership of a path's
 * private forum on terms the enrol route refuses.
 *
 * ⚠ THE SECOND DOOR WAS NOT A MISTAKE AND IS NOT BEING REMOVED. Watching a
 * lesson through is a stronger statement of intent than clicking Enrol, and a
 * progress row belonging to a path you are not enrolled in would be invisible
 * on My Learning. ⚠⚠ **What was wrong is that it was CHEAPER, not that it
 * existed.**
 *
 * ── ⚠ WHY THIS IS A MODULE AND NOT A COPIED BLOCK ────────────────────────
 *
 * ⚠⚠ A HAND-ROLLED COPY AGREES UNTIL THE RULE CHANGES (`E585`). Both routes
 * held the same two conditions in 2026-09-23's measurement and they had ALREADY
 * drifted — one route had both, the other had neither. ⚠ `check:learn-enrol`
 * asserts, by DERIVATION and not from a list (`E587`), that every route in
 * `src/app/api` writing a `LearnEnrollment` calls this function.
 *
 * ⚠ IT RETURNS DATA, NOT A `NextResponse`. The rule has no opinion about HTTP,
 * and a plain object is what lets a gate drive every branch without a server.
 */
export type EnrolmentRefusal =
  | { code: "IDENTITY_REQUIRED"; status: 403; error: string; fields: GateGap[] }
  | { code: "PATH_NOT_FOUND"; status: 404; error: string }
  | { code: "PATH_NOT_READY"; status: 409; error: string };

/**
 * May this user gain a `LearnEnrollment` in this path right now?
 *
 * ⚠ Returns `null` when they may, and the refusal — with the sentence the
 * member reads — when they may not.
 * ⚠⚠ THE ORDER IS DELIBERATE: identity first, then the path. A member with an
 * incomplete profile gets the same answer whichever path they picked, so the
 * page never has to explain two different refusals at once.
 */
export async function learnEnrolmentRefusal(
  userId: string,
  pathId: string
): Promise<EnrolmentRefusal | null> {
  /*
    ⚠ THE IDENTITY BAR. `learnGaps` is `lib/gate-reads.ts`'s and is shared with
    the test route; the fields it reads are `LEARN_BAR`'s, never a list here.
  */
  const gaps = await learnGaps(userId);
  if (gaps.length > 0) {
    return {
      code: "IDENTITY_REQUIRED",
      status: 403,
      error: gapSentence(gaps),
      fields: gaps,
    };
  }

  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, status: "PUBLISHED" },
    /* ⚠ THE LESSON ROWS COME BACK SO `pathHasPlayableLessons` CAN BE ASKED —
       the same helper discovery uses, not a second query shaped like it. */
    select: {
      id: true,
      courses: {
        select: {
          sections: {
            select: { lessons: { select: { vimeo_ref: true, production_status: true } } },
          },
        },
      },
    },
  });
  if (!path) {
    return {
      code: "PATH_NOT_FOUND",
      status: 404,
      error: "That learning path isn't available.",
    };
  }

  /*
    ⚠⚠ YOU CANNOT ENROL IN A PATH YOU CANNOT START (`P2-A4-E608`).
    ⚠ `pathIsOpenTo(…, false)` — the enrolment clause does not apply, because
    this IS the question of whether to create that enrolment. Passing `true`
    would make the predicate answer itself.
  */
  if (!pathIsOpenTo(pathHasPlayableLessons(path), false)) {
    return {
      code: "PATH_NOT_READY",
      status: 409,
      error:
        "That path has no videos yet, so there is nothing to start. You can still read its outline.",
    };
  }

  return null;
}
