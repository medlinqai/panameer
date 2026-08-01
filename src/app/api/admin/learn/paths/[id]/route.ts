import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { updatePath, deletePath, LearnAdminError } from "@/lib/learn-admin";
import { PATH_BODY } from "../route";

const status = (e: LearnAdminError) =>
  e.code === "NOT_FOUND" ? 404 : e.code === "BLOCKED" ? 409 : e.code === "INVALID" ? 400 : 409;

/** PATCH /api/admin/learn/paths/[id] — edit a learning path. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;

  const parsed = PATH_BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That isn't a valid learning path." },
      { status: 400 }
    );
  }
  try {
    return NextResponse.json({ ok: true, path: await updatePath(id, parsed.data) });
  } catch (e) {
    if (e instanceof LearnAdminError) {
      return NextResponse.json({ error: e.message }, { status: status(e) });
    }
    console.error("[admin/learn] update path failed:", e);
    return NextResponse.json({ error: "Could not save that path" }, { status: 500 });
  }
}

/** DELETE /api/admin/learn/paths/[id] — blocked while it has courses or learners. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    return NextResponse.json(await deletePath(id));
  } catch (e) {
    if (e instanceof LearnAdminError) {
      return NextResponse.json({ error: e.message }, { status: status(e) });
    }
    console.error("[admin/learn] delete path failed:", e);
    return NextResponse.json({ error: "Could not delete that path" }, { status: 500 });
  }
}
