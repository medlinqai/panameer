// SH-E001..E004 dev walk: buyer adds two products from two providers → Place Order → two work orders (one Open, one Waiting)
// → provider accepts → milestone reported → payment request; punchout returns the cart. Throwaway rows removed.
// Run: MAIL_CAPTURE=1 npx tsx --env-file=.env.local scripts/dev-walk-shop-cart.ts
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { addToCart, cartFor, placeOrder, removeLine, setQuantity } from "@/lib/cart";
import { acceptOrder } from "@/lib/orders";
import { reportMilestone } from "@/lib/order-milestones";
import { sessionFor, startSession } from "@/lib/erp/punchout";
import { addProductToCart, cartLines, returnCart } from "@/lib/erp/cart";
import { hashSecret } from "@/lib/erp/connections";
import { check, cleanup, done, made, party, refuses } from "./lib/dev-fixture";

const products: string[] = [];
async function product(profileId: string, title: string, priceCents: number, milestones: { label: string; percent: number; trigger: "ORDER_ACCEPTED" | "ACCEPTANCE" }[]) {
  const p = await prisma.serviceProduct.create({ data: { provider_profile_id: profileId, title, price_cents: priceCents, status: "PUBLISHED", payment_terms: "NET30", payment_trigger: "ACCEPTANCE", milestones: { create: milestones.map((m, i) => ({ ...m, sequence: i + 1 })) } } });
  products.push(p.id);
  return p.id;
}

/** Throwaway company → Validated (legal name, tax ID, W-9, payout), so the sign gate passes. */
async function validate(personId: string) {
  const per = await prisma.person.findUniqueOrThrow({ where: { id: personId }, select: { company_id: true } });
  await prisma.company.update({ where: { id: per.company_id! }, data: { legal_name: "Walk Co LLC", tin: "12-3456789", country: "US", tax_form_uploaded_at: new Date() } });
  await prisma.companyMembership.create({ data: { person_id: personId, company_id: per.company_id!, role: "ADMIN", status: "APPROVED" } });
  await prisma.payoutMethod.create({ data: { person_id: personId, company_id: per.company_id!, kind: "BANK_ACCOUNT", label: "Walk Bank", last4: "0000", country: "US" } });
}

