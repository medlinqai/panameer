import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { createCourse } from "@/lib/learn-admin";
import { learnErrorResponse } from "@/lib/learn-admin-http";

export const COURSE_BODY = z.object({
  learningPathId: z.string().uuid(),
  title: z.string().trim().min(1, "A course needs a title."),
  slug: z.string().trim().optional().nullable(),
  summary: z.string().trim().max(2000).optional().nullable(),
  style: z
    .enum([
      "FA_OVERVIEW",
      "CONCEPTUAL",
      "HOW_TO_USE",
      "HOW_TO_DEPLOY",
      "DAILY_JOURNAL",
      "ASK_THE_EXPERT",
    ])
    .or(z.literal(""))
    .optional()
    .nullable(),
  thumbnailUrl: z.string().trim().max(2000).optional().nullable(),
  introVideoRef: z.string().trim().max(500).optional().nullable(),
});

/** POST /api/admin/learn/courses — add a course to a path. */
export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  const parsed = COURSE_BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That isn't a valid course." },
      { status: 400 }
    );
  }
  const { learningPathId, ...rest } = parsed.data;
  try {
    return NextResponse.json({ ok: true, course: await createCourse(learningPathId, rest) });
  } catch (e) {
    return learnErrorResponse(e, "Could not create that course");
  }
}
