// Super run 10-15 walk on :3199 (next start, MAIL_CAPTURE=1) — taxonomy_v2 stays off in the DB; "on" paths run in-process
// with TAXONOMY_V2_FORCE=1 only. A) new buyer: Who Is Buying? → Company → Location → Review → dashboard (5 cards, Waiting on
// You, nothing below) · Your Path 6 steps. B) new seller: Commodity → Business Type (Accounting) → attributes, Shop › Services
// filter. C) buyer offers a lower price + later date on a Scott Walls product → Scott counters → buyer accepts → order at the
// agreed price/date. Throwaway rows removed; Scott's product override restored.
// Run: MAIL_CAPTURE=1 npx tsx --env-file=.env.local scripts/dev-walk-super-run-1015.ts
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { createRequesterAccount } from "@/lib/requester-onboarding";
import { lifecycleFor } from "@/lib/your-path";
import { counterOffer } from "@/lib/service-product-offers";
import { getSetting } from "@/lib/platform-settings";
import { myAttributes, saveAttribute } from "@/lib/search-attributes";
import { listServiceProviders } from "@/lib/shop-services";
import { industryGap } from "@/lib/industry";
import type { Viewer } from "@/lib/access";
import { check, cleanup, done, made, party } from "./lib/dev-fixture";

const BASE = "http://localhost:3199";
const tag = Date.now().toString(36);
const restore: { productId?: string; override?: boolean | null } = {};
const created: { offers: string[]; orders: string[]; scottPersonId?: string } = { offers: [], orders: [] };
const started = new Date();

