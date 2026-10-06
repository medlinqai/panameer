import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { possibleDuplicates } from "@/lib/company-match";

/** GET /api/admin/companies/duplicates — companies sharing a website domain, email domain or tax ID. Admin only. */
export async function GET() {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json({ groups: await possibleDuplicates() });
}
