import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { findWebsiteMatch } from "@/lib/company";

// Website-first join: GET ?site=x.com → the company already on Panameer for that website, if any.
export async function GET(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const site = new URL(request.url).searchParams.get("site") ?? "";
  return NextResponse.json(await findWebsiteMatch(gate, site.slice(0, 200)));
}
