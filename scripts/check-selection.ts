import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { submitProposal } from "@/lib/proposals";
import {
  selectProvider,
  assignProviderDirectly,
  reverseSelection,
  talentLineMath,
  businessDaysBetween,
  HOURS_PER_DAY,
} from "@/lib/selection";

/**
 * ── ⚠⚠⚠ `check:selection` (`P2-A8-E621` WS-C) ───────────────────────────
 *
 * ⚠ THE STOP GATE: *"a requisition from Route A and one from Route B, identical
 * in shape; the arithmetic printed; the losers' state."*
 *
 * ⚠⚠ THE SHAPE COMPARISON IS DERIVED FROM THE ROWS, NOT FROM A TYPED FIELD LIST
 * (`E587`). A hard-coded list would still agree with itself after somebody added
 * a field to one route and not the other — which is the exact drift item 3
 * exists to prevent.
 */
let pass = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, why = "") => {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
};
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const TAG = "E621 selection probe";
const V = (userId: string) => ({ userId }) as never;

/* ⚠⚠ DELIBERATELY DISTINCT NUMBERS. Two zeros agree; two ones agree — every
   figure this gate compares has to be unmistakable if it lands in the wrong
   column. A rate of $150.00/h and a 10-business-day window give 80 h and
   $12,000.00, and none of those is any of the others. */
const RATE_CENTS = 15_000;
const RATE_B_CENTS = 21_500;

