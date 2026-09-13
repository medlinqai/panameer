import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import {
  addSkill,
  addSpecialization,
  hardDelete,
  moveSkill,
  renamePillar,
  renameRoleType,
  renameSkill,
  renameSpecialization,
  setSpecializationKind,
  setStatus,
  skillLinks,
  specializationLinks,
} from "@/lib/catalog-write";

/**
 * THE CATALOG EDITOR'S ONE ENDPOINT (`P1-A1.5-E481`).
 *
 * > **SCOTT:** *"Only the ADMIN should add/update/delete."*
 *
 * ⚠ `canAdminister` ONLY, checked FIRST, on every verb. The catalog is the
 * vocabulary every provider profile, package and work request is built from —
 * it is Panameer Admin's, not a company owner's, exactly like `/admin/tax-rates`.
 *
 * ⚠ ONE ROUTE, A DISCRIMINATED UNION OF ACTIONS, rather than a dozen routes.
 * Every mutation shares the same guard, the same validation shape and the same
 * `WriteResult`, so there is one place to audit and no verb can quietly skip a
 * check by living in its own file.
 *
 * ⚠⚠ ALL THE RULES LIVE IN `lib/catalog-write.ts`, NOT HERE. This layer parses
 * and authorises; it never decides whether a delete is safe. A second copy of
 * "is it safe to delete this?" is how the two answers start disagreeing.
 */

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
  z.object({ action: z.literal("role.rename"), id: Id, name: Name }),
  z.object({
    action: z.literal("status"),
    table: z.enum(["skill", "specialization"]),
    id: Id,
    status: z.enum(["ACTIVE", "RETIRED"]),
  }),
  /* ⚠⚠ THERE IS NO `force` FIELD ON THIS ACTION AND THERE MUST NEVER BE ONE.
     `hardDelete` refuses at a non-zero link count and the only way past it is
     to remove the links first — a confirm dialog is not consent from the
     provider whose profile would lose the row. */
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
      case "role.rename":
        return renameRoleType(b.id, b.name);
      case "status":
        return setStatus(b.table, b.id, b.status);
      case "delete":
        return hardDelete(b.table, b.id);
    }
  })();

  /* ⚠ A REFUSAL IS A 409, NOT A 500. "This has 12 providers on it" is the
     endpoint working correctly, and the UI needs the count to offer Retire. */
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}

/**
 * ⚠ THE LINK COUNT, READ BEFORE THE ADMIN ACTS — never only in the error after.
 * The brief is explicit: *"Show the link count in the UI BEFORE the admin acts."*
 */
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
