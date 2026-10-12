import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { setIndustryServed } from "@/lib/business-types";

const Body = z.object({ specializationId: z.string().uuid(), on: z.boolean() });

// BT-E001: a seller company admin turns an "Industries You Serve" entry on or off.
export async function POST(request: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await request.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ids: await setIndustryServed(viewer, b.data.specializationId, b.data.on) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
