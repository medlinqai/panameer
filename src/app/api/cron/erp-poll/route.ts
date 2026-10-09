import { NextResponse } from "next/server";
import { pollWorkConfirmations } from "@/lib/erp/settlement";
import { returnTheDraw } from "@/lib/settlements";

// X-E006: mirrors ERP approvals back. Not scheduled in vercel.json; a no-op while ERP_SEND_ENABLED is off.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(request.url).searchParams.get("secret");
  if (!secret || given !== secret) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await pollWorkConfirmations(returnTheDraw));
}
