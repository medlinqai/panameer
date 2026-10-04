import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { searchMembers } from "@/lib/connections";

export async function GET(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const members = await searchMembers(gate, q);
  return NextResponse.json({ members });
}
