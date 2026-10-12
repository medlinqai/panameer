import { prisma } from "@/lib/prisma";
import { inCur, listHref, metric, series, type Ctx } from "@/lib/admin-usage/core";
import { isoDay, type Lists } from "@/lib/admin-usage/lists";
import { UsageChart } from "@/components/admin/usage/UsageChart";
import { Bars, Grid2, Tile, Tiles } from "@/components/admin/usage/parts";

// A-E008: Shop — services and service products published, estimates sent / accepted / changes requested / declined, product orders.
async function data(c: Ctx) {
  const [svcs, products, estimates, lines] = await Promise.all([
    prisma.providerService.findMany({ where: { published_at: { not: null } }, select: { id: true, name: true, published_at: true, provider_profile_id: true } }),
    prisma.serviceProduct.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, created_at: true, updated_at: true, providerProfile: { select: { person_id: true } } } }),
    prisma.costEstimate.findMany({ select: { id: true, estimate_number: true, title: true, status: true, sent_at: true, decided_at: true, provider_person_id: true } }),
    prisma.workOrderLine.findMany({ where: { service_product_id: { not: null } }, select: { workOrder: { select: { id: true, order_number: true, created_at: true, buyer_person_id: true } } } }),
  ]);
  const orders = new Map(lines.map((l) => [l.workOrder.id, l.workOrder]));
  const personOf = new Map((await prisma.providerProfile.findMany({ where: { id: { in: svcs.map((s) => s.provider_profile_id) } }, select: { id: true, person_id: true } })).map((p) => [p.id, p.person_id]));
  return {
    svcs: svcs.filter((s) => c.personOk(personOf.get(s.provider_profile_id))),
    products: products.filter((p) => c.personOk(p.providerProfile.person_id)),
    estimates: estimates.filter((e) => c.personOk(e.provider_person_id)),
    orders: [...orders.values()].filter((o) => c.personOk(o.buyer_person_id)),
  };
}

export async function shopLists(c: Ctx): Promise<Lists> {
  const est = async (f: (e: Awaited<ReturnType<typeof data>>["estimates"][number]) => boolean, title: string) => ({ title, head: ["Estimate", "Sent", "Status"], rows: (await data(c)).estimates.filter(f).map((e) => ({ cells: [`${e.estimate_number} · ${e.title}`, isoDay(e.sent_at), e.status], href: `/estimates/${e.id}` })) });
  return {
    services: async () => ({ title: `Services published (${c.label})`, head: ["Service", "Published"], rows: (await data(c)).svcs.filter((s) => inCur(c, s.published_at)).map((s) => ({ cells: [s.name, isoDay(s.published_at)] })) }),
    products: async () => ({ title: "Service products published (now)", head: ["Service product", "Created"], rows: (await data(c)).products.map((p) => ({ cells: [p.title, isoDay(p.created_at)], href: `/shop/${p.id}` })) }),
    sent: () => est((e) => inCur(c, e.sent_at), `Estimates sent (${c.label})`),
    accepted: () => est((e) => e.status === "ACCEPTED" && inCur(c, e.decided_at), `Accepted (${c.label})`),
    changes: () => est((e) => e.status === "CHANGES_REQUESTED" && inCur(c, e.decided_at), `Changes requested (${c.label})`),
    declined: () => est((e) => e.status === "DECLINED" && inCur(c, e.decided_at), `Declined (${c.label})`),
    orders: async () => ({ title: `Product orders (${c.label})`, head: ["Work order", "Placed"], rows: (await data(c)).orders.filter((o) => inCur(c, o.created_at)).map((o) => ({ cells: [o.order_number, isoDay(o.created_at)], href: `/orders/${o.id}` })) }),
  };
}

export async function Shop({ c }: { c: Ctx }) {
  const d = await data(c);
  const decided = (s: string) => d.estimates.filter((e) => e.status === s).map((e) => e.decided_at);
  return (
    <div className="space-y-3">
      <UsageChart title="Product Orders per Day" subtitle={c.label} points={series(c, d.orders.map((o) => o.created_at))} />
      <Tiles>
        <Tile label="Services Published" {...metric(c, d.svcs.map((s) => s.published_at))} href={listHref(c, "services")} />
        <Tile label="Service Products Live" value={d.products.length} delta="published now" href={listHref(c, "products")} />
        <Tile label="Estimates Sent" {...metric(c, d.estimates.map((e) => e.sent_at))} href={listHref(c, "sent")} />
        <Tile label="Product Orders" {...metric(c, d.orders.map((o) => o.created_at))} href={listHref(c, "orders")} />
      </Tiles>
      <Grid2>
        <Bars title="Estimates" subtitle={`answered ${c.label}`} rows={[
          { label: "Accepted", n: decided("ACCEPTED").filter((x) => inCur(c, x)).length, href: listHref(c, "accepted") },
          { label: "Changes requested", n: decided("CHANGES_REQUESTED").filter((x) => inCur(c, x)).length, href: listHref(c, "changes") },
          { label: "Declined", n: decided("DECLINED").filter((x) => inCur(c, x)).length, href: listHref(c, "declined") },
        ]} />
        <div />
      </Grid2>
    </div>
  );
}
