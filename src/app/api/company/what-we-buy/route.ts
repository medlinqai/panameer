import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { setWhatWeBuy } from "@/lib/what-we-buy";

const Body = z.object({ commodityGroupId: z.string().uuid().nullable().optional(), businessTypeId: z.string().uuid().nullable().optional(), enabled: z.boolean() });

// TX-E006: a company admin sets What We Buy for their own company.
export async function POST(request: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await request.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, groups: await setWhatWeBuy(viewer, b.data) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
