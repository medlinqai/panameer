import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import {
  PlanError, addRow, copyPlan, deleteRow, ensurePlan, getPlan, indentRow, moveRow, outdentRow, renamePlan, restoreRows, updateRow, type StoredRow,
} from "@/lib/plan/store";
import { isRowType } from "@/lib/plan/model";
import { asId, readPatch, sanitiseRow } from "@/lib/plan/request";
import { WoPlanError, copyableOrders, recordWoEvent, seedMilestones, seedTemplate, woPlanKey, woPlanParty } from "@/lib/wo-plan";

// Work Order Plan (R2): the buyer or provider edits their order's plan. The owner key is never taken from the client.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const action = typeof body.action === "string" ? body.action : "";

  try {
    const { order, personId } = await woPlanParty(gate, id);
    const key = woPlanKey(order.id);
    const plan = await ensurePlan(key, order.order_number, gate);
    const ownRow = async (rowId: string) => {
      const r = await prisma.planRow.findUnique({ where: { id: rowId }, select: { plan_id: true } });
      if (!r || r.plan_id !== plan.id) throw new PlanError("That row isn't on this work order's plan.", "NOT_FOUND");
      return rowId;
    };
    const edited = (text = "edited the plan") => recordWoEvent(order.id, personId, "plan.edit", text);
    const empty = async () => {
      if ((await prisma.planRow.count({ where: { plan_id: plan.id } })) > 0) throw new PlanError("This plan already has rows. Clear it first.", "INVALID");
    };

    switch (action) {
      case "add": {
        const parentId = asId(body.parentId);
        if (parentId) await ownRow(parentId);
        const afterId = asId(body.afterId);
        if (afterId) await ownRow(afterId);
        const row = await addRow({ planId: plan.id, type: isRowType(body.type) ? body.type : "task", parentId, afterId, title: typeof body.title === "string" ? body.title : "" }, gate);
        await edited();
        return NextResponse.json({ ok: true, row });
      }
      case "update": {
        const row = await updateRow(await ownRow(String(body.rowId ?? "")), readPatch(body), gate);
        await edited();
        return NextResponse.json({ ok: true, row });
      }
      case "indent":
        return NextResponse.json({ ok: true, row: await indentRow(await ownRow(String(body.rowId ?? "")), gate) });
      case "outdent":
        return NextResponse.json({ ok: true, row: await outdentRow(await ownRow(String(body.rowId ?? "")), gate) });
      case "move": {
        const parentId = "parentId" in body ? (typeof body.parentId === "string" && body.parentId ? await ownRow(body.parentId) : null) : undefined;
        const row = await moveRow(await ownRow(String(body.rowId ?? "")), { delta: typeof body.delta === "number" ? body.delta : undefined, index: typeof body.index === "number" ? body.index : undefined, parentId }, gate);
        await edited();
        return NextResponse.json({ ok: true, row });
      }
      case "delete": {
        const removed = await deleteRow(await ownRow(String(body.rowId ?? "")), gate);
        await edited();
        return NextResponse.json({ ok: true, removed });
      }
      case "restore": {
        const rows = Array.isArray(body.rows) ? (body.rows as unknown[]) : [];
        const safe = rows.map((r) => sanitiseRow(r, plan.id)).filter((r): r is StoredRow => r !== null);
        if (safe.length !== rows.length) return NextResponse.json({ error: "Those rows don't belong to this plan." }, { status: 400 });
        return NextResponse.json({ ok: true, restored: await restoreRows(safe, gate) });
      }
      case "rename":
        return NextResponse.json({ ok: true, plan: await renamePlan(plan.id, String(body.title ?? ""), gate) });
      case "te":
        await recordWoEvent(order.id, personId, "plan.start", "chose T&E only (no plan)");
        return NextResponse.json({ ok: true });
      case "milestones":
        await empty();
        await seedMilestones(plan.id, order, gate.userId);
        await recordWoEvent(order.id, personId, "plan.start", "set up the plan from simple milestones");
        return NextResponse.json({ ok: true });
      case "template":
        await empty();
        await seedTemplate(plan.id, order, gate.userId);
        await recordWoEvent(order.id, personId, "plan.start", "set up the plan from the template");
        return NextResponse.json({ ok: true });
      case "copy": {
        const from = String(body.from ?? "");
        const allowed = await copyableOrders(personId, order.id);
        const src = allowed.find((o) => o.id === from);
        if (!src) return NextResponse.json({ error: "Pick one of your past work orders that has a plan." }, { status: 400 });
        await copyPlan(woPlanKey(src.id), key, plan.title, gate);
        await recordWoEvent(order.id, personId, "plan.start", `copied the plan from ${src.number}`);
        return NextResponse.json({ ok: true });
      }
      case "clear": {
        const { count } = await prisma.planRow.deleteMany({ where: { plan_id: plan.id } });
        await recordWoEvent(order.id, personId, "plan.clear", "cleared the plan");
        return NextResponse.json({ ok: true, cleared: count });
      }
      case "read":
        return NextResponse.json({ ok: true, plan: await getPlan(key) });
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof WoPlanError) return NextResponse.json({ error: e.message }, { status: 404 });
    if (e instanceof PlanError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    console.error("[orders/plan] failed:", e);
    return NextResponse.json({ error: "Something went wrong saving that." }, { status: 500 });
  }
}
