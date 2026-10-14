import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { taxonomyV2 } from "@/lib/platform-settings";
import { CapabilityError, addCapability, capabilityOptions, confirmCapability, myCapabilities, removeCapability } from "@/lib/capabilities";

const MODE = z.enum(["IMPLEMENT", "SUPPORT", "OPERATE"]);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), mode: MODE, domainId: z.string().uuid(), knowledgeSkillId: z.string().uuid().nullable().optional(), systemItemId: z.string().uuid().nullable().optional(), workRoleId: z.string().uuid().nullable().optional() }),
  z.object({ action: z.literal("confirm"), id: z.string().uuid(), mode: MODE.optional() }),
  z.object({ action: z.literal("remove"), id: z.string().uuid() }),
]);

// GT-E004: the seller's capabilities (behind taxonomy_v2). Off → { enabled: false } and the editor renders nothing.
export async function GET() {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  if (!(await taxonomyV2())) return NextResponse.json({ enabled: false });
  const [options, capabilities] = await Promise.all([capabilityOptions(), myCapabilities(viewer)]);
  return NextResponse.json({ enabled: true, options, capabilities });
}

export async function POST(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    const d = b.data;
    if (d.action === "add") await addCapability(viewer, d);
    else if (d.action === "confirm") await confirmCapability(viewer, d.id, d.mode);
    else await removeCapability(viewer, d.id);
    return NextResponse.json({ ok: true, capabilities: await myCapabilities(viewer) });
  } catch (e) {
    if (e instanceof CapabilityError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
