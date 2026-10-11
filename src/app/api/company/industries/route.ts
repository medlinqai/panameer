import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { offeredBusinessTypes } from "@/lib/business-types";

// RD-E001 / TX-E003: the Industry and Business Type lists for the Register company step (same list as Company › Details).
export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const industries = await prisma.specialization.findMany({ where: { kind: "INDUSTRY", status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const businessTypes = (await offeredBusinessTypes()).map((b) => ({ id: b.id, name: b.name }));
  return NextResponse.json({ industries, businessTypes });
}
