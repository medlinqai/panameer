import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { createKey, matchSkills } from "@/lib/external-jobs";

export const runtime = "nodejs";

// EX-E001/E006/E008: Admin › External Jobs actions — List / Skip (Needs Review), Remove (+ reason), Remove on Request
// (blocks the company), Mark Contacted, and agent keys.
export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const b = (await request.json().catch(() => ({}))) as { action?: string; id?: string; reason?: string; label?: string };
  const id = String(b.id ?? "");
  switch (b.action) {
    case "list": {
      const j = await prisma.externalJob.findUnique({ where: { id }, select: { title: true, description: true } });
      if (!j) return NextResponse.json({ error: "Not found." }, { status: 404 });
      await prisma.externalJob.update({ where: { id }, data: { status: "LISTED", skill_ids: await matchSkills([j.title, j.description].join(" ")) } });
      return NextResponse.json({ ok: true });
    }
    case "skip":
      await prisma.externalJob.update({ where: { id }, data: { status: "REMOVED", remove_reason: "Not Oracle (reviewed)" } });
      return NextResponse.json({ ok: true });
    case "remove":
      await prisma.externalJob.update({ where: { id }, data: { status: "REMOVED", remove_reason: (b.reason ?? "").trim().slice(0, 300) || "Removed by admin" } });
      return NextResponse.json({ ok: true });
    case "remove-on-request": {
      const j = await prisma.externalJob.findUnique({ where: { id }, select: { external_company_id: true } });
      if (!j) return NextResponse.json({ error: "Not found." }, { status: 404 });
      const why = (b.reason ?? "").trim().slice(0, 300) || "Removed on request";
      await prisma.$transaction([
        prisma.externalCompany.update({ where: { id: j.external_company_id }, data: { blocked_at: new Date(), block_reason: why } }),
        prisma.externalJob.updateMany({ where: { external_company_id: j.external_company_id, status: { in: ["LISTED", "NEEDS_REVIEW"] } }, data: { status: "REMOVED", remove_reason: why } }),
      ]);
      return NextResponse.json({ ok: true });
    }
    case "contacted":
      await prisma.externalJob.update({ where: { id }, data: { contacted_at: new Date() } });
      return NextResponse.json({ ok: true });
    case "create-key":
      return NextResponse.json({ ok: true, key: await createKey(b.label ?? "Agent") });
    case "revoke-key":
      await prisma.externalJobKey.update({ where: { id }, data: { revoked_at: new Date() } });
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
