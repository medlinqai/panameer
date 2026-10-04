import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { pricedByQuantity } from "@/lib/transaction-spine";

// Work Order Plan (R2): each work order may own one plan in the shared Plan tool, keyed wo:<orderId>.
export const woPlanKey = (orderId: string) => `wo:${orderId}`;

export class WoPlanError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "INVALID") {
    super(message);
    this.name = "WoPlanError";
  }
}

/** The viewer must be the order's buyer or provider; both may edit the plan (brief proposal 3). */
export async function woPlanParty(viewer: Viewer, orderId: string) {
  const person = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!person) throw new WoPlanError("Work order not found", "NOT_FOUND");
  const order = await prisma.workOrder.findFirst({
    where: { id: orderId, OR: [{ buyer_person_id: person.id }, { provider_person_id: person.id }] },
    include: { lines: { orderBy: { line_number: "asc" } } },
  });
  if (!order) throw new WoPlanError("Work order not found", "NOT_FOUND");
  return { order, personId: person.id, party: order.buyer_person_id === person.id ? ("BUYER" as const) : ("PROVIDER" as const) };
}

/** History entry; repeated edits by one person within 10 minutes fold into one line. */
export async function recordWoEvent(orderId: string, personId: string | null, kind: string, text: string) {
  if (kind === "plan.edit" && personId) {
    const last = await prisma.workOrderEvent.findFirst({
      where: { work_order_id: orderId, person_id: personId, kind, created_at: { gt: new Date(Date.now() - 10 * 60_000) } },
      orderBy: { created_at: "desc" },
      select: { id: true },
    });
    if (last) {
      await prisma.workOrderEvent.update({ where: { id: last.id }, data: { created_at: new Date() } });
      return;
    }
  }
  await prisma.workOrderEvent.create({ data: { work_order_id: orderId, person_id: personId, kind, text } });
}

type Seed = { type: string; title: string; start?: Date | null; end?: Date | null; hours?: number | null; children?: Seed[] };

async function writeSeed(planId: string, seeds: Seed[], userId: string) {
  await prisma.$transaction(async (tx) => {
    for (const [i, s] of seeds.entries()) {
      const parent = await tx.planRow.create({
        data: { plan_id: planId, parent_id: null, sort: i, type: s.type, title: s.title, start_date: s.start ?? null, end_date: s.end ?? null, hours: s.hours ?? null, updated_by: userId },
        select: { id: true },
      });
      for (const [j, c] of (s.children ?? []).entries())
        await tx.planRow.create({
          data: { plan_id: planId, parent_id: parent.id, sort: j, type: c.type, title: c.title, start_date: c.start ?? null, end_date: c.end ?? null, hours: c.hours ?? null, updated_by: userId },
        });
    }
  });
}

type Order = Awaited<ReturnType<typeof woPlanParty>>["order"];

/** "Simple milestones": one delivery phase with a task per order line, then an acceptance milestone. */
export async function seedMilestones(planId: string, order: Order, userId: string) {
  const end = order.period_end ?? null;
  await writeSeed(
    planId,
    [
      {
        type: "phase",
        title: "Delivery",
        start: order.period_start,
        end,
        children: order.lines.map((l) => ({
          type: "task",
          title: l.description,
          start: l.service_start ?? order.period_start,
          end: l.service_end ?? end,
          hours: pricedByQuantity(l.transaction_type) && l.quantity != null ? Math.round(Number(l.quantity)) : null,
        })),
      },
      { type: "milestone", title: "Acceptance", start: end, end },
    ],
    userId
  );
}

/** "Template": a standard engagement shape the parties then date. */
export async function seedTemplate(planId: string, order: Order, userId: string) {
  await writeSeed(
    planId,
    [
      { type: "phase", title: "Kickoff", start: order.period_start, children: [{ type: "task", title: "Agree scope and contacts" }, { type: "task", title: "Access and environments" }] },
      { type: "phase", title: "Delivery", children: order.lines.map((l) => ({ type: "task", title: l.description })) },
      { type: "phase", title: "Review and acceptance", end: order.period_end, children: [{ type: "task", title: "Walkthrough with the buyer" }] },
      { type: "milestone", title: "Sign-off", start: order.period_end, end: order.period_end },
    ],
    userId
  );
}

/** Work orders this person is a party to that already have a plan with rows (for "Copy a past work order"). */
export async function copyableOrders(personId: string, exceptOrderId: string) {
  const orders = await prisma.workOrder.findMany({
    where: { id: { not: exceptOrderId }, OR: [{ buyer_person_id: personId }, { provider_person_id: personId }] },
    select: { id: true, order_number: true },
    orderBy: { created_at: "desc" },
    take: 50,
  });
  const plans = await prisma.plan.findMany({ where: { owner_key: { in: orders.map((o) => woPlanKey(o.id)) } }, select: { owner_key: true, _count: { select: { rows: true } } } });
  const withRows = new Set(plans.filter((p) => p._count.rows > 0).map((p) => p.owner_key));
  return orders.filter((o) => withRows.has(woPlanKey(o.id))).map((o) => ({ id: o.id, number: o.order_number }));
}
