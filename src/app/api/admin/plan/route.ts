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
  type RowPatch,
  type StoredRow,
} from "@/lib/plan/store";
import { planOwnerKey, isRowStatus, isRowType } from "@/lib/plan/model";
import { applyPanameerTemplate } from "@/lib/plan/template";
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
      /** ⚠⚠ THE REASON REACHES THE SCREEN. `store.ts` writes these messages for
       *  a person — "A plan is two levels deep" — and swallowing them into a
       *  generic 400 is how Tab-does-nothing becomes unexplainable. */
      return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    console.error("[plan] unexpected", e);
    return NextResponse.json({ error: "Something went wrong saving that." }, { status: 500 });
  }
}

function asId(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

/** `YYYY-MM-DD` → a UTC date, `""`/null → null. ⚠ Parsed as UTC on purpose:
 *  these are pure dates, and a local-midnight parse shifts them a day in
 *  America/New_York (`E775`'s rule, on the write side). */
function asDate(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function readPatch(body: Record<string, unknown>): RowPatch {
  const patch: RowPatch = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (isRowStatus(body.status)) patch.status = body.status;
  if (isRowType(body.type)) patch.type = body.type;
  if (body.owner !== undefined) patch.owner = body.owner === null ? null : String(body.owner);
  if (body.publicNote !== undefined) patch.public_note = body.publicNote === null ? null : String(body.publicNote);
  if (body.adminNote !== undefined) patch.admin_note = body.adminNote === null ? null : String(body.adminNote);
  if (body.releaseId !== undefined) patch.release_id = asId(body.releaseId);
  if (body.hours !== undefined) {
    patch.hours = body.hours === null || body.hours === "" ? null : Number(body.hours);
  }
  const start = asDate(body.startDate);
  if (start !== undefined) patch.start_date = start;
  const end = asDate(body.endDate);
  if (end !== undefined) patch.end_date = end;
  return patch;
}

/** Accept a row back only if it is shaped right AND belongs to this plan. */
function sanitiseRow(raw: unknown, planId: string): StoredRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || r.plan_id !== planId) return null;
  if (!isRowType(r.type) || !isRowStatus(r.status)) return null;
  const start = asDate(typeof r.start_date === "string" ? r.start_date.slice(0, 10) : r.start_date);
  const end = asDate(typeof r.end_date === "string" ? r.end_date.slice(0, 10) : r.end_date);
  return {
    id: r.id,
    plan_id: planId,
    parent_id: asId(r.parent_id),
    sort: typeof r.sort === "number" ? r.sort : 0,
    type: r.type,
    title: typeof r.title === "string" ? r.title : "",
    start_date: start ?? null,
    end_date: end ?? null,
    status: r.status,
    owner: r.owner === null || r.owner === undefined ? null : String(r.owner),
    hours: typeof r.hours === "number" ? r.hours : null,
    release_id: asId(r.release_id),
    public_note: r.public_note === null || r.public_note === undefined ? null : String(r.public_note),
    admin_note: r.admin_note === null || r.admin_note === undefined ? null : String(r.admin_note),
  };
}
