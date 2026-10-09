// X-E008 dev walk (no network): POSR → session → attach provider → cart XML matches fixture → OrderRequest new → Pending Acknowledgment
// → provider accepts → Confirmation HELD → timesheet submitted → WORK_CONFIRMATION HELD; then update → change order, delete → Canceled.
// Run: MAIL_CAPTURE=1 npx tsx --env-file=.env.local scripts/dev-walk-erp.ts  (throwaway is_test parties + connection; removed at the end)
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { erpSendEnabled, hashSecret } from "@/lib/erp/connections";
import { handlePosr, sessionFor, startSession } from "@/lib/erp/punchout";
import { addToCart, cartLines, orderMessageXml, returnCart, searchServices } from "@/lib/erp/cart";
import { handleOrderRequest } from "@/lib/erp/orders";
import { acknowledgeErpOrder, controlOrder, getOrderDetail } from "@/lib/orders";
import { decideChange, proposeChange } from "@/lib/change-orders";
import { createSettlement, getSettlement } from "@/lib/settlements";
import { check, cleanup, done, made, party, refuses } from "./lib/dev-fixture";

const fx = (name: string, vars: Record<string, string>) => Object.entries(vars).reduce((s, [k, v]) => s.split(`{{${k}}}`).join(v), readFileSync(`tests/fixtures/cxml/${name}`, "utf8"));
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

