import { NextResponse } from "next/server";
import { runFollowups } from "@/lib/registration-followup";

// SO-E007/E008: daily — Day 1 and Day 7 reminders to people who stopped partway, then tell the admins on Day 8.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(request.url).searchParams.get("secret");
  if (!secret || given !== secret) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...(await runFollowups(new Date())) });
}
