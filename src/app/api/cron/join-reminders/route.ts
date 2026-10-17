import { NextResponse } from "next/server";
import { runJoinReminders } from "@/lib/join-reminders";

// PB-E005: daily join reminders (2 business days → admins; 4 → support ticket). ?dry=1 lists without sending.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");
  if (!secret || given !== secret) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...(await runJoinReminders(new Date(), { dry: url.searchParams.get("dry") === "1" })) });
}
