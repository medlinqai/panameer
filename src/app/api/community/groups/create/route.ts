import { NextResponse } from "next/server";
import { z } from "zod";
import { createGroup, GroupError } from "@/lib/group-membership";
import { guardApi } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const BODY = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(400).optional(),
  });
  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid request." }, { status: 400 });
  }

  try {
    const { slug } = await createGroup(viewer.userId, parsed.data);
    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    if (err instanceof GroupError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    throw err;
  }
}
