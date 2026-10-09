import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { updateLesson, deleteLesson, setLessonUrl, setLessonRetired } from "@/lib/learn-admin";
import { learnErrorResponse } from "@/lib/learn-admin-http";
import { LESSON_BODY } from "../route";

const FULL = LESSON_BODY.omit({ sectionId: true });

const URL_ONLY = z.object({ vimeoRef: z.string().max(500).nullable() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;

  const raw = await request.json().catch(() => null);

  // L-E043: { retired: true | false } → retire or restore.
  if (raw && typeof raw === "object" && Object.keys(raw).length === 1 && "retired" in raw && typeof (raw as { retired: unknown }).retired === "boolean") {
    try {
      return NextResponse.json(await setLessonRetired(id, (raw as { retired: boolean }).retired));
    } catch (e) {
      return learnErrorResponse(e, "Could not change that lesson");
    }
  }

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
