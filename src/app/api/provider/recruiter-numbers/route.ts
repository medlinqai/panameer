import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";

const N = z.number().int().min(0).max(60).nullable();
const Body = z.object({ oracleCloudYears: N.optional(), implementationsCount: N.optional() });

// MR-E003: the provider's own Oracle Cloud years and Implementations (null = use the derived number).
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a whole number from 0 to 60, or leave it blank." }, { status: 400 });
  const profile = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(gate), select: { id: true } });
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 403 });
  const d = parsed.data;
  await prisma.providerProfile.update({ where: { id: profile.id }, data: { ...(d.oracleCloudYears !== undefined ? { oracle_cloud_years: d.oracleCloudYears } : {}), ...(d.implementationsCount !== undefined ? { implementations_count: d.implementationsCount } : {}) } });
  return NextResponse.json({ ok: true });
}
