import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { getPathTree } from "@/lib/learn-admin";
import { learnErrorResponse } from "@/lib/learn-admin-http";

/** GET /api/admin/learn/paths/[id]/tree — the whole outline for the editor. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    return NextResponse.json(await getPathTree(id));
  } catch (e) {
    return learnErrorResponse(e, "Could not load that path");
  }
}
