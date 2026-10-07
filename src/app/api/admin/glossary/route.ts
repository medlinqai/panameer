import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { saveTerm, setTermFlags } from "@/lib/glossary";

// Admin › Glossary writes: add / edit (all fields), hide / show, visibility. No delete.
const Id = z.string().uuid();
const Str = z.string().max(2000).nullable().optional();
const Fields = z.object({
  term: z.string().trim().min(1).max(120),
  category: Str,
  type: Str,
  definition: z.string().trim().min(1).max(4000),
  alsoCalled: Str,
  dontSay: Str,
  visibility: z.enum(["PUBLIC", "ADMIN"]).optional(),
  hidden: z.boolean().optional(),
  confirmNote: Str,
});
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), fields: Fields }),
  z.object({ action: z.literal("edit"), id: Id, fields: Fields }),
  z.object({ action: z.literal("flags"), id: Id, hidden: z.boolean().optional(), visibility: z.enum(["PUBLIC", "ADMIN"]).optional() }),
]);

export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "That didn't look right." }, { status: 400 });
  const b = parsed.data;
  const r = b.action === "flags" ? await setTermFlags(b.id, { hidden: b.hidden, visibility: b.visibility }) : await saveTerm(b.action === "edit" ? b.id : null, b.fields);
  if (!r.ok) return NextResponse.json(r, { status: 409 });
  await writeAudit(viewer, { action: `glossary.${b.action}`, targetTable: "glossary_terms", targetId: r.id, detail: b.action === "flags" ? { hidden: b.hidden, visibility: b.visibility } : { term: b.fields.term } });
  return NextResponse.json(r);
}
