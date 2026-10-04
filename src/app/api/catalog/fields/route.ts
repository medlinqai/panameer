import { NextResponse } from "next/server";
import { getProviderFieldTree } from "@/lib/catalog";

export async function GET() {
  return NextResponse.json({ roles: await getProviderFieldTree() });
}
