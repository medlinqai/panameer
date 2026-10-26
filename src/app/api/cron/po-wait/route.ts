import { NextResponse } from "next/server";
import { runPoWait } from "@/lib/request-approval";

// JR-E004: daily 60-day PO rule for Requests waiting on the ERP. ?dry=1 lists without changing anything.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");
  if (!secret || given !== secret) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...(await runPoWait(new Date(), { dry: url.searchParams.get("dry") === "1" })) });
}