async function main() {
  const buyer = await party("BUYER", "Bea");
  const auto = await party("PROVIDER", "Ada");
  const man = await party("PROVIDER", "Max");
  await prisma.providerProfile.update({ where: { id: man.profileId! }, data: { accepts_orders_manually: true } });
  const p1 = await product(auto.profileId!, "Supplier Portal Quick Start", 500000, [{ label: "Kickoff", percent: 50, trigger: "ORDER_ACCEPTED" }, { label: "Delivery", percent: 50, trigger: "ACCEPTANCE" }]);
  const p2 = await product(man.profileId!, "Procurement Health Check", 250000, []);

  await refuses("can't buy your own product", () => addToCart(auto.viewer, p1), "own");
  await addToCart(buyer.viewer, p1);
  await addToCart(buyer.viewer, p2);
  await addToCart(buyer.viewer, p2); // a second Buy Now keeps one line
  let cart = await cartFor(buyer.viewer);
  check("cart groups two providers, one line each, listed prices", cart.groups.length === 2 && cart.groups.every((g) => g.lines.length === 1) && cart.totalCents === 750000);
  check("payment schedule shown per line", cart.groups.find((g) => g.providerPersonId === auto.personId)!.lines[0].schedule === "50% Kickoff at order · 50% Delivery on delivery");
  const l2 = cart.groups.find((g) => g.providerPersonId === man.personId)!.lines[0];
  await setQuantity(buyer.viewer, l2.id, 2);
  cart = await cartFor(buyer.viewer);
  check("quantity updates the totals", cart.totalCents === 1000000);
  check("buyer side turned on", !!(await prisma.requesterProfile.findUnique({ where: { person_id: buyer.personId } })));
  await refuses("someone else can't touch the line", () => setQuantity(auto.viewer, l2.id, 5), "isn't in your cart");

  await refuses("Place Order needs both companies validated", () => placeOrder(buyer.viewer), "Validate");
  for (const x of [buyer, auto, man]) await validate(x.personId);
  const placed = await placeOrder(buyer.viewer);
  check("Place Order → two work orders, cart emptied", placed.length === 2 && (await cartFor(buyer.viewer)).groups.length === 0);
  const oA = await prisma.workOrder.findUniqueOrThrow({ where: { id: placed.find((o) => o.open)!.orderId }, include: { lines: true } });
  const oM = await prisma.workOrder.findUniqueOrThrow({ where: { id: placed.find((o) => !o.open)!.orderId }, include: { lines: true } });
  check("auto-accept provider → Open (Released) with onboarding", oA.status === "RELEASED" && oA.provider_person_id === auto.personId && !!(await prisma.onboardingRequest.findFirst({ where: { work_order_id: oA.id } })));
  check("manual provider → Waiting on provider acceptance", oM.status === "ISSUED" && !!oM.buyer_accepted_at && !oM.provider_accepted_at);
  check("lines snapshot price × qty", oM.lines[0].amount_cents === 500000 && oA.lines[0].amount_cents === 500000);
  const bells = await prisma.notification.findMany({ where: { person_id: { in: [buyer.personId, auto.personId, man.personId] }, event_key: { in: ["shop.order_received", "shop.order_placed"] } } });
  check("bell + worklist both sides: 'New order: …' / 'Order placed with …'", bells.length === 4 && bells.every((b) => b.requires_action) && bells.some((b) => b.title === "New order: Supplier Portal Quick Start") && bells.some((b) => b.title === "Order placed with Max Walk"));

  await acceptOrder(man.viewer, oM.id);
  check("provider accepts → Open, their item cleared", (await prisma.workOrder.findUnique({ where: { id: oM.id } }))!.status === "RELEASED" && !!(await prisma.notification.findFirst({ where: { person_id: man.personId, event_key: "shop.order_received" } }))?.resolved_at);

  const ms = await prisma.workOrderMilestone.findMany({ where: { work_order_line_id: oA.lines[0].id }, orderBy: { sequence: "asc" } });
  check("milestones snapshotted from the product", ms.length === 2 && ms[0].percent === 50 && ms[0].trigger === "ORDER_ACCEPTED");
  const s = await reportMilestone(auto.viewer, ms[0].id);
  const sr = await prisma.settlementRequest.findUnique({ where: { id: s.id }, include: { lines: true } });
  check("milestone reported → payment request for its share", !!sr && sr.lines.reduce((n, l) => n + (l.amount_cents ?? 0), 0) === 250000);

  // Punchout: the same products return to the ERP with product, qty, price, UOM.
  const conn = await prisma.erpConnection.create({ data: { p_account_id: buyer.pAccountId, name: "Devwalk Oracle", from_identity: `ERP-${Date.now()}`, sender_identity: "ERP", shared_secret_hash: hashSecret(`s-${Date.now()}-0123456789`), outbound_cxml_url: "https://erp.example.test/cxml", oracle_rest_base_url: "https://erp.example.test", credential_env_name: "ORACLE_DEVWALK_REST" } });
  made.connections.push(conn.id);
  const token = randomBytes(16).toString("hex");
  await prisma.punchoutSession.create({ data: { connection_id: conn.id, start_token_hash: createHash("sha256").update(token).digest("hex"), requester_person_id: buyer.personId, buyer_cookie: "bc-1", browser_form_post_url: "https://erp.example.test/return", expires_at: new Date(Date.now() + 3600_000) } });
  const cookie = (await startSession(token))!;
  await addProductToCart((await sessionFor(cookie))!, { productId: p1, quantity: 3 });
  const live = (await sessionFor(cookie))!;
  check("punchout cart line carries qty from the product", (await cartLines(live))[0].eaQuantity === 3);
  const { xml } = await returnCart(live);
  check("Return Cart → ItemIn qty 3 × $5,000.00 EA with the product id", /quantity="3"/.test(xml) && xml.includes("<Money currency=\"USD\">5000.00</Money>") && xml.includes(`<SupplierPartID>${p1}</SupplierPartID>`) && xml.includes("<UnitOfMeasure>EA</UnitOfMeasure>"));

  await addToCart(buyer.viewer, p2);
  await removeLine(buyer.viewer, (await cartFor(buyer.viewer)).groups[0].lines[0].id);
  check("Remove empties the cart", (await cartFor(buyer.viewer)).groups.length === 0);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    await prisma.cart.deleteMany({ where: { buyer_person_id: { in: made.persons } } });
    await prisma.punchoutSession.deleteMany({ where: { connection_id: { in: made.connections } } });
    const lineIds = (await prisma.workOrderLine.findMany({ where: { workOrder: { buyer_person_id: { in: made.persons } } }, select: { id: true } })).map((l) => l.id);
    await prisma.workOrderMilestone.deleteMany({ where: { work_order_line_id: { in: lineIds } } });
    await prisma.payoutMethod.deleteMany({ where: { person_id: { in: made.persons } } });
    await prisma.companyMembership.deleteMany({ where: { person_id: { in: made.persons } } });
    await cleanup();
    await prisma.serviceProduct.deleteMany({ where: { id: { in: products } } });
    await prisma.requesterProfile.deleteMany({ where: { person_id: { in: made.persons } } });
    process.exitCode = done("dev-walk-shop-cart") || process.exitCode;
    await prisma.$disconnect();
  });
