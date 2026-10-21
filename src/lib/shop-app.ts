import { prisma } from "@/lib/prisma";
import { providerLabel, providerNumbers, identityVisibleTo } from "@/lib/provider-number";
import type { Viewer } from "@/lib/access";
import { orderSlices, type Recurring } from "@/lib/slices";

// SA: Shop as an app — buyer SHOP | Overview · Browse · Compare · Cart · Offers · Purchases; seller Overview · Browse · My Products · Offers · Sales.
export type ShopSide = "buyer" | "seller";
export const COMPARE_COOKIE = "pm_compare";
const DAY = 86_400_000;
const TZ = "America/New_York";
const short = (d: Date) => d.toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric" });
const RELEASED = ["RELEASED", "ACTIVE", "ON_HOLD"] as const;

export async function shopPerson(viewer: Viewer) {
  return prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, is_service_provider: true } });
}
export const shopSideOf = (p: { is_service_provider: boolean } | null): ShopSide => (p?.is_service_provider ? "seller" : "buyer");

/** SA-E003: each Category's Product Types (its Business Types' Service Product Types), for the Browse bar. */
export async function productTypesByCategory(): Promise<Record<string, { id: string; name: string }[]>> {
  const rows = await prisma.serviceType.findMany({
    where: { kind: "SERVICE_PRODUCT", hidden: false, merged_into_id: null, status: { in: ["STOCK", "APPROVED"] } },
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, serviceCategory: { select: { commodityGroup: { select: { name: true } }, businessType: { select: { commodityGroup: { select: { name: true } } } } } } },
  });
  const out: Record<string, { id: string; name: string }[]> = {};
  for (const r of rows) {
    const cat = r.serviceCategory?.businessType?.commodityGroup?.name ?? r.serviceCategory?.commodityGroup?.name;
    if (!cat) continue;
    const list = (out[cat] ??= []);
    if (!list.some((x) => x.name === r.name)) list.push({ id: r.id, name: r.name });
  }
  return out;
}

/** Shop Work Orders (orders with a product line) on one side. */
function shopOrdersWhere(personId: string, side: ShopSide) {
  return { ...(side === "buyer" ? { buyer_person_id: personId } : { provider_person_id: personId }), lines: { some: { service_product_id: { not: null } } }, status: { not: "CANCELLED" as const } };
}

// ── SA-E001: counts (also fed into appCounts for the dashboard) ─────────────────────────────────────────────────
export async function shopCounts(personId: string, side: ShopSide) {
  // HB-E008: estimates are their own app — not counted in Shop.
  return shopCountsCore(personId, side);
}

async function shopCountsCore(personId: string, side: ShopSide) {
  if (side === "buyer") {
    const [offers, toAccept, orders, cart] = await Promise.all([
      prisma.serviceProductOffer.count({ where: { buyer_person_id: personId, status: "COUNTERED" } }),
      prisma.workOrder.count({ where: { ...shopOrdersWhere(personId, "buyer"), status: "ISSUED", buyer_accepted_at: null } }),
      prisma.workOrder.findMany({ where: shopOrdersWhere(personId, "buyer"), select: { id: true } }),
      prisma.workRequestLine.count({ where: { workRequest: { buyer_person_id: personId, source: "SHOP", status: "INCOMPLETE" } } }),
    ]);
    const deliveries = orders.length ? await prisma.paymentRequest.count({ where: { status: "SUBMITTED", work_order_id: { in: orders.map((o) => o.id) } } }) : 0;
    const purchases = toAccept + deliveries;
    return { total: offers + purchases, offers, purchases, sales: 0, cart, toAccept, deliveries, toDeliver: 0 };
  }
  const [offers, toAccept, released] = await Promise.all([
    prisma.serviceProductOffer.count({ where: { provider_person_id: personId, status: "OPEN" } }),
    prisma.workOrder.count({ where: { ...shopOrdersWhere(personId, "seller"), status: "ISSUED", provider_accepted_at: null } }),
    prisma.workOrder.findMany({ where: { ...shopOrdersWhere(personId, "seller"), status: { in: [...RELEASED] } }, select: { id: true } }),
  ]);
  const billed = released.length ? new Set((await prisma.paymentRequest.findMany({ where: { work_order_id: { in: released.map((o) => o.id) }, status: { in: ["SUBMITTED", "APPROVED", "PAID"] } }, select: { work_order_id: true } })).map((r) => r.work_order_id)) : new Set<string>();
  const toDeliver = released.filter((o) => !billed.has(o.id)).length;
  const sales = toAccept + toDeliver;
  return { total: offers + sales, offers, purchases: 0, sales, cart: 0, toAccept, deliveries: 0, toDeliver };
}

