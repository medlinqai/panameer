import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import {
  PlanError,
  addRow,
  copyPlan,
  deleteRow,
  ensurePlan,
  getPlan,
  indentRow,
  moveRow,
  outdentRow,
  renamePlan,
  restoreRows,
  updateRow,
  type StoredRow,
} from "@/lib/plan/store";
import { planOwnerKey, isRowType } from "@/lib/plan/model";
import { applyPanameerTemplate } from "@/lib/plan/template";
import { asId, readPatch, sanitiseRow } from "@/lib/plan/request";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const ownerKey = typeof body.ownerKey === "string" && body.ownerKey ? body.ownerKey : planOwnerKey();

  try {
    const plan = await ensurePlan(ownerKey, "Panameer build", gate);

    switch (action) {
      case "add": {
        const row = await addRow(
          {
            planId: plan.id,
            type: isRowType(body.type) ? body.type : "task",
            parentId: asId(body.parentId),
            afterId: asId(body.afterId),
            title: typeof body.title === "string" ? body.title : "",
          },
          gate,
        );
        return NextResponse.json({ ok: true, row });
      }

      case "update": {
        const row = await updateRow(String(body.rowId ?? ""), readPatch(body), gate);
        return NextResponse.json({ ok: true, row });
      }

      case "indent":
        return NextResponse.json({ ok: true, row: await indentRow(String(body.rowId ?? ""), gate) });

      case "outdent":
        return NextResponse.json({ ok: true, row: await outdentRow(String(body.rowId ?? ""), gate) });

      case "move": {
        const row = await moveRow(
          String(body.rowId ?? ""),
          {
            delta: typeof body.delta === "number" ? body.delta : undefined,
            index: typeof body.index === "number" ? body.index : undefined,
            parentId:
              "parentId" in body
                ? typeof body.parentId === "string" && body.parentId
                  ? body.parentId
                  : null
                : undefined,
          },
          gate,
        );
        return NextResponse.json({ ok: true, row });
      }

      case "delete": {
        const removed = await deleteRow(String(body.rowId ?? ""), gate);
        return NextResponse.json({ ok: true, removed });
      }

      case "restore": {
        const rows = Array.isArray(body.rows) ? (body.rows as unknown[]) : [];
        const safe = rows.map((r) => sanitiseRow(r, plan.id)).filter((r): r is StoredRow => r !== null);
        if (safe.length !== rows.length) {
          return NextResponse.json({ error: "Those rows don't belong to this plan." }, { status: 400 });
        }
        return NextResponse.json({ ok: true, restored: await restoreRows(safe, gate) });
      }

      case "rename":
        return NextResponse.json({ ok: true, plan: await renamePlan(plan.id, String(body.title ?? ""), gate) });

      case "template":
        return NextResponse.json({ ok: true, ...(await applyPanameerTemplate(plan.id, gate)) });

      case "copy": {
        const from = String(body.from ?? "");
        if (!from) return NextResponse.json({ error: "Name the plan to copy from." }, { status: 400 });
        return NextResponse.json({ ok: true, ...(await copyPlan(from, ownerKey, plan.title, gate)) });
      }

      case "clear": {
        const { count } = await prisma.planRow.deleteMany({ where: { plan_id: plan.id } });
        await prisma.plan.update({ where: { id: plan.id }, data: { updated_by: gate.userId } });
        return NextResponse.json({ ok: true, cleared: count });
      }

      case "read":
        return NextResponse.json({ ok: true, plan: await getPlan(ownerKey) });

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof PlanError) {
      /** THE REASON REACHES THE SCREEN. `store.ts` writes these messages for */
      return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    console.error("[plan] unexpected", e);
    return NextResponse.json({ error: "Something went wrong saving that." }, { status: 500 });
  }
}