const call = (cookie: string) => async (path: string, body?: object) => {
  const r = await fetch(BASE + path, { method: body ? "POST" : "GET", headers: { cookie, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const text = await r.text();
  let json: Record<string, unknown> = {};
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, text, json };
};
const cookieFor = async (userId: string, email: string, extra: object = {}) => `next-auth.session-token=${await encode({ token: { sub: userId, email, role: "MEMBER", ...extra }, secret: process.env.NEXTAUTH_SECRET! })}`;

async function main() {
  check("taxonomy_v2 is off in the DB", (await getSetting("taxonomy_v2")) === false);

  // ── A · new buyer ──
  const email = `devwalk-${tag}-bea@example.test`;
  const { userId } = await createRequesterAccount({ firstName: "Bea", lastName: "Walk", email, password: "walk-password-123", country: "US", tosAccepted: true, job: "buyer" } as Parameters<typeof createRequesterAccount>[0]);
  const u = await prisma.user.update({ where: { id: userId }, data: { email_verified: new Date(), is_test: true }, select: { person: { select: { id: true, company: { select: { p_account_id: true } } } } } });
  made.users.push(userId);
  made.persons.push(u.person!.id);
  made.accounts.push(u.person!.company!.p_account_id);
  const buyer = call(await cookieFor(userId, email, { isServiceBuyer: true }));
  const st = await buyer("/api/onboarding/requester/status");
  check("sign-up pre-fills the name for Who Is Buying?", (st.json.profile as { firstName?: string })?.firstName === "Bea");
  check("step 1 saves", (await buyer("/api/onboarding/requester/step", { step: "requester_info", payload: { firstName: "Bea", lastName: "Walk", title: "Procurement Lead", phone: "+15555550101" } })).status === 200);
  check("Company step refuses before a company exists", (await buyer("/api/onboarding/requester/step", { step: "company", payload: { companyBound: true } })).status === 400);
  const def = await buyer("/api/company/define", { name: `Bea Walk Buying ${tag}`, website: null, attestation: true, companyTos: true });
  check("Company: name + website only (no tax ID / W-9)", def.status === 200, JSON.stringify(def.json).slice(0, 160));
  check("Company step saves", (await buyer("/api/onboarding/requester/step", { step: "company", payload: { companyBound: true } })).status === 200);
  const co = await prisma.companyMembership.findFirstOrThrow({ where: { person_id: u.person!.id }, select: { company_id: true, company: { select: { p_account_id: true } } } });
  if (!made.accounts.includes(co.company.p_account_id)) made.accounts.push(co.company.p_account_id);
  check("Location step saves", (await buyer("/api/onboarding/requester/step", { step: "work_location", payload: { workLocation: { line1: "1 Buyer Way", city: "Austin", state: "TX", postalCode: "78701", country: "US" } } })).status === 200);
  const fin = await buyer("/api/onboarding/requester/complete", {});
  check("Review → complete", fin.status === 200, JSON.stringify(fin.json).slice(0, 160));
  const dash = await buyer("/dashboard");
  const cards = dash.text.split("data-thing=").length - 1;
  check("dashboard: 5 buyer cards + Waiting on You, nothing below", dash.text.includes("data-buyer-things") && cards === 5 && dash.text.includes("Waiting on You") && !dash.text.includes("What Comes Next"), `cards ${cards} · status ${dash.status}`);
  const life = await lifecycleFor(u.person!.id);
  check("buyer Your Path: 6 steps (Add Company dropped)", life?.steps.length === 6 && !life.steps.some((s) => s.key === "link"), String(life?.steps.length));

  // ── B · new seller (on-paths in-process) ──
  process.env.TAXONOMY_V2_FORCE = "1";
  const seller = await party("PROVIDER", "Sol");
  const sCo = (await prisma.person.update({ where: { id: seller.personId }, data: { is_service_provider: true }, select: { company_id: true } })).company_id!;
  await prisma.companyMembership.create({ data: { person_id: seller.personId, company_id: sCo, role: "ADMIN", status: "APPROVED" } });
  const acct = await prisma.businessType.findFirstOrThrow({ where: { name: "Accounting" }, select: { id: true, commodityGroup: { select: { name: true } } } });
  await prisma.companyBusinessType.create({ data: { company_id: sCo, business_type_id: acct.id } });
  const attrs = await myAttributes(seller.viewer);
  check(`seller: ${acct.commodityGroup?.name} › Accounting → attributes (${attrs.map((a) => a.name).join(", ")})`, attrs.some((a) => a.name === "Credential") && attrs.some((a) => a.name === "Licensed in (states)"));
  const lic = attrs.find((a) => a.name === "Licensed in (states)")!;
  await saveAttribute(seller.viewer, lic.id, ["FL", "TX"]);
  await saveAttribute(seller.viewer, attrs.find((a) => a.name === "Credential")!.id, ["CPA"]);
  check("seller: Accounting needs an industry (Professional Services)", !!(await industryGap(seller.personId, seller.profileId!)));
  await prisma.providerService.create({ data: { provider_profile_id: seller.profileId!, name: "Offsite Hourly", service_type: "SERVICE_BY_QTY", uom: "HOUR", rate_cents: 9000, published_at: new Date() } });
  const found = await listServiceProviders({ [`a_${lic.id}`]: "FL" }, { seesTest: true });
  const notFound = await listServiceProviders({ [`a_${lic.id}`]: "NY" }, { seesTest: true });
  check("Shop › Services: Licensed in FL finds them, NY doesn't", found.some((r) => r.profileId === seller.profileId) && !notFound.some((r) => r.profileId === seller.profileId));
  delete process.env.TAXONOMY_V2_FORCE;

  // ── C · offer on a Scott Walls product ──
  const scott = await prisma.user.findFirstOrThrow({ where: { email: { startsWith: "iamscottwalls" } }, select: { id: true, person: { select: { id: true, providerProfile: { select: { id: true } } } } } });
  const prod = await prisma.serviceProduct.findFirstOrThrow({ where: { provider_profile_id: scott.person!.providerProfile!.id, status: "PUBLISHED", price_cents: { not: null } }, select: { id: true, title: true, price_cents: true, offers_override: true } });
  restore.productId = prod.id;
  created.scottPersonId = scott.person!.id;
  restore.override = prod.offers_override;
  await prisma.serviceProduct.update({ where: { id: prod.id }, data: { offers_override: true } });
  // Buyer billing details (needed to order; no tax forms).
  check("buyer billing details save", (await buyer("/api/company/billing", { invoiceEmail: "ap@example.test", address: { line1: "1 Buyer Way", city: "Austin", state: "TX", postalCode: "78701", country: "United States" } })).status === 200);
  const later = new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10);
  const counterDate = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const low = Math.round(prod.price_cents! * 0.7);
  const mk = await buyer("/api/shop/offers", { serviceProductId: prod.id, amountCents: low, deliveryDate: later, note: "Walk test — lower price, later date" });
  check(`buyer offers ${low / 100} by ${later} on "${prod.title}"`, mk.status === 200 && mk.json.status === "OPEN", JSON.stringify(mk.json));
  const offerId = mk.json.id as string;
  created.offers.push(offerId);
  const scottViewer = { userId: scott.id, role: "MEMBER", isSystemAdmin: false, isAdmin: false, isServiceBuyer: false, isServiceProvider: true, isServiceCoordinator: false, isSupport: false } as unknown as Viewer;
  const mid = Math.round(prod.price_cents! * 0.85);
  await counterOffer(scottViewer, { offerId, amountCents: mid, deliveryDate: counterDate });
  check("Scott counters once (price + date)", (await prisma.serviceProductOffer.findUniqueOrThrow({ where: { id: offerId } })).status === "COUNTERED");
  const ans = await buyer("/api/shop/offers", { action: "answer", offerId, accept: true });
  check("buyer accepts the counter", ans.status === 200, JSON.stringify(ans.json));
  const line = await prisma.cartLine.findFirst({ where: { cart: { buyer_person_id: u.person!.id }, service_product_id: prod.id } });
  check("cart line at the agreed price and date", line?.unit_price_cents === mid && line.delivery_date?.toISOString().slice(0, 10) === counterDate);
  const place = await buyer("/api/cart", { action: "place" });
  const orderId = ((place.json.orders as { orderId: string }[] | undefined) ?? [])[0]?.orderId;
  if (orderId) created.orders.push(orderId);
  const wol = orderId ? await prisma.workOrderLine.findFirst({ where: { work_order_id: orderId } }) : null;
  const wo = orderId ? await prisma.workOrder.findUnique({ where: { id: orderId }, select: { status: true } }) : null;
  check("order placed at the agreed price/date, open at once", !!wol && (wol.amount_cents ?? wol.unit_price_cents) === mid && wol.service_end?.toISOString().slice(0, 10) === counterDate && wo?.status === "RELEASED", JSON.stringify({ status: place.status, err: place.json.error, amount: wol?.amount_cents, unit: wol?.unit_price_cents, end: wol?.service_end, wo: wo?.status }));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    delete process.env.TAXONOMY_V2_FORCE;
    // Scott's product back as it was; the walk's offer, order and notifications removed.
    if (restore.productId) await prisma.serviceProduct.update({ where: { id: restore.productId }, data: { offers_override: restore.override ?? null } });
    // Anything the walk raised on Scott's bell during the walk.
    if (created.scottPersonId) await prisma.notification.deleteMany({ where: { person_id: created.scottPersonId, created_at: { gte: started } } });
    if (created.orders.length) {
      await prisma.notification.deleteMany({ where: { entity_id: { in: created.orders } } });
      await prisma.onboardingRequest.deleteMany({ where: { work_order_id: { in: created.orders } } });
    }
    if (created.offers.length) {
      await prisma.notification.deleteMany({ where: { entity_id: { in: created.offers } } });
      await prisma.serviceProductOffer.deleteMany({ where: { id: { in: created.offers } } });
    }
    await prisma.cart.deleteMany({ where: { buyer_person_id: { in: made.persons } } });
    await cleanup();
    const left = await Promise.all([
      prisma.workOrder.count({ where: { id: { in: created.orders } } }),
      prisma.serviceProductOffer.count({ where: { id: { in: created.offers } } }),
      prisma.person.count({ where: { id: { in: made.persons } } }),
      restore.productId ? prisma.serviceProduct.findUnique({ where: { id: restore.productId }, select: { offers_override: true } }).then((p) => String(p?.offers_override)) : "n/a",
    ]);
    console.log(`    cleanup: orders ${left[0]}, offers ${left[1]}, persons ${left[2]} · Scott's product override restored to ${left[3]}`);
    done("Super run 10-15 walk");
    await prisma.$disconnect();
  });
