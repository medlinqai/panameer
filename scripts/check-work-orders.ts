import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { prisma } from "@/lib/prisma";
import { hire, acceptPurchaseOrder, declineWorkOrder } from "@/lib/work-orders";
import { acceptOrder, availableActions, bothPartiesAccepted, canAcceptNow, activationMessage } from "@/lib/orders";
import { getStatistics } from "@/lib/statistics";

/**
 * ── ⚠⚠⚠ `check:work-orders` (`P2-A8-E621` WS-D) ─────────────────────────
 *
 * ⚠ THE STOP GATE: *"a work order created from each route; the accept/release
 * walk; what `orders.ts` got wrong; the dash→count list."*
 *
 * ⚠⚠ RULING 43 AND RULING 44 BOTH LAND HERE, and both are asserted against real
 * rows rather than against source text alone: **two acceptances and an
 * auto-release**, and **all three transaction kinds surviving the copy from
 * requisition to order.**
 */
let pass = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, why = "") => {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
};
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
function walk(d: string, o: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const f = join(d, e);
    if (statSync(f).isDirectory()) walk(f, o);
    else if (/\.tsx?$/.test(f)) o.push(relative(".", f));
  }
  return o;
}

const TAG = "E621 work order probe";
const V = (userId: string) => ({ userId }) as never;
const RATE = 18_000;

/* ⚠⚠⚠ ALL THREE KINDS, AND THE FIXTURE MUST DISTINGUISH THEM (ruling 44, `E587`).
   ⚠ Each carries DIFFERENT numbers as well as a different type, so a line landing
   in the wrong slot cannot agree with the one it displaced. */
const KINDS = [
  {
    transaction_type: "SERVICE_BY_QTY" as const,
    uom: "HOUR",
    quantity: 80,
    unit_price_cents: RATE,
    amount_cents: null,
  },
  {
    transaction_type: "PRODUCT_BY_QTY" as const,
    uom: "EACH",
    quantity: 7,
    unit_price_cents: 2_500,
    amount_cents: null,
  },
  {
    transaction_type: "SERVICE_BY_AMT" as const,
    uom: null,
    quantity: null,
    unit_price_cents: null,
    amount_cents: 940_000,
  },
];

