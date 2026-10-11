import { prisma } from "@/lib/prisma";
import { daysBetween, fmtDays, inCur, listHref, median, metric, series, type Ctx } from "@/lib/admin-usage/core";
import { isoDay, type Lists } from "@/lib/admin-usage/lists";
import { UsageChart } from "@/components/admin/usage/UsageChart";
import { Bars, Grid2, Tile, Tiles } from "@/components/admin/usage/parts";

// A-E007: Work — work requests posted / active / awarded / canceled, proposals per request, median days to award
// (posted → its first work order).
async function data(c: Ctx) {
  const [wrs, proposals, orders] = await Promise.all([
    prisma.workRequest.findMany({ where: { status: { not: "DRAFT" } }, select: { id: true, title: true, buyer_person_id: true, status: true, posted_at: true, updated_at: true } }),
    prisma.proposal.findMany({ where: { submitted_at: { not: null } }, select: { work_request_id: true, provider_person_id: true, submitted_at: true } }),
    prisma.workOrder.findMany({ where: { work_request_id: { not: null } }, select: { work_request_id: true, created_at: true } }),
  ]);
  const real = wrs.filter((w) => c.personOk(w.buyer_person_id));
  const firstOrder = new Map<string, Date>();
  for (const o of orders) if (!firstOrder.get(o.work_request_id!) || o.created_at < firstOrder.get(o.work_request_id!)!) firstOrder.set(o.work_request_id!, o.created_at);
  return { wrs: real, proposals: proposals.filter((p) => c.personOk(p.provider_person_id)), firstOrder };
}
const list = (title: string, rows: { id: string; title: string; posted_at: Date | null; status: string }[]) => ({ title, head: ["Work request", "Posted", "Status"], rows: rows.map((w) => ({ cells: [w.title || "Untitled", isoDay(w.posted_at), w.status], href: `/work-requests/${w.id}` })) });

export async function workLists(c: Ctx): Promise<Lists> {
  return {
    posted: async () => list(`Posted (${c.label})`, (await data(c)).wrs.filter((w) => inCur(c, w.posted_at))),
    active: async () => list("Active now (posted, not yet awarded)", (await data(c)).wrs.filter((w) => w.status === "POSTED")),
    awarded: async () => { const d = await data(c); return list(`Awarded (${c.label})`, d.wrs.filter((w) => inCur(c, d.firstOrder.get(w.id)))); },
    canceled: async () => list(`Canceled (${c.label})`, (await data(c)).wrs.filter((w) => w.status === "CANCELLED" && inCur(c, w.updated_at))),
  };
}

export async function Work({ c }: { c: Ctx }) {
  const d = await data(c);
  const posted = d.wrs.filter((w) => inCur(c, w.posted_at));
  const perReq = posted.map((w) => d.proposals.filter((p) => p.work_request_id === w.id).length);
  const toAward = d.wrs.filter((w) => w.posted_at && inCur(c, d.firstOrder.get(w.id))).map((w) => daysBetween(w.posted_at!, d.firstOrder.get(w.id)!));
  return (
    <div className="space-y-3">
      <UsageChart title="Work Requests Posted per Day" subtitle={c.label} points={series(c, d.wrs.map((w) => w.posted_at))} />
      <Tiles>
        <Tile label="Posted" {...metric(c, d.wrs.map((w) => w.posted_at))} href={listHref(c, "posted")} />
        <Tile label="Active Now" value={d.wrs.filter((w) => w.status === "POSTED").length} href={listHref(c, "active")} />
        <Tile label="Awarded" {...metric(c, d.wrs.map((w) => d.firstOrder.get(w.id)))} href={listHref(c, "awarded")} />
        <Tile label="Median Days to Award" value={fmtDays(median(toAward))} />
      </Tiles>
      <Grid2>
        <Bars title="Status" subtitle="work requests now" rows={[
          { label: "Posted", n: d.wrs.filter((w) => w.status === "POSTED").length, href: listHref(c, "active") },
          { label: "Awarded", n: d.wrs.filter((w) => w.status === "ASSIGNED" || w.status === "ORDERED").length },
          { label: "Canceled", n: d.wrs.filter((w) => w.status === "CANCELLED").length, href: listHref(c, "canceled") },
        ]} />
        <Bars title="Proposals per Request" subtitle={`requests posted ${c.label}`} rows={[
          { label: "Average", n: perReq.length ? Math.round((perReq.reduce((a, b) => a + b, 0) / perReq.length) * 10) / 10 : 0 },
          { label: "With none", n: perReq.filter((n) => n === 0).length },
          { label: "With 3 or more", n: perReq.filter((n) => n >= 3).length },
        ]} />
      </Grid2>
    </div>
  );
}
