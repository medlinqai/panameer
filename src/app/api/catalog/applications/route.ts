import { NextResponse } from "next/server";
import { getApplications } from "@/lib/catalog";

/**
 * GET /api/catalog/applications — the flat tools/applications vocabulary used
 * by the project modal's multi-select (brief_project_model_v2). Public
 * reference data, like the other catalog routes.
 */
export async function GET() {
  return NextResponse.json({ applications: await getApplications() });
}
