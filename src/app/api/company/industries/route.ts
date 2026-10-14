import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { offeredBusinessTypes } from "@/lib/business-types";

// RD-E001 / TX-E003 / BT-E001: the Industry and Business Type lists, and whether this member sells (sellers pick a Business Type).
export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const industries = await prisma.specialization.findMany({ where: { kind: "INDUSTRY", status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  // TX2-E004: descriptions (examples) travel with the lists for the ? help.
  const businessTypes = (await offeredBusinessTypes()).map((b) => ({ id: b.id, name: b.name, group: b.commodityGroup?.name ?? "", description: b.description, groupDescription: b.commodityGroup?.description ?? null }));
  const seller = !!(await prisma.person.findUnique({ where: { user_id: gate.userId }, select: { is_service_provider: true } }))?.is_service_provider;
  // Scott 10-14: the whole commodity list shows, even groups with no Business Types yet.
  const groups = await prisma.commodityGroup.findMany({ where: { hidden: false }, orderBy: { sort_order: "asc" }, select: { name: true, description: true } });
  const commodities = groups.map((g) => g.name);
  const commodityHelp = Object.fromEntries(groups.map((g) => [g.name, g.description ?? ""]));
  return NextResponse.json({ industries, businessTypes, commodities, commodityHelp, seller });
}
