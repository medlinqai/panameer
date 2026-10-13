import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/prisma";
import { DEFAULT_RULES } from "@/lib/payout-requirements";

const Rule = z.object({ country_code: z.string().trim().toUpperCase().regex(/^([A-Z]{2}|\*)$/, "Use a 2-letter country code, or * for everyone else"), needs_tax_id: z.boolean(), needs_tax_form: z.boolean(), tax_form_label: z.string().trim().max(40).nullable(), needs_payout_account: z.boolean() });
const Body = z.discriminatedUnion("action", [z.object({ action: z.literal("save"), rule: Rule }), z.object({ action: z.literal("delete"), country_code: z.string() })]);

// RV-E004: Admin › Payout Requirements (system admins only), each change audited.
export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: b.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  // First edit writes the R1 defaults so the table holds the whole rule set from then on.
  if (!(await prisma.payoutRequirement.count())) await prisma.payoutRequirement.createMany({ data: DEFAULT_RULES });
  const d = b.data;
  if (d.action === "save") {
    const { country_code, ...rest } = d.rule;
    await prisma.payoutRequirement.upsert({ where: { country_code }, create: { country_code, ...rest, updated_by: viewer.userId }, update: { ...rest, updated_by: viewer.userId } });
  } else {
    if (d.country_code === "*") return NextResponse.json({ error: "The everyone-else rule stays" }, { status: 400 });
    await prisma.payoutRequirement.deleteMany({ where: { country_code: d.country_code } });
  }
  await writeAudit(viewer, { action: `payout_requirements.${d.action}`, targetTable: "payout_requirements", targetId: d.action === "save" ? d.rule.country_code : d.country_code, detail: d, rowCount: 1 });
  return NextResponse.json({ ok: true });
}
