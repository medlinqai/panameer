import { NextResponse } from "next/server";
import { startClaim } from "@/lib/external-claim";

export const runtime = "nodejs";

// EX-E005 step 1 (public): the work email gets a confirmation link.
export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as { token?: string; email?: string; name?: string; role?: string };
  if (!b.token || !b.email || !b.name?.trim()) return NextResponse.json({ error: "Enter your work email and name." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await startClaim(b.token, { email: b.email, name: b.name, role: b.role }, new URL(request.url).origin)) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