async function main() {
  const requestIds: string[] = [];

  try {
    const cast = await prisma.person.findMany({
      where: { NOT: { user_id: null } },
      select: { id: true, user_id: true, company: { select: { p_account_id: true } } },
      take: 6,
    });
    const buyer = cast.find((p) => p.company?.p_account_id);
    const provider = cast.find((p) => p.id !== buyer?.id);
    const other = cast.find((p) => p.id !== buyer?.id && p.id !== provider?.id);
    if (!buyer?.user_id || !buyer.company?.p_account_id || !provider?.user_id || !other?.user_id) {
      check("0 — a buyer and two providers exist (E586)", false, "not found");
      return;
    }
    check("0 — the cast is three distinct people", new Set([buyer.id, provider.id, other.id]).size === 3);

    const START = new Date(Date.UTC(2026, 9, 5));
    const END = new Date(Date.UTC(2026, 9, 16));

    /** A requisition with every kind on it, all assigned to one provider. */
    const makeRequisition = async (providerPersonId: string, kinds = KINDS) => {
      const wr = await prisma.workRequest.create({
        data: {
          buyer_person_id: buyer.id,
          p_account_id: buyer.company!.p_account_id,
          title: TAG,
          status: "POSTED",
          proposal_access: "OPEN",
          start_date: START,
          end_date: END,
          lines: {
            create: kinds.map((k, i) => ({
              line_number: i + 1,
              ...k,
              description: `${TAG} line ${i + 1}`,
              provider_person_id: providerPersonId,
              service_start: START,
              service_end: END,
              status: "ASSIGNED" as const,
            })),
          },
        },
        select: { id: true },
      });
      requestIds.push(wr.id);
      return wr.id;
    };

    /* ═══ 1 · ⚠⚠⚠ TWO DOORS, ONE EVENT (item 1) ═══════════════════════════ */
    const rHire = await makeRequisition(provider.id);
    const viaHire = await hire(V(buyer.user_id), { workRequestId: rHire });
    check("1 — ⚠⚠ HIRE creates a work order", viaHire.id != null);
    check("1 — ⚠ with every requisition line on it", viaHire.lineCount === 3, `${viaHire.lineCount}`);

    const rPo = await makeRequisition(provider.id);
    const viaPo = await acceptPurchaseOrder(V(buyer.user_id), {
      workRequestId: rPo,
      poNumber: "PO-4417",
    });
    check("1 — ⚠⚠ an ERP purchase order creates one too", viaPo.id != null);

    const readOrder = (id: string) =>
      prisma.workOrder.findUnique({
        where: { id },
        select: {
          origin: true, status: true, provider_person_id: true, buyer_person_id: true,
          p_account_id: true, currency: true, fee_bps: true, period_start: true,
          period_end: true, external_ref: true, provider_accepted_at: true,
          buyer_accepted_at: true, buyer_released_at: true, work_request_id: true,
          not_to_exceed_cents: true, terms_version: true,
        },
      });
    const oHire = await readOrder(viaHire.id);
    const oPo = await readOrder(viaPo.id);

    check("1 — ⚠ HIRE is INDIRECT — Panameer generated these terms", oHire?.origin === "INDIRECT");
    check("1 — ⚠ a PO is DIRECT — Panameer records terms agreed elsewhere", oPo?.origin === "DIRECT");
    check("1 — ⚠ and the PO's reference is recorded", oPo?.external_ref === "PO-4417");
    check("1 — ⚠ HIRE carries no external reference", oHire?.external_ref === null);

    /* ⚠⚠⚠ IDENTICAL IN EVERY RESPECT EXCEPT `origin` AND THE PO REFERENCE.
       ⚠ Derived from the rows by shape (`E587`), never from a typed field list —
       a hard-coded list would still agree with itself after a field was added to
       one door and not the other. */
    const DIFFERS_BY_DESIGN = new Set(["origin", "external_ref", "work_request_id"]);
    const diffs = Object.keys(oHire ?? {}).filter((k) => {
      if (DIFFERS_BY_DESIGN.has(k)) return false;
      const a = (oHire as Record<string, unknown>)[k];
      const b = (oPo as Record<string, unknown>)[k];
      return a instanceof Date && b instanceof Date
        ? a.getTime() !== b.getTime()
        : String(a) !== String(b);
    });
    check(
      "1 — ⚠⚠⚠ the two doors produce the SAME order in every other field",
      diffs.length === 0,
      `differ: ${diffs.join(", ")}`
    );
    check("1 — ⚠ and the comparison covered a real field set",
      Object.keys(oHire ?? {}).length >= 12, `${Object.keys(oHire ?? {}).length}`);

    /* ⚠⚠⚠ AND NOTHING DOWNSTREAM BRANCHES ON WHICH DOOR FIRED (item 1, WS-E 4).
       ⚠ Swept across `src/` by shape: a comparison against an origin VALUE is the
       branch; carrying the field through to a view is not. */
    const SRC = walk("src");
    check("1 — the source sweep has a population (E586)", SRC.length > 50, `${SRC.length}`);
    /*
      ⚠⚠⚠ THE SWEEP IS OVER **LOGIC**, NOT OVER THE SCREEN, AND THE FIRST VERSION
      OF THIS ASSERTION WAS WRONG IN A WAY WORTH RECORDING.

      ⚠ It swept all of `src/` and flagged `OrderChrome.tsx` and the order detail
      page. ⚠⚠ **BOTH ARE CORRECT AND ONE OF THEM IS A DOCTRINE REQUIREMENT** —
      `OrderChrome.tsx:12` says so in its own words: *"`origin` IS VISIBLE,
      ALWAYS, AND THAT IS A DOCTRINE REQUIREMENT."* `E388`: Panameer can ASSERT
      the terms of an order it generated and can only RECORD THE EXISTENCE of one
      it did not, **so the member has to be told which they are looking at.**

      ⚠⚠⚠ WS-D item 1 IS ABOUT BEHAVIOUR: no rule, status, price, date or
      permission may depend on which door fired. **Telling somebody is not
      branching on it.** ⚠ A gate that fails on correct code is a gate somebody
      switches off — so this reads `src/lib` and `src/app/api`, where the rules
      live, and the SCREEN is asserted positively below instead.
    */
    const LOGIC = SRC.filter(
      (f) => f.startsWith(join("src", "lib")) || f.startsWith(join("src", "app", "api"))
    );
    check("1 — the logic sweep has a population (E586)", LOGIC.length > 20, `${LOGIC.length}`);
    const branchers = LOGIC.filter((f) => {
      const code = strip(readFileSync(f, "utf8"));
      return /(origin|\.origin)\s*(===|!==)\s*["'](DIRECT|INDIRECT)["']|["'](DIRECT|INDIRECT)["']\s*(===|!==)\s*\w*origin/i.test(code);
    });
    check(
      "1 — ⚠⚠⚠ ABSENCE: no RULE compares an order's origin to decide anything",
      branchers.length === 0,
      `${branchers.join(", ")} — "nothing downstream may know which fired"`
    );
    /* ⚠⚠ AND THE MUTATION: the sweep must be capable of catching one. */
    check(
      "1 — MUTATION: the sweep would catch a rule branching on origin",
      /(origin|\.origin)\s*(===|!==)\s*["'](DIRECT|INDIRECT)["']/i.test(
        'if (order.origin === "DIRECT") return [];'
      )
    );
    /* ⚠⚠⚠ THE POSITIVE HALF — `E388`'s doctrine. The member IS told. */
    const chrome = strip(readFileSync(join("src", "components", "orders", "OrderChrome.tsx"), "utf8"));
    check(
      "1 — ⚠⚠ the origin IS surfaced to the member (E388's doctrine)",
      /OriginBadge/.test(chrome) && /DIRECT/.test(chrome),
      "Panameer may only RECORD the existence of an order it did not generate — so say so"
    );

    /* ═══ 2 · ⚠⚠⚠ RULING 44 — ALL THREE KINDS SURVIVE THE COPY ════════════ */
    const reqLines = await prisma.workRequestLine.findMany({
      where: { work_request_id: rHire },
      orderBy: { line_number: "asc" },
      select: {
        line_number: true, transaction_type: true, quantity: true,
        unit_price_cents: true, amount_cents: true, uom: true, work_order_id: true,
        status: true,
      },
    });
    const ordLines = await prisma.workOrderLine.findMany({
      where: { work_order_id: viaHire.id },
      orderBy: { line_number: "asc" },
      select: {
        line_number: true, transaction_type: true, basis: true, quantity: true,
        unit_price_cents: true, amount_cents: true, uom: true, work_request_line_id: true,
      },
    });
    check("2 — three requisition lines, three order lines",
      reqLines.length === 3 && ordLines.length === 3,
      `${reqLines.length}/${ordLines.length}`);
    /* ⚠⚠⚠ EQUAL FOR ALL THREE VALUES. ⚠ A fixture that only exercised
       `SERVICE_BY_QTY` would have passed against the DELETED bridge, because that
       is the value the bridge happened to preserve. */
    const kindsSeen = new Set(ordLines.map((l) => l.transaction_type));
    check("2 — ⚠⚠ all three kinds are present, so the comparison distinguishes them",
      kindsSeen.size === 3, `${[...kindsSeen].sort().join(", ")}`);
    for (const [i, req] of reqLines.entries()) {
      const ord = ordLines[i]!;
      check(
        `2 — ⚠⚠⚠ line ${req.line_number}: the order's kind EQUALS the requisition's (${req.transaction_type})`,
        ord.transaction_type === req.transaction_type,
        `req ${req.transaction_type} → order ${ord.transaction_type}`
      );
      check(
        `2 — ⚠ line ${req.line_number}: the price survived field for field`,
        Number(ord.quantity ?? 0) === Number(req.quantity ?? 0) &&
          ord.unit_price_cents === req.unit_price_cents &&
          ord.amount_cents === req.amount_cents &&
          ord.uom === req.uom
      );
      check(
        `2 — ⚠ line ${req.line_number}: it points back at the requisition line`,
        ord.work_request_line_id != null
      );
      /* ⚠⚠⚠ AND THE RETIRED COLUMN IS NOT WRITTEN. Writing it would mean
         deriving it from the kind — the exact bridge ruling 44 deleted. */
      check(
        `2 — ⚠⚠⚠ line ${req.line_number}: \`basis\` is NOT written`,
        ord.basis === null,
        `${ord.basis} — deriving it is the deleted bridge under another name`
      );
    }
    /* ⚠⚠ THE BRIDGE IS GONE FROM THE SOURCE, NOT MERELY UNCALLED. */
    const spine = strip(readFileSync(join("src", "lib", "transaction-spine.ts"), "utf8"));
    check("2 — ⚠⚠⚠ `basisForTransactionType` no longer exists",
      !/export function basisForTransactionType/.test(spine),
      "ruling 44: the bridge function is deleted, not kept");
    check("2 — ⚠ and no file calls it",
      SRC.filter((f) => /basisForTransactionType\(/.test(strip(readFileSync(f, "utf8")))).length === 0);
    /* ⚠⚠ ONE RULE BODY, TWO DOORS — ruling 44's `E585` clause. */
    check("2 — ⚠⚠ the shape rule has ONE body and two typed doors",
      (spine.match(/function assertPricedShape/g) ?? []).length === 1 &&
        /export function assertLineShape/.test(spine) &&
        /export function assertTransactionLineShape/.test(spine),
      "a second assert written against TransactionType would be the same rule twice");

    /* ⚠⚠ RULING 17: creating the order moved the request's status. */
    const wrAfter = await prisma.workRequest.findUnique({
      where: { id: rHire }, select: { status: true },
    });
    check("2 — ⚠⚠ the work request is ORDERED", wrAfter?.status === "ORDERED");
    check("2 — ⚠ and each line names its order",
      reqLines.every((l) => l.work_order_id != null && l.status === "ORDERED"));
    /* ⚠ One order per request — a second press must not build a second contract. */
    let refusedTwice = "";
    try {
      await hire(V(buyer.user_id), { workRequestId: rHire });
    } catch (e) {
      refusedTwice = (e as { code?: string }).code ?? "threw";
    }
    check("2 — ⚠⚠ a second HIRE is refused", refusedTwice === "ALREADY_ORDERED", refusedTwice);

    /* ═══ 3 · ⚠⚠⚠ RULING 43 — TWO ACCEPTANCES, AUTO-RELEASE ═══════════════ */
    check("3 — ⚠ the order is ISSUED, not DRAFT", oHire?.status === "ISSUED",
      "a DRAFT order is a contract nobody can act on");

    /* ⚠⚠⚠ THE BUYER CANNOT GO FIRST (ruling 43b). */
    let buyerFirst = "";
    try {
      await acceptOrder(V(buyer.user_id), viaHire.id);
    } catch (e) {
      buyerFirst = (e as { message?: string }).message ?? "threw";
    }
    check("3 — ⚠⚠⚠ the BUYER cannot accept before the provider",
      /provider hasn't accepted/i.test(buyerFirst), buyerFirst);
    const stillIssued = await readOrder(viaHire.id);
    check("3 — ⚠ and nothing moved", stillIssued?.status === "ISSUED" &&
      stillIssued?.provider_accepted_at === null);

    /* ⚠ A stranger cannot accept at all. */
    let stranger = "";
    try {
      await acceptOrder(V(other.user_id), viaHire.id);
    } catch (e) {
      stranger = (e as { code?: string }).code ?? "threw";
    }
    /* ⚠⚠ REFUSED AS `NOT_FOUND`, AND THAT IS BETTER THAN `FORBIDDEN` RATHER THAN
       a near miss: `loadParty` scopes the lookup to the two parties, so a
       stranger is told the order does not exist instead of learning that it does.
       ⚠ I expected `FORBIDDEN` and the code is right — recorded rather than
       "fixed". */
    check("3 — ⚠⚠ a non-party cannot accept, and is not told the order exists",
      stranger === "NOT_FOUND", stranger);

    /* ── THE PROVIDER ACCEPTS ─────────────────────────────────────────────── */
    await acceptOrder(V(provider.user_id), viaHire.id);
    const afterProvider = await readOrder(viaHire.id);
    check("3 — ⚠⚠ the provider's acceptance moves it to ACCEPTED",
      afterProvider?.status === "ACCEPTED");
    check("3 — ⚠ and stamps provider_accepted_at", afterProvider?.provider_accepted_at != null);
    check("3 — ⚠⚠⚠ it is NOT released on one acceptance",
      !bothPartiesAccepted(afterProvider!) && afterProvider?.buyer_accepted_at === null,
      "a contract with one signature is not in force");

    /* ⚠ The provider has nothing further to do. */
    check("3 — ⚠ the provider has no further action",
      availableActions(afterProvider!, "PROVIDER").length === 0);
    check("3 — ⚠⚠ and the buyer now has exactly one: ACCEPT",
      availableActions(afterProvider!, "BUYER").join() === "ACCEPT");

    /* ── ⚠⚠⚠ THE BUYER ACCEPTS, AND THAT AUTO-RELEASES ───────────────────── */
    await acceptOrder(V(buyer.user_id), viaHire.id);
    const released = await readOrder(viaHire.id);
    check("3 — ⚠⚠⚠ the SECOND acceptance releases the order, with nobody pressing release",
      released?.status === "RELEASED",
      "RELEASED has no human writer — it is what the last acceptance produces");
    check("3 — ⚠⚠ and both timestamps are present", bothPartiesAccepted(released!));
    check("3 — ⚠⚠⚠ the RETIRED column was NOT written",
      released?.buyer_released_at === null,
      "buyer_released_at is kept for trunk's readers and written by nothing");
    check("3 — ⚠ nobody has an action on a released order",
      availableActions(released!, "BUYER").length === 0 &&
        availableActions(released!, "PROVIDER").length === 0);
    /* ⚠⚠ AND THE COPY NEVER SAYS SOMEBODY RELEASED IT (43f). */
    check("3 — ⚠⚠⚠ the released sentence says both parties accepted",
      activationMessage("RELEASED", "BUYER") ===
        "Both parties have accepted. Settlements can be raised against this order.",
      activationMessage("RELEASED", "BUYER"));
    /* ⚠ The predicate and the row agree — `canAcceptNow` is the one gate. */
    check("3 — ⚠ canAcceptNow denies everyone on a released order",
      !canAcceptNow(released!, "BUYER") && !canAcceptNow(released!, "PROVIDER"));

    /* ═══ 4 · ⚠⚠⚠ RULING 16 — A DECLINE GOES BACK TO THE BUYER ════════════ */
    const rDecline = await makeRequisition(provider.id, [KINDS[0]!]);
    /* ⚠ A losing proposal, so the decline has somebody to hand the work back to. */
    await prisma.providerBid.create({
      data: {
        bid_number: `PB-PROBE-${Date.now().toString(36)}`,
        work_request_id: rDecline,
        provider_person_id: other.id,
        status: "NOT_SELECTED",
        submitted_at: new Date(),
      },
    });
    await prisma.providerBid.create({
      data: {
        bid_number: `PB-PROBE2-${Date.now().toString(36)}`,
        work_request_id: rDecline,
        provider_person_id: provider.id,
        status: "AWARDED",
        submitted_at: new Date(),
      },
    });
    const toDecline = await hire(V(buyer.user_id), { workRequestId: rDecline });
    await declineWorkOrder(V(provider.user_id), toDecline.id, "Booked elsewhere");

    const declined = await prisma.workOrder.findUnique({
      where: { id: toDecline.id }, select: { status: true },
    });
    check("4 — ⚠⚠ the declined order is CANCELLED and still exists", declined?.status === "CANCELLED");
    const wrBack = await prisma.workRequest.findUnique({
      where: { id: rDecline }, select: { status: true },
    });
    check("4 — ⚠⚠⚠ the work request goes BACK to the buyer as POSTED (ruling 16)",
      wrBack?.status === "POSTED");
    const lineBack = await prisma.workRequestLine.findFirst({
      where: { work_request_id: rDecline },
      select: { provider_person_id: true, status: true, work_order_id: true },
    });
    check("4 — ⚠ its line loses the provider and the order",
      lineBack?.provider_person_id === null && lineBack?.work_order_id === null &&
        lineBack?.status === "SOURCING");
    const bidsBack = await prisma.providerBid.findMany({
      where: { work_request_id: rDecline },
      select: { provider_person_id: true, status: true, declined_at: true, decline_reason: true },
    });
    const mine = bidsBack.find((b) => b.provider_person_id === provider.id);
    const theirs = bidsBack.find((b) => b.provider_person_id === other.id);
    check("4 — ⚠⚠ the declining provider's proposal records the refusal",
      mine?.status === "DECLINED" && mine?.declined_at != null &&
        mine?.decline_reason === "Booked elsewhere");
    check("4 — ⚠⚠⚠ and EVERYONE ELSE is back in contention as SUBMITTED",
      theirs?.status === "SUBMITTED",
      "leaving them NOT_SELECTED would show last time's answer to a buyer choosing again");
    /* ⚠ An accepted order cannot be declined — that is a cancellation, not this. */
    let lateDecline = "";
    try {
      await declineWorkOrder(V(provider.user_id), viaHire.id);
    } catch (e) {
      lateDecline = (e as { code?: string }).code ?? "threw";
    }
    check("4 — ⚠⚠ a released order cannot be declined", lateDecline === "NOT_DECLINABLE", lateDecline);

    /* ═══ 5 · ⚠⚠ GENERATED, NEVER AUTHORED (item 2) ══════════════════════ */
    const woSrc = strip(readFileSync(join("src", "lib", "work-orders.ts"), "utf8"));
    /* ⚠⚠⚠ THE INPUT TYPE IS THE ENFORCEMENT. A caller may name the request and,
       at the ERP door, the PO number. Nothing else — so there is no parameter
       through which a human could type a price, a date or a description. */
    /*
      ⚠⚠⚠ ASSERTED ON THE **INPUT SURFACE**, NOT ON THE WHOLE FILE — and the first
      version of this was a FALSE RED worth recording. ⚠ Sweeping the file for
      `quantity:` and `description:` matched the COPY block, where
      `quantity: l.quantity` is the generator doing exactly its job. ⚠⚠ **A gate
      that fails on correct code is a gate somebody switches off.**
      ⚠ So the window is the exported type plus the two exported signatures —
      everything a CALLER can reach — and nothing else.
    */
    const inputSurface = [
      /export type OrderFromRequisition = \{[\s\S]*?\n\};/,
      /export async function hire\([\s\S]*?\): Promise<BuiltOrder>/,
      /export async function acceptPurchaseOrder\([\s\S]*?\): Promise<BuiltOrder>/,
    ]
      .map((re) => woSrc.match(re)?.[0] ?? "")
      .join("\n");
    check("5 — the input surface was found (E586)", inputSurface.length > 120, `${inputSurface.length}`);
    for (const forbidden of [
      "unitPriceCents", "amountCents", "quantity", "description",
      "periodStart", "periodEnd", "feeBps", "providerPersonId", "status", "origin",
    ]) {
      check(
        `5 — ⚠⚠ ABSENCE: no caller can supply \`${forbidden}\``,
        !new RegExp(`\\b${forbidden}[?]?:`).test(inputSurface),
        "a field a human types is a bug in this step"
      );
    }
    /* ⚠ And the surface DOES take the two things it legitimately needs. */
    check("5 — ⚠ it takes the work request, and the PO door takes a PO number",
      /workRequestId: string/.test(inputSurface) && /poNumber: string/.test(inputSurface));
    check("5 — ⚠ the fee is snapshotted from the profile, not recomputed later",
      /service_fee_bps/.test(woSrc) && /fee_bps: feeBps/.test(woSrc));
    check("5 — ⚠⚠ and the period is derived from the lines",
      /Math\.min\(\.\.\.starts/.test(woSrc) && /Math\.max\(\.\.\.ends/.test(woSrc));

    /* ═══ 6 · ⚠⚠⚠ NO MONEY MOVED (item 7, ruling 25) ═════════════════════ */
    check("6 — ⚠⚠⚠ the order writer creates no Payment and writes no PAID",
      !/payment|PAID/i.test(woSrc),
      "ruling 25: build up to SettlementRequest APPROVED and no further");
    const payments = await prisma.payment.count();
    check("6 — ⚠⚠ and no Payment row exists anywhere", payments === 0, `${payments}`);

    /* ═══ 7 · ⚠⚠⚠ THE DASH→COUNT LIST (item 7) ══════════════════════════ */
    const profile = await prisma.providerProfile.findFirst({
      where: { person_id: provider.id }, select: { id: true },
    });
    const stats = await getStatistics(provider.id, provider.user_id, profile?.id ?? null, "all");
    const w = (stats as { work: Record<string, unknown> }).work;
    check("7 — ⚠⚠⚠ Work Orders is a NUMBER, not a dash", typeof w.workOrders === "number",
      `${JSON.stringify(w.workOrders)} — it read "work orders aren't created yet"`);
    check("7 — ⚠ and it counts this provider's orders",
      typeof w.workOrders === "number" && (w.workOrders as number) >= 1, `${w.workOrders}`);
    /* ⚠⚠⚠ AND EARNINGS IS STILL A DASH. **Nothing writes `PAID`, and that is
       still true after this brief** (item 7, explicitly). ⚠ A figure that became
       a count here would be claiming a mechanism that does not exist. */
    check("7 — ⚠⚠⚠ Earnings is STILL a dash, with its reason",
      typeof w.earnings === "object" && w.earnings != null &&
        typeof (w.earnings as { uncounted?: string }).uncounted === "string",
      `${JSON.stringify(w.earnings)} — no order can reach paid`);
  } finally {
    try {
      const tagged = (
        await prisma.workRequest.findMany({ where: { title: TAG }, select: { id: true } })
      ).map((r) => r.id);
      for (const id of tagged) if (!requestIds.includes(id)) requestIds.push(id);
      if (requestIds.length > 0) {
        const orders = await prisma.workOrder.findMany({
          where: { work_request_id: { in: requestIds } },
          select: { id: true },
        });
        const bids = await prisma.providerBid.findMany({
          where: { work_request_id: { in: requestIds } },
          select: { id: true },
        });
        await prisma.notification.deleteMany({
          where: {
            dedupe_key: {
              in: [
                ...orders.map((o) => `work.order_offered:${o.id}`),
                ...bids.map((b) => `work.proposal_received:${b.id}`),
              ],
            },
          },
        });
        /* ⚠⚠ THE ORDER MUST GO BEFORE THE REQUEST: `WorkRequestLine.work_order_id`
           is `onDelete: SetNull` toward the order, but `WorkOrder` has NO foreign
           key to the request (measured in WS-B), so nothing cascades either way. */
        await prisma.workOrderLine.deleteMany({
          where: { work_order_id: { in: orders.map((o) => o.id) } },
        });
        await prisma.workOrder.deleteMany({ where: { id: { in: orders.map((o) => o.id) } } });
        await prisma.workRequest.deleteMany({ where: { id: { in: requestIds } } });
      }
      /* ⚠ Orphan sweep — nothing in `src/` deletes a work request, so a work
         order pointing at one that is gone is probe residue. */
      const live = new Set(
        (await prisma.workRequest.findMany({ select: { id: true } })).map((r) => r.id)
      );
      const stranded = (
        await prisma.workOrder.findMany({ select: { id: true, work_request_id: true } })
      ).filter((r) => r.work_request_id != null && !live.has(r.work_request_id));
      if (stranded.length > 0) {
        await prisma.workOrderLine.deleteMany({
          where: { work_order_id: { in: stranded.map((r) => r.id) } },
        });
        await prisma.workOrder.deleteMany({ where: { id: { in: stranded.map((r) => r.id) } } });
      }
    } catch (e) {
      fails.push(`teardown — ${(e as Error).message}`);
    }
    const left = await prisma.workRequest.count({ where: { title: TAG } });
    check("8 — ⚠ the probe cleaned up after itself", left === 0, `${left} left`);
    const leftOrders = await prisma.workOrder.count();
    check("8 — ⚠⚠ and no work order survived", leftOrders === 0, `${leftOrders}`);
  }
}

async function report() {
  try {
    await main();
  } catch (e) {
    fails.push(`the gate itself threw — ${(e as Error).message}`);
  }
  await prisma.$disconnect().catch(() => {});
  console.log(`check:work-orders — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`);
  for (const f of fails) console.log(`\n  ✗ ${f}`);
  if (pass < 45) {
    console.log(`\n  ✗ E586 — only ${pass} assertions ran; this gate has ~60`);
    process.exit(1);
  }
  if (fails.length) process.exit(1);
}

report();
