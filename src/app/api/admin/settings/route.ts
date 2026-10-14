import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { setSetting } from "@/lib/platform-settings";

const Body = z.object({ key: z.enum(["taxonomy_v2"]), value: z.boolean() });

// GT-E001: flip a platform switch (system admins only, audited).
export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await setSetting(b.data.key, b.data.value, viewer.userId);
  await writeAudit(viewer, { action: `settings.${b.data.key}`, targetTable: "platform_settings", targetId: b.data.key, detail: b.data, rowCount: 1 });
  return NextResponse.json({ ok: true });
}
