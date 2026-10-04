import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import {
  addSkill,
  addSpecialization,
  hardDelete,
  moveSkill,
  renamePillar,
  setSkillVisibility,
  renameRoleType,
  renameSkill,
  renameSpecialization,
  setSpecializationKind,
  setStatus,
  promoteSuggestion,
  rejectSuggestion,
  skillLinks,
  specializationLinks,
} from "@/lib/catalog-write";

const Id = z.string().uuid();
const Name = z.string().trim().min(2).max(120);
const Kind = z.enum(["PRODUCT", "METHODOLOGY", "INDUSTRY"]);

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("spec.add"), name: Name, kind: Kind }),
  z.object({ action: z.literal("spec.rename"), id: Id, name: Name }),
  z.object({ action: z.literal("spec.kind"), id: Id, kind: Kind }),
  z.object({ action: z.literal("skill.add"), name: Name, roleTypeId: Id, pillarId: Id }),
  z.object({ action: z.literal("skill.rename"), id: Id, name: Name }),
  z.object({ action: z.literal("skill.move"), id: Id, roleTypeId: Id, pillarId: Id }),
  z.object({ action: z.literal("domain.rename"), id: Id, name: Name }),
  z.object({ action: z.literal("skill.visible"), id: Id, visible: z.boolean() }),
  z.object({ action: z.literal("role.rename"), id: Id, name: Name }),
  z.object({
    action: z.literal("status"),
    table: z.enum(["skill", "specialization"]),
    id: Id,
    status: z.enum(["ACTIVE", "RETIRED"]),
  }),
  z.object({ action: z.literal("spec.promote"), id: Id, kind: Kind }),
  z.object({ action: z.literal("spec.reject"), id: Id }),
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
      case "domain.rename":
        return renamePillar(b.id, b.name);
      case "skill.visible":
        return setSkillVisibility(b.id, b.visible);
      case "role.rename":
        return renameRoleType(b.id, b.name);
      case "spec.promote":
        return promoteSuggestion(b.id, b.kind);
      case "spec.reject":
        return rejectSuggestion(b.id);
      case "status":
        return setStatus(b.table, b.id, b.status);
      case "delete":
        return hardDelete(b.table, b.id);
    }
  })();

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
