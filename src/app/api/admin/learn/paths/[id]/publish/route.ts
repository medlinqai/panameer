import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { getPublishReadiness, setPathStatus } from "@/lib/learn-admin";
import { learnErrorResponse } from "@/lib/learn-admin-http";

/** GET — what would happen if this path were published right now. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    return NextResponse.json(await getPublishReadiness(id));
  } catch (e) {
    return learnErrorResponse(e, "Could not check that path");
  }
}

/** POST — publish or unpublish. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;

  const parsed = z
    .object({ status: z.enum(["DRAFT", "PUBLISHED"]) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid status." }, { status: 400 });
  }
  try {
    return NextResponse.json({ ok: true, path: await setPathStatus(id, parsed.data.status) });
  } catch (e) {
    return learnErrorResponse(e, "Could not change that path's status");
  }
}
