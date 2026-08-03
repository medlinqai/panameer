import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { getCompanyBinding, searchCompanies } from "@/lib/company";

/**
 * GET /api/company — the viewer's own company binding, or `?q=` to search
 * joinable companies (defined ones only; names, domain and headcount).
 *
 * Signed-in only. Recognising your employer is the point of the join step, and
 * a company name is not a secret — but an open endpoint would hand the whole
 * customer list to anyone who asked.
 */
export async function GET(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const q = new URL(request.url).searchParams.get("q");
  if (q !== null) {
    return NextResponse.json({ companies: await searchCompanies(q) });
  }
  return NextResponse.json({ binding: await getCompanyBinding(gate) });
}