// ── SA-E005: Compare (cookie of product ids, one Product Type) ─────────────────────────────────────────────────
export const parseCompare = (raw: string | undefined) => (raw ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 3);

// ── SA-E006: Offers / Purchases / Sales ───────────────────────────────────────────────────────────────────────
export type ShopOfferRow = { typeName: string | null; category: string | null; completed: boolean; recurring: null; id: string; number: string; productId: string | null; product: string; listCents: number | null; amountCents: number; counterCents: number | null; status: string; respondBy: string | null; who: string; needsAction: boolean; createdAt: string };

export async function shopOffers(viewer: Viewer, personId: string, side: ShopSide): Promise<ShopOfferRow[]> {
  const rows = await prisma.serviceProductOffer.findMany({ where: { ...(side === "buyer" ? { buyer_person_id: personId } : { provider_person_id: personId }), service_product_id: { not: null } }, orderBy: { created_at: "desc" }, take: 100 });
  const products = await prisma.serviceProduct.findMany({ where: { id: { in: rows.map((r) => r.service_product_id!) } }, select: { id: true, title: true, price_cents: true, serviceType: { select: { name: true, serviceCategory: { select: { commodityGroup: { select: { name: true } }, businessType: { select: { commodityGroup: { select: { name: true } } } } } } } } } });
  const others = [...new Set(rows.map((r) => (side === "buyer" ? r.provider_person_id : r.buyer_person_id)))];
  const [people, profiles, seen] = await Promise.all([
    prisma.person.findMany({ where: { id: { in: others } }, select: { id: true, first_name: true, last_name: true, company: { select: { name: true } } } }),
    side === "buyer" ? prisma.providerProfile.findMany({ where: { person_id: { in: others } }, select: { id: true, person_id: true } }) : Promise.resolve([]),
    side === "buyer" ? identityVisibleTo(viewer, others) : Promise.resolve(new Set<string>()),
  ]);
  const nums = side === "buyer" ? await providerNumbers(profiles.map((p) => p.id)) : new Map<string, string>();
  const who = (id: string) => {
    const p = people.find((x) => x.id === id);
    if (side === "seller") return p?.company?.name ?? "A buyer";
    if (seen.has(id) && p) return `${p.first_name} ${p.last_name}`.trim();
    return providerLabel(nums.get(profiles.find((x) => x.person_id === id)?.id ?? ""));
  };
  return rows.map((r) => {
    const prod = products.find((x) => x.id === r.service_product_id);
    const respondBy = r.status === "OPEN" || r.status === "COUNTERED" ? new Date((r.countered_at ?? r.created_at).getTime() + 3 * DAY) : null;
    return {
      id: r.id, number: r.offer_number, productId: r.service_product_id, product: prod?.title ?? "(removed)", listCents: prod?.price_cents ?? null, amountCents: r.amount_cents, counterCents: r.counter_amount_cents,
      status: r.status, respondBy: respondBy ? short(respondBy) : null, who: who(side === "buyer" ? r.provider_person_id : r.buyer_person_id),
      needsAction: side === "buyer" ? r.status === "COUNTERED" : r.status === "OPEN", createdAt: short(r.created_at),
      completed: r.status !== "OPEN" && r.status !== "COUNTERED", recurring: null,
      typeName: prod?.serviceType?.name ?? null, category: prod?.serviceType?.serviceCategory?.businessType?.commodityGroup?.name ?? prod?.serviceType?.serviceCategory?.commodityGroup?.name ?? null,
    };
  });
}

