import { gapSentence, learnGaps } from "@/lib/gate-reads";
import { pathHasPlayableLessons, pathIsOpenTo } from "@/lib/learn";
import { prisma } from "@/lib/prisma";
import type { GateGap } from "@/lib/identity-bar";

export type EnrolmentRefusal =
  | { code: "IDENTITY_REQUIRED"; status: 403; error: string; fields: GateGap[] }
  | { code: "PATH_NOT_FOUND"; status: 404; error: string }
  | { code: "PATH_NOT_READY"; status: 409; error: string };

export async function learnEnrolmentRefusal(
  userId: string,
  pathId: string
): Promise<EnrolmentRefusal | null> {
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
