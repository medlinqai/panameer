// RV / WN / MO dev walk (throwaway rows only): buyer with legal name + address + invoice email (no W-9) orders; provider
// without W-9 sells, delivers, requests payment; payout rule US vs elsewhere; offer below floor auto-declined;
// offer → counter → accept → cart at the agreed price → order. Road v6 facts.
// Run: npx tsx --env-file=.env.local scripts/dev-walk-road-v6-offers.ts
import { prisma } from "@/lib/prisma";
import { addToCart, placeOrder } from "@/lib/cart";
import { approveSettlement, createSettlement } from "@/lib/settlements";
import { getOrderDetail } from "@/lib/orders";
import { SignGateError, lifecycleFor, providerPayReady } from "@/lib/your-path";
import { payoutChecklist } from "@/lib/payout-requirements";
import { answerCounter, counterOffer, makeOffer } from "@/lib/service-product-offers";
import { PROVIDER_ROAD, ROAD_TITLE } from "@/lib/user-levels";
import { check, cleanup, done, made, party, refuses } from "./lib/dev-fixture";

const productIds: string[] = [];

async function main() {
  check("road v6: title + 8 stops, Deliver at 6, lock before Get Paid", ROAD_TITLE === "From Creating Your Account to Getting Paid" && PROVIDER_ROAD.map((s) => s.step).join("|") === "Create Account|Validate Email|Complete Profile|Add Services & Products|Sell Services & Products|Deliver Services & Products|Request Payment|Get Paid" && PROVIDER_ROAD[7].lockBefore === "if required" && !PROVIDER_ROAD.some((s) => s.step === "Add Tax & Banking"));

  const buyer = await party("BUYER", "Bo");
  const prov = await party("PROVIDER", "Pia");
  const coOf = async (personId: string) => (await prisma.person.findUniqueOrThrow({ where: { id: personId }, select: { company_id: true } })).company_id!;
  const bCo = await coOf(buyer.personId), pCo = await coOf(prov.personId);
  await prisma.companyMembership.createMany({ data: [{ person_id: buyer.personId, company_id: bCo, role: "ADMIN", status: "APPROVED" }, { person_id: prov.personId, company_id: pCo, role: "ADMIN", status: "APPROVED" }] });
  await prisma.person.update({ where: { id: prov.personId }, data: { is_service_provider: true } });
  await prisma.company.update({ where: { id: bCo }, data: { legal_name: "Bo Walk Buying LLC" } });
  await prisma.site.create({ data: { company_id: bCo, name: "Registered", addresses: { create: { line1: "2 Buyer Rd", city: "Austin", state: "TX", country: "United States" } } } });
  const product = await prisma.serviceProduct.create({ data: { provider_profile_id: prov.profileId!, company_id: pCo, title: `Walk Report ${Date.now().toString(36)}`, status: "PUBLISHED", price_cents: 100000, pricing_type: "FIXED", kind: "DELIVERABLE", payment_event: "ACCEPTANCE", payment_terms: "NET30", open_to_offers: true, offer_floor_cents: 50000 } });
  productIds.push(product.id);

  // WN-E001: buyer gate = legal name + billing address + invoice email; no tax forms.
  await addToCart(buyer.viewer, product.id);
  let gate: SignGateError | null = null;
  try { await placeOrder(buyer.viewer); } catch (e) { if (e instanceof SignGateError) gate = e; else throw e; }
  const missing = gate?.gate.items.filter((i) => !i.done) ?? [];
  check("order blocked only on the invoice email, with a link to it", missing.length === 1 && missing[0].item === "Invoice email" && missing[0].href === "/company/legal#billing", JSON.stringify(missing));
  await prisma.company.update({ where: { id: bCo }, data: { invoice_email: "ap@example.test" } });
  const [placed] = await placeOrder(buyer.viewer);
  const buyerCo = await prisma.company.findUniqueOrThrow({ where: { id: bCo }, select: { tin: true, tax_form_uploaded_at: true } });
  check("buyer with legal name + address + invoice email (no Tax ID / W-9) places an order", !!placed?.orderId && !buyerCo.tin && !buyerCo.tax_form_uploaded_at);

  // WN-E002: provider without W-9 sells, delivers, requests payment; the request goes to the buyer.
  const o = await getOrderDetail(prov.viewer, placed.orderId);
  check("order is open for the provider (no tax forms asked)", ["RELEASED", "ACCEPTED", "ACTIVE"].includes(o.status), o.status);
  const today = new Date().toISOString().slice(0, 10);
  const pr = await createSettlement(prov.viewer, placed.orderId, { periodStart: today, periodEnd: today, lines: [{ workOrderLineId: o.lines[0].id, amountCents: 100000 }] });
  const row = await prisma.paymentRequest.findUniqueOrThrow({ where: { id: pr.id }, select: { held_for_tax_banking: true, status: true } });
  check("payment request goes to the buyer (not held for tax & banking)", row.status === "SUBMITTED" && !row.held_for_tax_banking);
  await approveSettlement(buyer.viewer, pr.id);
  const life = await lifecycleFor(prov.personId);
  const keys = life!.steps.map((s) => s.key);
  check("road facts: sell, deliver (buyer accepted) and request done", life!.done[keys.indexOf("sell")] && life!.done[keys.indexOf("deliver")] && life!.done[keys.indexOf("request")], JSON.stringify(life!.done));

  // RV-E004: payout rule — US needs Tax ID + W-9 + payout account; elsewhere a payout account.
  check("US provider: payout blocked without W-9, Tax ID, payout account", !(await providerPayReady(prov.personId)) && (await payoutChecklist(pCo))!.items.map((i) => i.item).join(",") === "Payout account,Tax ID,W-9");
  await prisma.payoutMethod.create({ data: { person_id: prov.personId, company_id: pCo, kind: "BANK_ACCOUNT", label: "Walk bank", country: "US" } });
  check("US: payout account alone is not enough", !(await providerPayReady(prov.personId)));
  await prisma.company.update({ where: { id: pCo }, data: { tin: "12-3456789", tax_form_uploaded_at: new Date() } });
  check("US: + Tax ID + W-9 → ready", await providerPayReady(prov.personId));
  const prov2 = await party("PROVIDER", "Noa");
  const p2Co = await coOf(prov2.personId);
  await prisma.companyMembership.create({ data: { person_id: prov2.personId, company_id: p2Co, role: "ADMIN", status: "APPROVED" } });
  await prisma.company.update({ where: { id: p2Co }, data: { country: "Canada", country_code: "CA" } });
  check("non-US: needs a payout account only", !(await providerPayReady(prov2.personId)) && (await payoutChecklist(p2Co))!.items.map((i) => i.item).join(",") === "Payout account");
  await prisma.payoutMethod.create({ data: { person_id: prov2.personId, company_id: p2Co, kind: "BANK_ACCOUNT", label: "Walk CA bank", country: "CA" } });
  check("non-US: payout account → ready (no tax form)", await providerPayReady(prov2.personId));

  // MO-E003: offers.
  const low = await makeOffer(buyer.viewer, { serviceProductId: product.id, amountCents: 40000 });
  check("offer below the floor is declined automatically, politely", low.status === "DENIED" && !!low.message?.startsWith("Thanks for the offer"));
  const off = await makeOffer(buyer.viewer, { serviceProductId: product.id, amountCents: 70000, note: "Can you do 700?" });
  check("offer above the floor goes to the seller", off.status === "OPEN");
  await refuses("one open offer per buyer per product", () => makeOffer(buyer.viewer, { serviceProductId: product.id, amountCents: 71000 }), "already have an offer");
  await counterOffer(prov.viewer, { offerId: off.id, amountCents: 85000 });
  await refuses("only one counter", () => counterOffer(prov.viewer, { offerId: off.id, amountCents: 80000 }), "answered");
  await answerCounter(buyer.viewer, { offerId: off.id, accept: true });
  const line = await prisma.cartLine.findFirst({ where: { cart: { buyer_person_id: buyer.personId }, service_product_id: product.id } });
  check("accepted counter → cart line at the agreed price", line?.unit_price_cents === 85000 && line.offer_id === off.id && line.quantity === 1);
  const [placed2] = await placeOrder(buyer.viewer);
  const wo = await prisma.workOrderLine.findFirst({ where: { work_order_id: placed2.orderId } });
  check("order at the agreed price", wo?.amount_cents === 85000);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    await prisma.serviceProductOffer.deleteMany({ where: { service_product_id: { in: productIds } } });
    await prisma.cart.deleteMany({ where: { buyer_person_id: { in: made.persons } } });
    await prisma.paymentRequest.updateMany({ where: { provider_person_id: { in: made.persons } }, data: { status: "REJECTED" } }).catch(() => null);
    await cleanup();
    const left = await Promise.all([
      prisma.serviceProduct.count({ where: { id: { in: productIds } } }),
      prisma.serviceProductOffer.count({ where: { service_product_id: { in: productIds } } }),
      prisma.workOrder.count({ where: { OR: [{ buyer_person_id: { in: made.persons } }, { provider_person_id: { in: made.persons } }] } }),
      prisma.paymentRequest.count({ where: { provider_person_id: { in: made.persons } } }),
      prisma.person.count({ where: { id: { in: made.persons } } }),
    ]);
    console.log(`    cleanup leftovers (products, offers, work orders, payment requests, persons): ${left.join(", ")}`);
    done("Road v6 + offers walk");
    await prisma.$disconnect();
  });