export type ShopOrderRow = { stepIndex: number; stepDetail: string; typeName: string | null; category: string | null; completed: boolean; recurring: Recurring | null; productId: string | null; id: string; number: string; product: string; who: string; step: string; status: string; amountCents: number; needsAction: boolean; action: { label: string; href: string } | null; date: string };
const STEP_OF = (status: string, billed: boolean, paid: boolean) => (paid ? "Paid" : billed ? "Delivered" : (RELEASED as readonly string[]).includes(status) || status === "CLOSED" ? "Work Order" : "Work Order");

export async function shopOrders(viewer: Viewer, personId: string, side: ShopSide): Promise<ShopOrderRow[]> {
  const orders = await prisma.workOrder.findMany({
    where: shopOrdersWhere(personId, side), orderBy: { created_at: "desc" }, take: 100,
    select: { id: true, order_number: true, status: true, created_at: true, buyer_accepted_at: true, provider_accepted_at: true, buyer_person_id: true, provider_person_id: true, lines: { select: { service_product_id: true, unit_price_cents: true, amount_cents: true, quantity: true } } },
  });
  const ids = orders.map((o) => o.id);
  const prs = ids.length ? await prisma.paymentRequest.findMany({ where: { work_order_id: { in: ids } }, select: { work_order_id: true, status: true } }) : [];
  const products = await prisma.serviceProduct.findMany({ where: { id: { in: orders.flatMap((o) => o.lines.map((l) => l.service_product_id!).filter(Boolean)) } }, select: { id: true, title: true, serviceType: { select: { name: true, serviceCategory: { select: { commodityGroup: { select: { name: true } }, businessType: { select: { commodityGroup: { select: { name: true } } } } } } } } } });
  const others = [...new Set(orders.map((o) => (side === "buyer" ? o.provider_person_id : o.buyer_person_id)))];
  const [people, profiles, seen] = await Promise.all([
    prisma.person.findMany({ where: { id: { in: others } }, select: { id: true, first_name: true, last_name: true, company: { select: { name: true } } } }),
    prisma.providerProfile.findMany({ where: { person_id: { in: others } }, select: { id: true, person_id: true } }),
    side === "buyer" ? identityVisibleTo(viewer, others) : Promise.resolve(new Set<string>()),
  ]);
  const nums = await providerNumbers(profiles.map((p) => p.id));
  const slices = await orderSlices(ids);
  return orders.map((o) => {
    const mine = prs.filter((p) => p.work_order_id === o.id);
    const billed = mine.some((p) => ["SUBMITTED", "APPROVED", "PAID"].includes(p.status));
    const paid = mine.some((p) => p.status === "PAID");
    const other = side === "buyer" ? o.provider_person_id : o.buyer_person_id;
    const pp = people.find((x) => x.id === other);
    const who = side === "seller" ? pp?.company?.name ?? "A buyer" : seen.has(other) && pp ? `${pp.first_name} ${pp.last_name}`.trim() : providerLabel(nums.get(profiles.find((x) => x.person_id === other)?.id ?? ""));
    const product = o.lines.map((l) => products.find((p) => p.id === l.service_product_id)?.title).filter(Boolean).join(", ") || "Product";
    const amount = o.lines.reduce((n, l) => n + (l.amount_cents ?? Math.round(Number(l.quantity ?? 1) * (l.unit_price_cents ?? 0))), 0);
    let action: ShopOrderRow["action"] = null;
    let needs = false;
    if (side === "buyer") {
      if (o.status === "ISSUED" && !o.buyer_accepted_at) { action = { label: "Accept", href: `/orders/${o.id}` }; needs = true; }
      else if (mine.some((p) => p.status === "SUBMITTED")) { action = { label: "Approve Delivery", href: `/orders/${o.id}?tab=settlements` }; needs = true; }
      else if (mine.some((p) => p.status === "APPROVED")) { action = { label: "Pay", href: "/pay" }; needs = true; }
    } else {
      if (o.status === "ISSUED" && !o.provider_accepted_at) { action = { label: "Accept", href: `/orders/${o.id}` }; needs = true; }
      else if ((RELEASED as readonly string[]).includes(o.status) && !billed) { action = { label: "Deliver & request payment", href: `/orders/${o.id}?tab=settlements` }; needs = true; }
    }
    // PA-E006: where it is and what is next — Browse · Offer · WR · WO · Delivered · Paid (0-5).
    const approved = mine.some((p) => p.status === "APPROVED");
    const stepIndex = paid ? 5 : billed ? 4 : 3;
    const you = (b: boolean) => (b ? "waiting for you" : side === "buyer" ? "waiting for the provider" : "waiting for the buyer");
    const stepDetail = paid ? "Paid"
      : approved ? `Delivered · payment ${side === "buyer" ? "due from you" : "on the way"}`
      : billed ? `Delivered · ${you(side === "buyer")} to approve`
      : o.status === "ISSUED" && !o.buyer_accepted_at ? `Work Order · ${you(side === "buyer")} to accept`
      : o.status === "ISSUED" ? `Work Order · ${you(side === "seller")} to accept`
      : (RELEASED as readonly string[]).includes(o.status) ? `Work Order · Released · ${side === "seller" ? "deliver and request payment" : "in delivery"}`
      : o.status === "CLOSED" || o.status === "FINALLY_CLOSED" ? "Work Order · Closed" : `Work Order · ${o.status.toLowerCase().replace(/_/g, " ")}`;
    const sl = slices.get(o.id);
    const firstProd = products.find((p) => p.id === o.lines.find((l) => l.service_product_id)?.service_product_id);
    return { stepIndex, stepDetail, typeName: firstProd?.serviceType?.name ?? null, category: firstProd?.serviceType?.serviceCategory?.businessType?.commodityGroup?.name ?? firstProd?.serviceType?.serviceCategory?.commodityGroup?.name ?? null, completed: !!sl?.completed || (paid && !sl?.recurring), recurring: sl?.recurring ?? null, productId: o.lines.find((l) => l.service_product_id)?.service_product_id ?? null, id: o.id, number: o.order_number, product, who, step: STEP_OF(o.status, billed, paid), status: o.status, amountCents: amount, needsAction: needs, action: action ?? { label: "Open", href: `/orders/${o.id}` }, date: short(o.created_at) };
  });
}

