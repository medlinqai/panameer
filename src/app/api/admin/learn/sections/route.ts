import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { createSection } from "@/lib/learn-admin";
import { learnErrorResponse } from "@/lib/learn-admin-http";

export const SECTION_BODY = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(1, "A section needs a title."),
  description: z.string().trim().max(2000).optional().nullable(),
  thumbnailUrl: z.string().trim().max(2000).optional().nullable(),
});

/** POST /api/admin/learn/sections — add a section to a course. */
export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  const parsed = SECTION_BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That isn't a valid section." },
      { status: 400 }
    );
  }
  const { courseId, ...rest } = parsed.data;
  try {
    return NextResponse.json({ ok: true, section: await createSection(courseId, rest) });
  } catch (e) {
    return learnErrorResponse(e, "Could not create that section");
  }
}
