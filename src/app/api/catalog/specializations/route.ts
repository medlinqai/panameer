import { NextResponse } from "next/server";
import { getSpecializations } from "@/lib/catalog";

export async function GET() {
  return NextResponse.json({ groups: await getSpecializations() });
}