/** SA-E002: the Shop strip — Browse → Offer → Work Request → Work Order → Delivered → Paid. */
export async function shopStrip(viewer: Viewer, personId: string, side: ShopSide) {
  const [offers, orders, cart] = await Promise.all([
    prisma.serviceProductOffer.count({ where: { ...(side === "buyer" ? { buyer_person_id: personId } : { provider_person_id: personId }), status: { in: ["OPEN", "COUNTERED"] } } }),
    shopOrders(viewer, personId, side),
    side === "buyer" ? prisma.workRequestLine.count({ where: { workRequest: { buyer_person_id: personId, source: "SHOP", status: "INCOMPLETE" } } }) : Promise.resolve(0),
  ]);
  const by = (s: string) => orders.filter((o) => o.step === s).length;
  const base = side === "buyer" ? "/shop?tab=purchases" : "/shop?tab=sales";
  return [
    { key: "browse", label: "Browse", count: 0, href: "/shop?tab=browse" },
    { key: "offer", label: "Offer", count: offers, href: "/shop?tab=offers" },
    { key: "wr", label: "Work Request", count: cart, href: side === "buyer" ? "/shop?tab=cart" : base },
    { key: "wo", label: "Work Order", count: by("Work Order"), href: `${base}&step=Work+Order` },
    { key: "delivered", label: "Delivered", count: by("Delivered"), href: `${base}&step=Delivered` },
    { key: "paid", label: "Paid", count: by("Paid"), href: `${base}&step=Paid` },
  ];
}
