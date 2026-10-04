import { NextResponse } from "next/server";
import { getApplications } from "@/lib/catalog";

export async function GET() {
  return NextResponse.json({ applications: await getApplications() });
}