async function main() {
  const requestIds: string[] = [];

  try {
    const cast = await prisma.person.findMany({
      where: { NOT: { user_id: null } },
      select: { id: true, user_id: true, company: { select: { p_account_id: true } } },
      take: 6,
    });
    const buyer = cast.find((p) => p.company?.p_account_id);
    const providers = cast.filter((p) => p.id !== buyer?.id).slice(0, 3);
    if (!buyer?.user_id || !buyer.company?.p_account_id || providers.length < 3) {
      check("0 — a buyer and THREE providers exist (E586)", false,
        `${providers.length} providers — the losers' state needs more than one`);
      return;
    }
    check("0 — a buyer and three distinct providers", providers.length === 3);

    /* ⚠ A fixed ten-business-day window so the arithmetic is checkable by hand:
       Mon 2026-10-05 → Fri 2026-10-16 inclusive. */
    const START = new Date(Date.UTC(2026, 9, 5));
    const END = new Date(Date.UTC(2026, 9, 16));

    const makeRequest = async () => {
      const wr = await prisma.workRequest.create({
        data: {
          buyer_person_id: buyer.id,
          p_account_id: buyer.company!.p_account_id,
          title: TAG,
          status: "POSTED",
          proposal_access: "OPEN",
          start_date: START,
          end_date: END,
        },
        select: { id: true },
      });
      requestIds.push(wr.id);
      return wr.id;
    };

    /* ═══ 1 · ⚠⚠⚠ THE ARITHMETIC, PRINTED (item 1) ════════════════════════ */
    check("1 — ⚠ ten business days in the fixture window",
      businessDaysBetween(START, END) === 10, `${businessDaysBetween(START, END)}`);
    /* ⚠⚠ INCLUSIVE AT BOTH ENDS: one Tuesday is ONE day of work, not zero. */
    const tue = new Date(Date.UTC(2026, 9, 6));
    check("1 — ⚠⚠ a single weekday counts as one day, not zero",
      businessDaysBetween(tue, tue) === 1,
      "an exclusive count quotes a one-day engagement as free");
    check("1 — ⚠ a weekend alone is zero working days",
      businessDaysBetween(new Date(Date.UTC(2026, 9, 10)), new Date(Date.UTC(2026, 9, 11))) === 0);
    check("1 — ⚠ dates the wrong way round are zero, never negative",
      businessDaysBetween(END, START) === 0);

    const m = talentLineMath({
      startDate: START,
      endDate: END,
      positions: 1,
      unitPriceCents: RATE_CENTS,
    });
    console.log(`\n  ── THE ARITHMETIC ──\n  ${m.formula}\n`);
    /* ⚠⚠⚠ THE TOTAL IS RECOMPUTED HERE FROM THE PARTS, INDEPENDENTLY. A gate
       that asserted `m.amountCents === m.amountCents` would pass forever. */
    check("1 — ⚠⚠ hours follow from the dates", m.hours === 10 * HOURS_PER_DAY, `${m.hours}`);
    check("1 — ⚠⚠⚠ the amount is hours × rate, recomputed from the parts",
      m.amountCents === m.hours * RATE_CENTS && m.amountCents === 1_200_000,
      `${m.amountCents} vs ${m.hours * RATE_CENTS}`);
    check("1 — ⚠ every input is printed, not just the total",
      /10 business days/.test(m.formula) &&
        new RegExp(`${HOURS_PER_DAY} h/day`).test(m.formula) &&
        /80 h/.test(m.formula) &&
        /\$150\.00\/h/.test(m.formula) &&
        /\$12,000\.00/.test(m.formula),
      m.formula);
    /* ⚠ The hours-per-day figure is a stated constant, and positions multiply. */
    const m2 = talentLineMath({ startDate: START, endDate: END, positions: 3, unitPriceCents: RATE_CENTS });
    check("1 — ⚠ positions multiply the hours", m2.hours === 240, `${m2.hours}`);
    check("1 — ⚠ and the formula says so", /3 positions/.test(m2.formula), m2.formula);
    /* ⚠⚠ NO HARD-CODED TOTAL ANYWHERE IN THE MODULE. */
    const selSrc = strip(readFileSync(join("src", "lib", "selection.ts"), "utf8"));
    check("1 — ⚠⚠ the module computes the amount and never states one",
      /hours \* input\.unitPriceCents/.test(selSrc) &&
        !/amount_cents:\s*\d{4,}/.test(selSrc),
      "a literal amount in the writer is a total nobody derived");

    /* ═══ 2 · ⚠⚠ ROUTE A — the buyer picks a winner ═══════════════════════ */
    const rA = await makeRequest();
    const bids: { id: string; person: string }[] = [];
    for (const [i, p] of providers.entries()) {
      const r = await submitProposal(V(p.user_id!), {
        workRequestId: rA,
        coverNote: `probe ${i}`,
        rate: { unitPriceCents: RATE_CENTS + i * 100, uom: "HOUR" },
      });
      bids.push({ id: r.id, person: p.id });
    }
    check("2 — ⚠ three proposals exist, each with a rate", bids.length === 3);
    const pricedLines = await prisma.providerBidLine.count({
      where: { providerBid: { work_request_id: rA } },
    });
    /* ⚠⚠⚠ THE HALF THE `NOT NULL` MADE UNREACHABLE. Before WS-C dropped it,
       `ProviderBidLine` could not be written by ANY route — 0 writers for
       `BidRequestLine` — so a proposal could carry no price at all. */
    check("2 — ⚠⚠⚠ a proposal on an OPEN request CAN carry a rate",
      pricedLines === 3, `${pricedLines} — bid_request_line_id had to become nullable`);
    const openRate = await prisma.providerBidLine.findFirst({
      where: { providerBid: { work_request_id: rA } },
      select: { bid_request_line_id: true, unit_price_cents: true, quantity: true },
    });
    check("2 — ⚠ with no invited line to point at", openRate?.bid_request_line_id === null);
    check("2 — ⚠⚠ and NO quantity — the buyer's dates decide the hours",
      openRate?.quantity === null,
      "a provider-supplied quantity is a second source for the number WS-C computes");

    /* ⚠ One provider withdraws first, so the losers' sweep has something it
       must NOT touch. */
    const withdrawn = bids[2]!;
    await prisma.providerBid.update({ where: { id: withdrawn.id }, data: { status: "WITHDRAWN" } });

    const winner = bids[0]!;
    const selA = await selectProvider(V(buyer.user_id), {
      workRequestId: rA,
      providerPersonId: winner.person,
    });
    console.log(`  Route A: ${selA.math.formula}\n`);
    check("2 — ⚠⚠ selection creates the requisition line immediately",
      selA.workRequestLineId != null);
    check("2 — ⚠ and the rate came from the PROVIDER's proposal, not the buyer",
      selA.math.unitPriceCents === RATE_CENTS, `${selA.math.unitPriceCents}`);

    const lineA = await prisma.workRequestLine.findUnique({
      where: { id: selA.workRequestLineId },
      select: {
        transaction_type: true, quantity: true, unit_price_cents: true, amount_cents: true,
        provider_person_id: true, supplier_part_id: true, uom: true, status: true,
        service_start: true, service_end: true, description: true, work_order_id: true,
        recruiter_person_id: true, line_number: true,
      },
    });
    check("2 — ⚠⚠ SERVICE_BY_QTY — hours at a rate",
      lineA?.transaction_type === "SERVICE_BY_QTY");
    check("2 — the quantity is the computed hours", Number(lineA?.quantity) === 80, `${lineA?.quantity}`);
    check("2 — the amount is the computed total", lineA?.amount_cents === 1_200_000, `${lineA?.amount_cents}`);
    check("2 — the provider is on the line", lineA?.provider_person_id === winner.person);
    /* ⚠⚠⚠ A PERSON'S TIME IS NOT AN ITEM (`requisition_model_2026-09-21.md`). */
    check("2 — ⚠⚠⚠ a talent line carries NO Item ID",
      lineA?.supplier_part_id === null,
      "Scott: buying a person's time DOES NOT create an item");
    check("2 — ⚠ the buyer's dates are on the line", lineA?.service_start != null && lineA?.service_end != null);

    /* ── ⚠⚠ THE LOSERS (item 2) ──────────────────────────────────────────── */
    check("2 — ⚠ two other proposals were on the table", selA.notSelected === 1,
      `${selA.notSelected} — one had already withdrawn, so only one loses`);
    const after = await prisma.providerBid.findMany({
      where: { work_request_id: rA },
      select: { id: true, status: true },
    });
    check("2 — ⚠⚠⚠ ALL THREE PROPOSALS STILL EXIST", after.length === 3, `${after.length}`);
    check("2 — the winner is AWARDED",
      after.find((b) => b.id === winner.id)?.status === "AWARDED");
    check("2 — ⚠⚠ the loser is NOT_SELECTED, not deleted",
      after.find((b) => b.id === bids[1]!.id)?.status === "NOT_SELECTED");
    /* ⚠⚠⚠ AND THE WITHDRAWAL WAS NOT OVERWRITTEN. The provider ended that one;
       recording it as "not selected" would rewrite whose decision it was. */
    check("2 — ⚠⚠⚠ a WITHDRAWN proposal keeps its own ending",
      after.find((b) => b.id === withdrawn.id)?.status === "WITHDRAWN",
      "the provider ended that one, not the buyer");
    const wrA = await prisma.workRequest.findUnique({
      where: { id: rA }, select: { status: true },
    });
    check("2 — ⚠ the work request is ASSIGNED, not yet ORDERED", wrA?.status === "ASSIGNED");

    /* ═══ 3 · ⚠⚠⚠ ROUTE B — DIRECT, A FIRST-CLASS PATH (item 3) ═══════════ */
    const rB = await makeRequest();
    const selB = await assignProviderDirectly(V(buyer.user_id), {
      workRequestId: rB,
      providerPersonId: providers[1]!.id,
      unitPriceCents: RATE_B_CENTS,
    });
    console.log(`  Route B: ${selB.math.formula}\n`);
    check("3 — ⚠⚠ a buyer can assign directly, with NO proposal",
      selB.workRequestLineId != null);
    const bidsOnB = await prisma.providerBid.count({ where: { work_request_id: rB } });
    const ivOnB = await prisma.interviewRequest.count({ where: { work_request_id: rB } });
    check("3 — ⚠⚠⚠ and it reached the requisition with no proposal and no interview",
      bidsOnB === 0 && ivOnB === 0, `${bidsOnB}/${ivOnB}`);
    check("3 — the rate the buyer stated was used", selB.math.unitPriceCents === RATE_B_CENTS);
    check("3 — ⚠ the arithmetic is the SAME arithmetic", selB.math.hours === 80, `${selB.math.hours}`);
    check("3 — and its own total", selB.math.amountCents === 80 * RATE_B_CENTS, `${selB.math.amountCents}`);
    check("3 — ⚠ the route is recorded on the result", selB.route === "DIRECT" && selA.route === "PROPOSAL");
    check("3 — ⚠ and Route B has no proposal to point at", selB.providerBidId === null);

    /* ── ⚠⚠⚠ IDENTICAL IN SHAPE — THE STOP GATE'S OWN WORDS ─────────────── */
    const lineB = await prisma.workRequestLine.findUnique({
      where: { id: selB.workRequestLineId },
      select: {
        transaction_type: true, quantity: true, unit_price_cents: true, amount_cents: true,
        provider_person_id: true, supplier_part_id: true, uom: true, status: true,
        service_start: true, service_end: true, description: true, work_order_id: true,
        recruiter_person_id: true, line_number: true,
      },
    });
    /* ⚠⚠⚠ SHAPE = WHICH FIELDS ARE SET, DERIVED FROM THE ROWS THEMSELVES. The
       VALUES differ by design (two different rates); what must match is which
       columns each route fills. */
    const shape = (row: Record<string, unknown> | null) =>
      Object.entries(row ?? {})
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k]) => k)
        .sort()
        .join(",");
    check("3 — ⚠⚠⚠ Route A and Route B produce the IDENTICAL line shape",
      shape(lineA) === shape(lineB) && shape(lineA).length > 0,
      `A=[${shape(lineA)}] B=[${shape(lineB)}]`);
    check("3 — ⚠⚠ and the shape is not empty, so the comparison means something",
      shape(lineA).split(",").length >= 10, `${shape(lineA).split(",").length} fields`);
    check("3 — ⚠ the transaction type is the same on both",
      lineA?.transaction_type === lineB?.transaction_type);
    check("3 — ⚠⚠ and neither is an item line",
      lineA?.supplier_part_id === null && lineB?.supplier_part_id === null);
    /* ⚠⚠ ONE WRITER BEHIND BOTH DOORS (`E585`). Asserted on the source, because
       two copies that agree today are still two definitions. */
    check("3 — ⚠⚠⚠ both routes call ONE line writer",
      (selSrc.match(/writeRequisitionLine\(/g) ?? []).length === 3,
      "one definition plus two callers; a second upsert is the drift item 3 forbids");
    check("3 — ⚠ and only that writer upserts a work request line",
      (selSrc.match(/workRequestLine\.upsert/g) ?? []).length === 1);

    /* ═══ 4 · ⚠⚠⚠ RULING 17 — REVERSIBLE UNTIL THE ORDER EXISTS (item 4) ══ */
    const rev = await reverseSelection(V(buyer.user_id), rA);
    check("4 — ⚠⚠ the selection can be reversed before any order",
      rev.reopened === 2, `${rev.reopened} — the award and the one NOT_SELECTED`);
    const reopened = await prisma.providerBid.findMany({
      where: { work_request_id: rA }, select: { id: true, status: true },
    });
    check("4 — the award went back to SUBMITTED",
      reopened.find((b) => b.id === winner.id)?.status === "SUBMITTED");
    check("4 — ⚠ and so did the one that lost",
      reopened.find((b) => b.id === bids[1]!.id)?.status === "SUBMITTED");
    check("4 — ⚠⚠⚠ but the WITHDRAWN one was NOT revived",
      reopened.find((b) => b.id === withdrawn.id)?.status === "WITHDRAWN",
      "reviving it would undo the provider's own decision");
    const wrRev = await prisma.workRequest.findUnique({ where: { id: rA }, select: { status: true } });
    check("4 — the request is POSTED again", wrRev?.status === "POSTED");
    /* ⚠⚠ THE LINE IS KEPT AND RE-POINTED, NOT DELETED. */
    const lineRev = await prisma.workRequestLine.findUnique({
      where: { id: selA.workRequestLineId },
      select: { provider_person_id: true, status: true, amount_cents: true },
    });
    check("4 — ⚠⚠ the line survives the reversal", lineRev != null,
      "a line that vanishes reads as though the buyer never chose anybody");
    check("4 — with no provider on it", lineRev?.provider_person_id === null);

    /* ── ⚠⚠⚠ AND IT IS REFUSED ONCE A WORK ORDER EXISTS ─────────────────── */
    /* ⚠ The fence is read from `work_order_id`, so the test sets exactly that —
       a status-only fixture would pass against a writer that checked neither. */
    const rC = await makeRequest();
    const selC = await assignProviderDirectly(V(buyer.user_id), {
      workRequestId: rC,
      providerPersonId: providers[0]!.id,
      unitPriceCents: RATE_CENTS,
    });
    /* ⚠ A minimal order row, written DIRECTLY rather than through a writer —
       `workOrder.create` is WS-D's to build and does not exist yet. This proves
       the FENCE, not the creation. */
    const fakeOrder = await prisma.workOrder.create({
      data: {
        order_number: `WO-PROBE-${Date.now().toString(36)}`,
        origin: "INDIRECT",
        work_request_id: rC,
        buyer_person_id: buyer.id,
        provider_person_id: providers[0]!.id,
        p_account_id: buyer.company.p_account_id,
        status: "DRAFT",
        fee_bps: 0,
      },
      select: { id: true },
    });
    await prisma.workRequestLine.update({
      where: { id: selC.workRequestLineId },
      data: { work_order_id: fakeOrder.id },
    });
    let refusedReversal = "";
    try {
      await reverseSelection(V(buyer.user_id), rC);
    } catch (e) {
      refusedReversal = (e as { code?: string }).code ?? "threw";
    }
    check("4 — ⚠⚠⚠ reversal is REFUSED once the work order exists (ruling 17)",
      refusedReversal === "ALREADY_ORDERED", refusedReversal);
    await prisma.workRequestLine.update({
      where: { id: selC.workRequestLineId },
      data: { work_order_id: null },
    });
    await prisma.workOrder.delete({ where: { id: fakeOrder.id } });

    /* ═══ 5 · ⚠⚠ THE REFUSALS — NO GUESSES ═══════════════════════════════ */
    const rNoDates = await prisma.workRequest.create({
      data: {
        buyer_person_id: buyer.id,
        p_account_id: buyer.company.p_account_id,
        title: TAG,
        status: "POSTED",
        proposal_access: "OPEN",
      },
      select: { id: true },
    });
    requestIds.push(rNoDates.id);
    let refusedDates = "";
    try {
      await assignProviderDirectly(V(buyer.user_id), {
        workRequestId: rNoDates.id,
        providerPersonId: providers[0]!.id,
        unitPriceCents: RATE_CENTS,
      });
    } catch (e) {
      refusedDates = (e as { code?: string }).code ?? "threw";
    }
    check("5 — ⚠⚠⚠ no dates is a REFUSAL, never a guessed duration",
      refusedDates === "NO_DATES",
      "defaulting to 'a month' puts a number nobody chose on a line somebody is paid against");

    const rNoRate = await makeRequest();
    await submitProposal(V(providers[0]!.user_id!), { workRequestId: rNoRate });
    let refusedRate = "";
    try {
      await selectProvider(V(buyer.user_id), {
        workRequestId: rNoRate,
        providerPersonId: providers[0]!.id,
      });
    } catch (e) {
      refusedRate = (e as { code?: string }).code ?? "threw";
    }
    check("5 — ⚠⚠ a proposal with no rate cannot be priced",
      refusedRate === "PROPOSAL_HAS_NO_RATE",
      "the provider's LISTED profile rate is what they advertise, not what they proposed");

    /* ⚠ Only the buyer. Owner-scoping is the rule, not a nicety. */
    let refusedStranger = "";
    try {
      await assignProviderDirectly(V(providers[0]!.user_id!), {
        workRequestId: rB,
        providerPersonId: providers[2]!.id,
        unitPriceCents: RATE_CENTS,
      });
    } catch (e) {
      refusedStranger = (e as { code?: string }).code ?? "threw";
    }
    check("5 — ⚠⚠ only the buyer can select or assign", refusedStranger === "NOT_BUYER");

    /* ═══ 6 · ⚠⚠⚠ NO MONEY, AND NO SECOND REQUISITION TABLE ══════════════ */
    check("6 — ⚠⚠⚠ nothing in the selection writer touches money (ruling 25)",
      !/\bpayment\b|\bPAID\b|paymentLine|settlement/i.test(selSrc),
      "the line STATES an amount; nothing collects it");
    /* ⚠⚠ THE PREMISE CORRECTION, ASSERTED SO NOBODY ADDS THE TABLE LATER. */
    const schema = readFileSync(join("prisma", "schema.prisma"), "utf8");
    check("6 — ⚠⚠⚠ there is NO separate Requisition table — the cart IS the work request",
      !/^model Requisition/m.test(schema),
      "requisition_model_2026-09-21.md maps Requisition header -> WR_HEADER; a second header is two carts for one purchase");
    /* ⚠ And every WR_LINE field Scott listed still has its column. */
    const lineModel = (schema.match(/model WorkRequestLine \{([\s\S]*?)\n\}/) ?? [, ""])[1]!;
    for (const f of [
      "transaction_type", "description", "quantity", "unit_price_cents", "amount_cents",
      "provider_person_id", "recruiter_person_id", "work_order_id", "supplier_part_id",
      "service_start", "line_number", "status",
    ]) {
      check(`6 — WR_LINE field \`${f}\` has a column`, new RegExp(`\\n\\s+${f}\\s`).test(lineModel));
    }
  } finally {
    try {
      /*
        ⚠⚠⚠ SWEPT BY THE TAG, NOT ONLY BY THE IDS THIS RUN COLLECTED.
        ⚠ MEASURED: an earlier run threw before its teardown and left **5**
        tagged work requests behind, which the next run then reported as its own
        failure. ⚠⚠ A gate that cannot clean up after a crash reddens forever
        afterwards, and somebody switches it off. ⚠ The tag is a unique probe
        string, so this can only ever match this gate's own rows.
      */
      const tagged = (
        await prisma.workRequest.findMany({ where: { title: TAG }, select: { id: true } })
      ).map((r) => r.id);
      for (const id of tagged) if (!requestIds.includes(id)) requestIds.push(id);

      if (requestIds.length > 0) {
        const bidIds = (
          await prisma.providerBid.findMany({
            where: { work_request_id: { in: requestIds } },
            select: { id: true },
          })
        ).map((b) => b.id);
        await prisma.notification.deleteMany({
          where: { dedupe_key: { in: bidIds.map((id) => `work.proposal_received:${id}`) } },
        });
        /* ⚠⚠ NO FOREIGN KEY on `WorkOrder.work_request_id` either — measured in
           WS-B. Swept by hand for the same reason. */
        await prisma.workOrder.deleteMany({ where: { work_request_id: { in: requestIds } } });
        await prisma.workRequest.deleteMany({ where: { id: { in: requestIds } } });
      }
      /* ⚠ Orphan sweep, same argument as WS-B's: nothing calls
         `workRequest.delete` in `src/`, so an orphan is probe residue. */
      const live = new Set(
        (await prisma.workRequest.findMany({ select: { id: true } })).map((r) => r.id)
      );
      /* ⚠⚠ A NULL `work_request_id` IS NOT STRANDED — `WorkOrder.work_request_id`
         is nullable on purpose, because a direct order need not come from a
         request at all. Only a NON-NULL pointer at a request that is gone is
         residue. ⚠ Treating null as orphaned would delete real direct orders. */
      const strandedWo = (
        await prisma.workOrder.findMany({ select: { id: true, work_request_id: true } })
      ).filter((r) => r.work_request_id != null && !live.has(r.work_request_id));
      if (strandedWo.length > 0) {
        await prisma.workOrder.deleteMany({ where: { id: { in: strandedWo.map((r) => r.id) } } });
      }
    } catch (e) {
      fails.push(`teardown — ${(e as Error).message}`);
    }
    const left = await prisma.workRequest.count({ where: { title: TAG } });
    check("7 — ⚠ the probe cleaned up after itself", left === 0, `${left} left`);
    const leftWo = await prisma.workOrder.count();
    check("7 — ⚠⚠ and no work order was left behind", leftWo === 0, `${leftWo}`);
  }
}

async function report() {
  try {
    await main();
  } catch (e) {
    fails.push(`the gate itself threw — ${(e as Error).message}`);
  }
  await prisma.$disconnect().catch(() => {});
  console.log(`check:selection — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`);
  for (const f of fails) console.log(`\n  ✗ ${f}`);
  /* ⚠⚠ A GATE WITH NO INPUTS FAILS (`E586`). */
  if (pass < 40) {
    console.log(`\n  ✗ E586 — only ${pass} assertions ran; this gate has ~55`);
    process.exit(1);
  }
  if (fails.length) process.exit(1);
}

report();
