import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { getAdminCompany, AdminError } from "@/lib/admin";

/** GET /api/admin/companies/[id] — a company's people + roles/profile states. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    return NextResponse.json(await getAdminCompany(gate, id));
  } catch (e) {
    if (e instanceof AdminError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error("[admin] company failed:", e);
    return NextResponse.json({ error: "Could not load company" }, { status: 500 });
  }
}
