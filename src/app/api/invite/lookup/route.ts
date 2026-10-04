import { NextResponse } from "next/server";
import { lookupInvite } from "@/lib/coordinator";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return NextResponse.json(await lookupInvite(token));
}
