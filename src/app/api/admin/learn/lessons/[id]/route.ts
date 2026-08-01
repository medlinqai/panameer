import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { updateLesson, deleteLesson, setLessonUrl } from "@/lib/learn-admin";
import { learnErrorResponse } from "@/lib/learn-admin-http";
import { LESSON_BODY } from "../route";

const FULL = LESSON_BODY.omit({ sectionId: true });

/**
 * The URL-only shape used by the per-section table (WS3).
 *
 * A separate schema rather than a partial edit, because the two writes mean
 * different things: this one is "paste a URL down a column and move on", and it
 * is allowed to advance the production status as a side effect. The full edit
 * is not — there the admin is looking at the status field and owns it.
 */
const URL_ONLY = z.object({ vimeoRef: z.string().max(500).nullable() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;

  const raw = await request.json().catch(() => null);

  // Exactly one key, and it's the URL → the fast path.
  if (raw && typeof raw === "object" && Object.keys(raw).length === 1 && "vimeoRef" in raw) {
    const parsed = URL_ONLY.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "That isn't a valid URL." }, { status: 400 });
    }
    try {
      return NextResponse.json(await setLessonUrl(id, parsed.data.vimeoRef));
    } catch (e) {
      return learnErrorResponse(e, "Could not save that URL");
    }
  }

  const parsed = FULL.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That isn't a valid lesson." },
      { status: 400 }
    );
  }
  try {
    return NextResponse.json({ ok: true, lesson: await updateLesson(id, parsed.data) });
  } catch (e) {
    return learnErrorResponse(e, "Could not save that lesson");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    return NextResponse.json(await deleteLesson(id));
  } catch (e) {
    return learnErrorResponse(e, "Could not delete that lesson");
  }
}
