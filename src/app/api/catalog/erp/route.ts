import { NextResponse } from "next/server";
import { getCatalogTree } from "@/lib/catalog";

export async function GET() {
  const tree = await getCatalogTree("ERP");
  if (!tree) {
    return NextResponse.json(
      { error: "ERP catalog not seeded" },
      { status: 404 }
    );
  }
  return NextResponse.json(tree);
}
