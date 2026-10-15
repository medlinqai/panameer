import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { findRegistrationMatch, findWebsiteMatch } from "@/lib/company";

// Website-first join: GET ?site=x.com → the company already on Panameer for that website, if any.
// BC-E005: &email=1 also matches the registrant's email domain (reason "website" | "email").
export async function GET(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const url = new URL(request.url);
  const site = (url.searchParams.get("site") ?? "").slice(0, 200);
  if (url.searchParams.get("email") === "1") return NextResponse.json(await findRegistrationMatch(gate, site));
  return NextResponse.json(await findWebsiteMatch(gate, site));
}
