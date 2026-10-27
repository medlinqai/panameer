import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { catalogProductsPage } from "@/lib/catalog-products";

/** Scott 10-16: Create What You Sell › Products — the same data Catalog › Service Products uses. */
export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json(await catalogProductsPage(gate));
}
