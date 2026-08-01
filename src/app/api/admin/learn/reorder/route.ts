import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { reorder } from "@/lib/learn-admin";
import { learnErrorResponse } from "@/lib/learn-admin-http";

const BODY = z.object({
  kind: z.enum(["course", "section", "lesson"]),
  id: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

/** POST /api/admin/learn/reorder — move one item among its siblings. */
export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid move." }, { status: 400 });
  }
  try {
    const { kind, id, direction } = parsed.data;
    return NextResponse.json(await reorder(kind, id, direction));
  } catch (e) {
    return learnErrorResponse(e, "Could not reorder that");
  }
}
