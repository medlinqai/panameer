import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { ConnectionError } from "@/lib/connections";
import { RequestError, actOnRequest } from "@/lib/requests";

// Connections › Requests actions: accept / decline what you received, withdraw what you sent.
const Body = z.object({ kind: z.enum(["CONNECT", "MENTORING", "RECOMMENDATION"]), id: z.string().uuid(), action: z.enum(["accept", "decline", "withdraw"]) });

export async function POST(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "That didn't look right." }, { status: 400 });
  try {
    await actOnRequest(gate, b.data.kind, b.data.id, b.data.action);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof RequestError || e instanceof ConnectionError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
