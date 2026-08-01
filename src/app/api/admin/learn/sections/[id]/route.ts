import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { updateSection, deleteSection } from "@/lib/learn-admin";
import { learnErrorResponse } from "@/lib/learn-admin-http";
import { SECTION_BODY } from "../route";

const BODY = SECTION_BODY.omit({ courseId: true });

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
      { error: parsed.error.issues[0]?.message ?? "That isn't a valid section." },
      { status: 400 }
    );
  }
  try {
    return NextResponse.json({ ok: true, section: await updateSection(id, parsed.data) });
  } catch (e) {
    return learnErrorResponse(e, "Could not save that section");
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
    return NextResponse.json(await deleteSection(id));
  } catch (e) {
    return learnErrorResponse(e, "Could not delete that section");
  }
}
