import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { follow, isFollowing, unfollow } from "@/lib/work-tracker/followers";

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  let body: { following?: unknown; weeklyEmail?: unknown } = {};
  try {
    body = (await request.json()) as { following?: unknown; weeklyEmail?: unknown };
  } catch {
  }

  if (body.following === false) await unfollow(gate);
  else await follow(gate, typeof body.weeklyEmail === "boolean" ? body.weeklyEmail : undefined);

  return NextResponse.json({ ok: true, following: await isFollowing(gate) });
}
