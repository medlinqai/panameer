import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { createLesson } from "@/lib/learn-admin";
import { learnErrorResponse } from "@/lib/learn-admin-http";

export const PRODUCTION_STATUS = z.enum([
  "IN_CONCEPT",
  "NEEDS_REFRESH",
  "DECK_READY",
  "RAW_SHOT",
  "PRODUCED",
  "LOADED_TO_STREAMING",
  "URL_ADDED_TO_LESSON",
  "BLOG_CREATED",
  "BLOG_RELEASED",
]);

export const LESSON_BODY = z.object({
  sectionId: z.string().uuid(),
  title: z.string().trim().min(1, "A lesson needs a title."),
  description: z.string().trim().max(4000).optional().nullable(),
  runTime: z.string().trim().max(40).optional().nullable(),
  vimeoRef: z.string().trim().max(500).optional().nullable(),
  thumbnailUrl: z.string().trim().max(2000).optional().nullable(),
  productionStatus: PRODUCTION_STATUS.optional().nullable(),
  expertPersonId: z.string().uuid().optional().nullable(),
});

/** POST /api/admin/learn/lessons — add a lesson to a section. */
export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  const parsed = LESSON_BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That isn't a valid lesson." },
      { status: 400 }
    );
  }
  const { sectionId, ...rest } = parsed.data;
  try {
    return NextResponse.json({ ok: true, lesson: await createLesson(sectionId, rest) });
  } catch (e) {
    return learnErrorResponse(e, "Could not create that lesson");
  }
}
