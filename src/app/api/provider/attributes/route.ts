import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { taxonomyV2 } from "@/lib/platform-settings";
import { AttributeError, myAttributes, saveAttribute } from "@/lib/search-attributes";

const Body = z.object({ attributeId: z.string().uuid(), values: z.array(z.string().max(80)).max(60) });

// Lane 6: the seller's answers to their Business Type's search attributes (behind taxonomy_v2). Owner-scoped in the lib.
export async function GET() {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  if (!(await taxonomyV2())) return NextResponse.json({ enabled: false });
  return NextResponse.json({ enabled: true, attributes: await myAttributes(viewer) });
}

export async function POST(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    await saveAttribute(viewer, b.data.attributeId, b.data.values);
    return NextResponse.json({ ok: true, attributes: await myAttributes(viewer) });
  } catch (e) {
    if (e instanceof AttributeError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
