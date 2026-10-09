import { prisma } from "@/lib/prisma";

export async function setPathInterest(
  userId: string,
  learningPathId: string,
  wanted: boolean
): Promise<void> {
  await prisma.pathInterest.upsert({
    where: {
      user_id_learning_path_id: { user_id: userId, learning_path_id: learningPathId },
    },
    create: { user_id: userId, learning_path_id: learningPathId, wanted },
    update: { wanted },
  });
}

export async function pathInterestFor(
  userId: string | null,
  learningPathId: string
): Promise<{ count: number; mine: boolean }> {
  const [count, mine] = await Promise.all([
    prisma.pathInterest.count({
      where: { learning_path_id: learningPathId, wanted: true },
    }),
    userId
      ? prisma.pathInterest.findUnique({
          where: {
            user_id_learning_path_id: { user_id: userId, learning_path_id: learningPathId },
          },
          select: { wanted: true },
        })
      : Promise.resolve(null),
  ]);
  return { count, mine: mine?.wanted === true };
}

export type QueueRow = {
  id: string;
  title: string;
  slug: string;
  recorded: number;
  planned: number;
  unpublished: number;
  /** People waiting. `wanted: true` only. */
  votes: number;
};

export async function productionQueue(): Promise<QueueRow[]> {
  const { lessonState } = await import("@/lib/learn");
  const paths = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      courses: {
        select: {
          sections: {
            select: { lessons: { where: { retired_at: null }, select: { vimeo_ref: true, production_status: true } } },
          },
        },
      },
      _count: { select: { interest: { where: { wanted: true } } } },
    },
  });

  const rows: QueueRow[] = paths.map((p) => {
    const lessons = p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
    let recorded = 0;
    let planned = 0;
    let unpublished = 0;
    for (const l of lessons) {
      const state = lessonState(l);
      if (state === "recorded") recorded += 1;
      else if (state === "planned") planned += 1;
      else if (state === "unpublished") unpublished += 1;
    }
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      recorded,
      planned,
      unpublished,
      votes: p._count.interest,
    };
  });

  return rows
    .filter((r) => r.recorded + r.planned + r.unpublished > 0)
    .sort(
      (a, b) =>
        Number(b.recorded > 0) - Number(a.recorded > 0) ||
        b.votes - a.votes ||
        b.recorded - a.recorded ||
        a.title.localeCompare(b.title)
    );
}
