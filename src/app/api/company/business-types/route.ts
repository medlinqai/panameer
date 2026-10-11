import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { setCompanyBusinessType } from "@/lib/business-types";

const Body = z.object({ businessTypeId: z.string().uuid(), on: z.boolean() });

// TX-E003: a company admin turns a business type on or off for their own company (at least one stays on).
export async function POST(request: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await request.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ids: await setCompanyBusinessType(viewer, b.data.businessTypeId, b.data.on) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