async function main() {
  // Network is impossible on this walk: sending is off, so outbound messages are HELD.
  delete process.env.ERP_SEND_ENABLED;
  check("ERP sending is off", !erpSendEnabled());
  const tag = Date.now().toString(36);
  const buyer = await party("BUYER", "Bea");
  const prov = await party("PROVIDER", "Pat");
  await prisma.requesterProfile.create({ data: { person_id: buyer.personId, employee_id: `E-${tag}` } });
  const svc = await prisma.providerService.create({ data: { provider_profile_id: prov.profileId!, name: `Oracle Procurement consulting ${tag}`, service_type: "SERVICE_BY_QTY", uom: "HOUR", rate_cents: 15000, billing_cycle: "WEEKLY", payment_terms: "NET30", payment_trigger: "TIMESHEET" } });
  const secret = `s3cret-${tag}-0123456789`;
  const conn = await prisma.erpConnection.create({ data: { p_account_id: buyer.pAccountId, name: "Devwalk Oracle", from_identity: `ERP-${tag}`, sender_identity: `ERP-${tag}`, shared_secret_hash: hashSecret(secret), outbound_cxml_url: "https://erp.example.test/cxml", oracle_rest_base_url: "https://erp.example.test", credential_env_name: "ORACLE_DEVWALK_REST" } });
  made.connections.push(conn.id);
  const base = { FROM: `ERP-${tag}`, SENDER: `ERP-${tag}`, SECRET: secret, COOKIE: `cookie-${tag}`, USERID: `E-${tag}`, EMAIL: buyer.email };

  const bad = await handlePosr(fx("posr.xml", { ...base, SECRET: "wrong-secret-000000", PAYLOAD: `posr-bad-${tag}` }), "http://localhost:3000");
  check("POSR with the wrong shared secret → 401", bad.status === 401);
  const posr = await handlePosr(fx("posr.xml", { ...base, PAYLOAD: `posr-${tag}` }), "http://localhost:3000");
  const start = /<URL>([^<]+)<\/URL>/.exec(posr.body)?.[1] ?? "";
  check("POSR → 200 + one-time StartPage", posr.status === 200 && start.startsWith("http://localhost:3000/punchout/start?t="));
  const token = new URL(start.replace(/&amp;/g, "&")).searchParams.get("t")!;
  const cookie = await startSession(token);
  check("StartPage token opens a punchout session, once", !!cookie && (await startSession(token)) === null);
  const s = (await sessionFor(cookie))!;
  check("requester resolved by UserId → employee_id", s.requester_person_id === buyer.personId);

  check("the provider's service is findable", (await searchServices(`consulting ${tag}`)).some((r) => r.id === svc.id));
  await addToCart(s, { serviceId: svc.id, quantity: 40, start: "2026-09-01", end: "2026-12-31" });
  const s2 = (await sessionFor(cookie))!;
  const lines = await cartLines(s2);
  const cart = orderMessageXml(s2, lines, "USD", { payloadId: "fixture@panameer.com", timestamp: "2026-10-09T10:30:00+00:00" });
  const vars = { ...base, SERVICE: svc.id, AUX1: lines[0].id, QTY: "40", RATE: "150.00", TOTAL: "6000.00", DESCRIPTION: lines[0].description, PO: `PO-${tag}` };
  check("cart XML matches the fixture", norm(cart) === norm(fx("punchout-order-message.expected.xml", vars)), cart.slice(0, 400));
  await returnCart(s2);
  check("Return to ERP → work request Awarded, session closed", (await prisma.workRequest.findUnique({ where: { id: s2.work_request_id! } }))!.status === "ASSIGNED" && !(await sessionFor(cookie)));

  const po = await handleOrderRequest(fx("order-request-new.xml", { ...vars, PAYLOAD: `po-new-${tag}` }));
  const again = await handleOrderRequest(fx("order-request-new.xml", { ...vars, PAYLOAD: `po-new-${tag}` }));
  const orders = await prisma.workOrder.findMany({ where: { external_ref: `PO-${tag}` } });
  check("OrderRequest new → one work order (replay is idempotent)", po.status === 200 && again.status === 200 && orders.length === 1, po.body);
  const o = orders[0];
  let d = await getOrderDetail(prov.viewer, o.id);
  check("work order Pending Acknowledgment, customer acceptance set, waiting on you", d.status === "ISSUED" && !!o.buyer_accepted_at && d.waiting === "Waiting on you" && d.erp);
  check("work request → Ordered", (await prisma.workRequest.findUnique({ where: { id: s2.work_request_id! } }))!.status === "ORDERED");
  check("customer has no controls on an ERP order", (await getOrderDetail(buyer.viewer, o.id)).controls.length === 0);
  await refuses("customer Hold refused on an ERP order", () => controlOrder(buyer.viewer, o.id, "HOLD"), "ERP");

  await acknowledgeErpOrder(o);
  d = await getOrderDetail(prov.viewer, o.id);
  const conf = await prisma.erpMessage.findFirst({ where: { work_order_id: o.id, type: "CONFIRMATION" } });
  check("provider accepts → Open; ConfirmationRequest HELD", d.status === "RELEASED" && conf?.status === "HELD" && /type="accept"/.test(conf.body));

  const ts = await createSettlement(prov.viewer, o.id, { periodStart: "2026-09-01", periodEnd: "2026-09-07", lines: [{ workOrderLineId: d.lines[0].id, serviceDate: "2026-09-02", quantity: 8 }] });
  const wc = await prisma.erpMessage.findFirst({ where: { settlement_request_id: ts.id, type: "WORK_CONFIRMATION" } });
  check("timesheet submitted → WORK_CONFIRMATION HELD", wc?.status === "HELD" && /"OrderNumber": "PO-/.test(wc.body));
  const asBuyer = await getSettlement(buyer.viewer, ts.id);
  check("customer gets no Approve/Reject in Panameer", asBuyer.erp && asBuyer.actions.length === 0);
  check("no worklist item or email to the ERP customer", (await prisma.notification.count({ where: { person_id: buyer.personId } })) === 0);

  await handleOrderRequest(fx("order-request-update.xml", { ...vars, QTY: "60", TOTAL: "9000.00", PAYLOAD: `po-upd-${tag}` }));
  const rev = await prisma.workOrderRevision.findFirst({ where: { work_order_id: o.id, status: "PENDING" } });
  check("OrderRequest update → change order, customer side already accepted", !!rev?.external_payload_id && !!rev.buyer_accepted_at);
  await refuses("customer can't raise a change order on an ERP order", () => proposeChange(buyer.viewer, o.id, { header: { sow_text: "x" } }), "ERP");
  await decideChange(prov.viewer, o.id, rev!.id, "ACCEPT");
  check("provider accepts the change → quantity 60, second Confirmation HELD", Number((await prisma.workOrderLine.findFirst({ where: { work_order_id: o.id } }))!.quantity) === 60 && (await prisma.erpMessage.count({ where: { work_order_id: o.id, type: "CONFIRMATION", status: "HELD" } })) === 2);

  await handleOrderRequest(fx("order-request-delete.xml", { ...vars, PAYLOAD: `po-del-${tag}` }));
  check("OrderRequest delete → Canceled", (await prisma.workOrder.findUnique({ where: { id: o.id } }))!.status === "CANCELLED");
  check("nothing was sent (every outbound message HELD)", (await prisma.erpMessage.count({ where: { connection_id: conn.id, direction: "OUT", status: { in: ["SENT", "QUEUED", "FAILED"] } } })) === 0);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    await prisma.punchoutSession.deleteMany({ where: { connection_id: { in: made.connections } } });
    await prisma.requesterProfile.deleteMany({ where: { person_id: { in: made.persons } } });
    await cleanup();
    process.exitCode = done("dev-walk-erp") || process.exitCode;
    await prisma.$disconnect();
  });
