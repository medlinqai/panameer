import { NextResponse } from "next/server";
import { runDigest } from "@/lib/job-agent";

// EX-E004: the Job Agent's morning digest (top 5 finds) for people who turned it on. ?dry=1 counts without sending.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");
  if (!secret || given !== secret) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...(await runDigest({ dry: url.searchParams.get("dry") === "1" })) });
}
