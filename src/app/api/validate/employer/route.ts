import { NextResponse } from "next/server";
import { respondToEmployerValidation } from "@/lib/employer-validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = body?.token;
  const answer = body?.answer;
  if (typeof token !== "string" || (answer !== "yes" && answer !== "no")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const res = await respondToEmployerValidation(token, answer, {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    ua: request.headers.get("user-agent"),
  });
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
