import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { updateCourse, deleteCourse } from "@/lib/learn-admin";
import { learnErrorResponse } from "@/lib/learn-admin-http";
import { COURSE_BODY } from "../route";

const BODY = COURSE_BODY.omit({ learningPathId: true });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;

  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That isn't a valid course." },
      { status: 400 }
    );
  }
  try {
    return NextResponse.json({ ok: true, course: await updateCourse(id, parsed.data) });
  } catch (e) {
    return learnErrorResponse(e, "Could not save that course");
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
    return NextResponse.json(await deleteCourse(id));
  } catch (e) {
    return learnErrorResponse(e, "Could not delete that course");
  }
}
