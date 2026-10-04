import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import {
  ConnectionError,
  acceptColleague,
  declineColleague,
  followMentor,
  requestColleague,
  unfollowMentor,
} from "@/lib/connections";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("colleague"), toUserId: z.string().uuid() }),
  z.object({ action: z.literal("mentor"), toUserId: z.string().uuid() }),
  z.object({ action: z.literal("unmentor"), toUserId: z.string().uuid() }),
  z.object({ action: z.literal("accept"), connectionId: z.string().uuid() }),
  z.object({ action: z.literal("decline"), connectionId: z.string().uuid() }),
]);

export async function POST(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Bad request." },
      { status: 400 }
    );
  }
  const b = parsed.data;

  try {
    switch (b.action) {
      case "colleague": {
        const row = await requestColleague(viewer, b.toUserId);
        return NextResponse.json({ ok: true, status: row.status });
      }
      case "mentor":
        await followMentor(viewer, b.toUserId);
        return NextResponse.json({ ok: true, status: "FOLLOWING" });
      case "unmentor":
        await unfollowMentor(viewer, b.toUserId);
        return NextResponse.json({ ok: true, status: null });
      case "accept":
        await acceptColleague(viewer, b.connectionId);
        return NextResponse.json({ ok: true, status: "ACCEPTED" });
      case "decline":
        await declineColleague(viewer, b.connectionId);
        return NextResponse.json({ ok: true, status: "DECLINED" });
    }
  } catch (e) {
    if (e instanceof ConnectionError) {
      const status = e.code === "NOT_OPEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }
}
