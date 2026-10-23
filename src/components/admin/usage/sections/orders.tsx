import { prisma } from "@/lib/prisma";
import { daysBetween, fmtDays, inCur, listHref, median, metric, series, type Ctx } from "@/lib/admin-usage/core";
import { isoDay, type Lists } from "@/lib/admin-usage/lists";
import { WORK_ORDER_LABEL } from "@/lib/oracle-status";
import { UsageChart } from "@/components/admin/usage/UsageChart";
import { Bars, DataTable, Grid2, Tile, Tiles } from "@/components/admin/usage/parts";

// A-E009: Orders — work orders by Oracle status, waiting on acceptance (and how long), change orders, holds / freezes, ERP vs web.
async function data(c: Ctx) {
  const [orders, revisions] = await Promise.all([
    prisma.workOrder.findMany({ select: { id: true, order_number: true, status: true, created_at: true, frozen_at: true, erp_connection_id: true, buyer_person_id: true, provider_person_id: true, buyer_accepted_at: true, provider_accepted_at: true } }),
    prisma.workOrderRevision.findMany({ select: { work_order_id: true, status: true, created_at: true } }),
  ]);
  const real = orders.filter((o) => c.personOk(o.buyer_person_id) || c.personOk(o.provider_person_id));
  const ids = new Set(real.map((o) => o.id));
  return { orders: real, revisions: revisions.filter((r) => ids.has(r.work_order_id)) };
}
const list = (title: string, rows: { id: string; order_number: string; created_at: Date; status: string }[]) => ({ title, head: ["Order", "Created", "Status"], rows: rows.map((o) => ({ cells: [o.order_number, isoDay(o.created_at), WORK_ORDER_LABEL[o.status as keyof typeof WORK_ORDER_LABEL] ?? o.status], href: `/orders/${o.id}` })) });
const waitingOn = (o: { status: string }) => o.status === "ISSUED" || o.status === "ACCEPTED";

export async function ordersLists(c: Ctx): Promise<Lists> {
  return {
    created: async () => list(`Orders created (${c.label})`, (await data(c)).orders.filter((o) => inCur(c, o.created_at))),
    waiting: async () => list("Waiting on acceptance", (await data(c)).orders.filter(waitingOn)),
    held: async () => list("On hold or frozen", (await data(c)).orders.filter((o) => o.status === "ON_HOLD" || o.frozen_at)),
    erp: async () => list("ERP orders", (await data(c)).orders.filter((o) => o.erp_connection_id)),
    ...Object.fromEntries(Object.keys(WORK_ORDER_LABEL).map((s) => [`status-${s}`, async () => list(`Status: ${WORK_ORDER_LABEL[s as keyof typeof WORK_ORDER_LABEL]}`, (await data(c)).orders.filter((o) => o.status === s))])),
  };
}

export async function Orders({ c }: { c: Ctx }) {
  const d = await data(c);
  const waiting = d.orders.filter(waitingOn);
  const now = new Date();
  const byLabel = new Map<string, { n: number; key: string }>();
  for (const o of d.orders) {
    const l = WORK_ORDER_LABEL[o.status as keyof typeof WORK_ORDER_LABEL] ?? o.status;
    const cur = byLabel.get(l) ?? { n: 0, key: `status-${o.status}` };
    cur.n++;
    byLabel.set(l, cur);
  }
  return (
    <div className="space-y-3">
      <UsageChart title="Orders Created per Day" subtitle={c.label} points={series(c, d.orders.map((o) => o.created_at))} />
      <Tiles>
        <Tile label="Orders Created" {...metric(c, d.orders.map((o) => o.created_at))} href={listHref(c, "created")} />
        <Tile label="Waiting on Acceptance" value={waiting.length} delta={waiting.length ? `median ${fmtDays(median(waiting.map((o) => daysBetween(o.created_at, now))))} waiting` : null} href={listHref(c, "waiting")} />
        <Tile label="Change Orders" {...metric(c, d.revisions.map((r) => r.created_at))} />
        <Tile label="On Hold / Frozen" value={d.orders.filter((o) => o.status === "ON_HOLD" || o.frozen_at).length} href={listHref(c, "held")} />
      </Tiles>
      <Grid2>
        <Bars title="By Status" subtitle="orders now (Oracle labels)" rows={[...byLabel.entries()].sort((a, b) => b[1].n - a[1].n).map(([label, v]) => ({ label, n: v.n, href: listHref(c, v.key) }))} />
        <Bars title="ERP vs Web" subtitle="orders now" rows={[
          { label: "ERP", n: d.orders.filter((o) => o.erp_connection_id).length, href: listHref(c, "erp") },
          { label: "Web", n: d.orders.filter((o) => !o.erp_connection_id).length },
        ]} />
      </Grid2>
      <DataTable title="Waiting on Acceptance" subtitle="oldest first" head={["Order", "Waiting", "Status"]} rows={[...waiting].sort((a, b) => a.created_at.getTime() - b.created_at.getTime()).map((o) => ({ cells: [o.order_number, fmtDays(daysBetween(o.created_at, now)), o.provider_accepted_at ? "Waiting on buyer" : "Waiting on provider"], href: `/orders/${o.id}` }))} />
    </div>
  );
}
