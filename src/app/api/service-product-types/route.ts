import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { suggestProductType } from "@/lib/service-product-types";

const BODY = z.object({ name: z.string().trim().min(3).max(60) });

// WS-E008: "Don't see yours? Suggest a Service Type" — goes to admin review (Business Type Taxonomy).
export async function POST(req: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const b = BODY.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Give the service type a name (3–60 characters)." }, { status: 400 });
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) return NextResponse.json({ error: "No person for this account" }, { status: 400 });
  return NextResponse.json({ ok: true, ...(await suggestProductType(b.data.name, me.id)) });
}
