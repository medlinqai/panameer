import { NextResponse } from "next/server";
import { z } from "zod";
import { GroupError, joinGroup } from "@/lib/group-membership";
import { guardApi } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";

const BODY = z.object({
  boardId: z.string().uuid(),
  action: z.enum(["join", "leave"]),
});

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid request." }, { status: 400 });
  }
  const { boardId, action } = parsed.data;

  try {
    const res = await joinGroup(viewer.userId, boardId, action === "leave");
    return NextResponse.json({ ok: true, state: res.state });
  } catch (err) {
    if (err instanceof GroupError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    }
    throw err;
  }
}
