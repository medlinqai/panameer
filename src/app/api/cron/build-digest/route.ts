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
  const result = await composeDigest();
  return NextResponse.json({ ok: true, ...result, note: "draft only — nothing was sent" });
}
