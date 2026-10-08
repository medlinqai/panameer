import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import {
  ConnectionError,
  acceptColleague,
  declineColleague,
  decideMentor,
  followMentor,
  withdrawMentor,
  requestColleague,
  unfollowMentor,
} from "@/lib/connections";
import { followUser, unfollowUser } from "@/lib/follow";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("colleague"), toUserId: z.string().uuid() }),
  z.object({ action: z.literal("mentor"), toUserId: z.string().uuid() }),
  z.object({ action: z.literal("unmentor"), toUserId: z.string().uuid() }),
  z.object({ action: z.literal("mentor_withdraw"), toUserId: z.string().uuid() }),
  z.object({ action: z.literal("follow"), toUserId: z.string().uuid() }),
  z.object({ action: z.literal("unfollow"), toUserId: z.string().uuid() }),
  z.object({ action: z.literal("mentor_accept"), connectionId: z.string().uuid() }),
  z.object({ action: z.literal("mentor_decline"), connectionId: z.string().uuid() }),
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
      case "mentor": {
        const row = await followMentor(viewer, b.toUserId);
        return NextResponse.json({ ok: true, status: row.status === "ACCEPTED" ? "MENTOR" : "REQUESTED" });
      }
      case "follow":
        try {
          await followUser(viewer, b.toUserId);
        } catch (e) {
          return NextResponse.json({ error: (e as Error).message }, { status: 400 });
        }
        return NextResponse.json({ ok: true, status: "FOLLOWING" });
      case "unfollow":
        await unfollowUser(viewer, b.toUserId);
        return NextResponse.json({ ok: true, status: null });
      case "mentor_withdraw":
        await withdrawMentor(viewer, b.toUserId);
        return NextResponse.json({ ok: true, status: null });
      case "mentor_accept":
      case "mentor_decline":
        await decideMentor(viewer, b.connectionId, b.action === "mentor_accept");
        return NextResponse.json({ ok: true, status: b.action === "mentor_accept" ? "ACCEPTED" : "DECLINED" });
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
