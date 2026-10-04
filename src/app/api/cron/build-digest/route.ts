import { NextResponse } from "next/server";
import { composeDigest } from "@/lib/build-digest";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(request.url).searchParams.get("secret");
  if (!secret || given !== secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  /* Hobby allows a daily cron only, so it runs every day and drafts on Fridays. */
  const now = new Date();
  const friday = now.getUTCDay() === 5;
  if (!friday && new URL(request.url).searchParams.get("force") !== "1") {
    return NextResponse.json({ ok: true, skipped: "not Friday", day: now.getUTCDay() });
  }
  const result = await composeDigest(now);
  return NextResponse.json({ ok: true, ...result, note: "draft only — nothing was sent" });
}
