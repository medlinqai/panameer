import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { setNeverMatchDomains, NEVER_MATCH_KEY } from "@/lib/platform-settings";

const Body = z.object({ domains: z.array(z.string().max(120)).max(200) });

// BC-E007: email domains that never auto-match a company (system admins only, audited).
export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const domains = await setNeverMatchDomains(b.data.domains, viewer.userId);
  await writeAudit(viewer, { action: `settings.${NEVER_MATCH_KEY}`, targetTable: "platform_settings", targetId: NEVER_MATCH_KEY, detail: { domains }, rowCount: 1 });
  return NextResponse.json({ ok: true, domains });
}
