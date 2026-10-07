import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import {
  addSkill,
  addSpecialization,
  hardDelete,
  moveSkill,
  setSkillVisibility,
  renameSkill,
  renameSpecialization,
  setSpecializationKind,
  setStatus,
  promoteSuggestion,
  rejectSuggestion,
  updateSkill,
  type WriteResult,
  skillLinks,
  specializationLinks,
} from "@/lib/catalog-write";
import {
  addNewSkill,
  addNewSpecialization,
  mergeSkill,
  mergeSpecialization,
  rejectSkill,
  rejectSpecialization,
} from "@/lib/catalog-review";
import { AREA_CODE, addArea, isAreaCode, moveArea, setAreaHidden, updateArea } from "@/lib/skill-area-store";

const Id = z.string().uuid();
const Name = z.string().trim().min(2).max(120);
const Kind = z.enum(["PRODUCT", "METHODOLOGY", "INDUSTRY"]);
const Area = z.string().trim().toUpperCase().regex(AREA_CODE);

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("spec.add"), name: Name, kind: Kind }),
  z.object({ action: z.literal("spec.rename"), id: Id, name: Name }),
  z.object({ action: z.literal("spec.kind"), id: Id, kind: Kind }),
  z.object({ action: z.literal("skill.add"), name: Name, roleTypeId: Id, pillarId: Id }),
  z.object({ action: z.literal("skill.rename"), id: Id, name: Name }),
  z.object({ action: z.literal("skill.move"), id: Id, roleTypeId: Id, pillarId: Id }),
  z.object({ action: z.literal("skill.visible"), id: Id, visible: z.boolean() }),
  z.object({
    action: z.literal("status"),
    table: z.enum(["skill", "specialization"]),
    id: Id,
    status: z.enum(["ACTIVE", "RETIRED"]),
  }),
  z.object({ action: z.literal("spec.promote"), id: Id, kind: Kind }),
  z.object({ action: z.literal("spec.reject"), id: Id }),
  z.object({ action: z.literal("review.skill.merge"), id: Id, intoId: Id }),
  z.object({ action: z.literal("review.skill.add"), id: Id, roleTypeId: Id, pillarId: Id, name: Name.optional() }),
  z.object({
    action: z.literal("skill.update"),
    id: Id,
    name: Name.optional(),
    roleTypeId: Id.optional(),
    pillarId: Id.optional(),
    aliases: z.array(z.string().trim().max(120)).max(50).optional(),
    area: Area.nullable().optional(),
    visible: z.boolean().optional(),
  }),
  z.object({ action: z.literal("skill.merge"), id: Id, intoId: Id }),
  z.object({ action: z.literal("area.add"), label: Name, code: z.string().trim().max(16).optional() }),
  z.object({ action: z.literal("area.update"), id: Id, label: Name.optional(), code: Area.optional() }),
  z.object({ action: z.literal("area.move"), id: Id, dir: z.enum(["up", "down"]) }),
  z.object({ action: z.literal("area.hidden"), id: Id, hidden: z.boolean() }),
  z.object({
    action: z.literal("skill.bulk"),
    ids: z.array(Id).min(1).max(500),
    op: z.enum(["move", "area", "hide", "show", "merge"]),
    roleTypeId: Id.optional(),
    pillarId: Id.optional(),
    area: Area.nullable().optional(),
    intoId: Id.optional(),
  }),
  z.object({ action: z.literal("review.skill.reject"), id: Id }),
  z.object({ action: z.literal("review.spec.merge"), id: Id, intoId: Id }),
  z.object({ action: z.literal("review.spec.add"), id: Id, kind: Kind }),
  z.object({ action: z.literal("review.spec.reject"), id: Id }),
  z.object({
    action: z.literal("delete"),
    table: z.enum(["skill", "specialization"]),
    id: Id,
  }),
]);

export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That edit didn't look right." }, { status: 400 });
  }
  const b = parsed.data;
  if ((b.action === "skill.update" || b.action === "skill.bulk") && b.area && !(await isAreaCode(b.area)))
    return NextResponse.json({ ok: false, error: "That area doesn't exist." }, { status: 400 });

  const result = await (async () => {
    switch (b.action) {
      case "spec.add":
        return addSpecialization(b.name, b.kind);
      case "spec.rename":
        return renameSpecialization(b.id, b.name);
      case "spec.kind":
        return setSpecializationKind(b.id, b.kind);
      case "skill.add":
        return addSkill(b.name, b.roleTypeId, b.pillarId);
      case "skill.rename":
        return renameSkill(b.id, b.name);
      case "skill.move":
        return moveSkill(b.id, b.roleTypeId, b.pillarId);
      case "skill.visible":
        return setSkillVisibility(b.id, b.visible);
      case "spec.promote":
        return promoteSuggestion(b.id, b.kind);
      case "spec.reject":
        return rejectSuggestion(b.id);
      case "status":
        return setStatus(b.table, b.id, b.status);
      case "delete":
        return hardDelete(b.table, b.id);
      case "review.skill.merge":
        return mergeSkill(viewer, b.id, b.intoId);
      case "review.skill.add":
        return addNewSkill(viewer, b.id, b.roleTypeId, b.pillarId, b.name);
      case "skill.update":
        return updateSkill(b.id, b);
      case "area.add":
        return addArea(b.label, b.code);
      case "area.update":
        return updateArea(b.id, { label: b.label, code: b.code });
      case "area.move":
        return moveArea(b.id, b.dir);
      case "area.hidden":
        return setAreaHidden(b.id, b.hidden);
      case "skill.merge":
        return mergeSkill(viewer, b.id, b.intoId, "catalog.skill.merge", true);
      case "skill.bulk": {
        const results: WriteResult[] = [];
        for (const id of b.ids) {
          if (b.op === "move" && b.roleTypeId && b.pillarId) results.push(await updateSkill(id, { roleTypeId: b.roleTypeId, pillarId: b.pillarId }));
          else if (b.op === "area" && b.area !== undefined) results.push(await updateSkill(id, { area: b.area }));
          else if (b.op === "hide" || b.op === "show") results.push(await updateSkill(id, { visible: b.op === "show" }));
          else if (b.op === "merge" && b.intoId) results.push(await mergeSkill(viewer, id, b.intoId, "catalog.skill.merge", true));
          else return { ok: false as const, error: "Pick where to apply that." };
        }
        const bad = results.filter((r) => !r.ok);
        const done = results.length - bad.length;
        return bad.length
          ? { ok: false as const, error: `${done} done; ${bad.length} not: ${bad.map((r) => (r.ok ? "" : r.error)).slice(0, 3).join(" · ")}` }
          : { ok: true as const, id: b.ids[0], message: `Done for ${done} skill${done === 1 ? "" : "s"}.` };
      }
      case "review.skill.reject":
        return rejectSkill(viewer, b.id);
      case "review.spec.merge":
        return mergeSpecialization(viewer, b.id, b.intoId);
      case "review.spec.add":
        return addNewSpecialization(viewer, b.id, b.kind);
      case "review.spec.reject":
        return rejectSpecialization(viewer, b.id);
    }
  })();

  if (!result) {
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}

export async function GET(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;

  const url = new URL(req.url);
  const table = url.searchParams.get("table");
  const id = url.searchParams.get("id");
  if (!id || !Id.safeParse(id).success || (table !== "skill" && table !== "specialization")) {
    return NextResponse.json({ error: "Unknown row." }, { status: 400 });
  }
  const links = table === "skill" ? await skillLinks(id) : await specializationLinks(id);
  return NextResponse.json(links);
}
