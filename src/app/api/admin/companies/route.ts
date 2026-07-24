import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { getAdminCompanies } from "@/lib/admin";

/** GET /api/admin/companies — roster of all PAccounts. Admin only. */
export async function GET() {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  try {
    return NextResponse.json({ companies: await getAdminCompanies(gate) });
  } catch (e) {
    console.error("[admin] companies failed:", e);
    return NextResponse.json({ error: "Could not load companies" }, { status: 500 });
  }
}
