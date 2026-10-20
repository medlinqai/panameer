import Link from "next/link";
import { OrderTermsBlock } from "@/components/orders/OrderTermsBlock";
import { notFound, redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { formatCents, bpsToPercentLabel } from "@/lib/display";
import { Button } from "@/components/casing/Button";
import { OriginBadge, StatusPill } from "@/components/orders/OrderChrome";
import { OrderActivation } from "@/components/orders/OrderActivation";
import { getOrderDetail, OrderError, type OrderLineView } from "@/lib/orders";
import { BackLink } from "@/components/console/BackLink";
import { OrderTabs, type OrderTab } from "@/components/orders/OrderTabs";
import { OrderActionsMenu } from "@/components/orders/OrderActionsMenu";
import { TimeDollars } from "@/components/orders/TimeDollars";
import { loadWoMoney } from "@/lib/wo-money";
import { WoPlanSection } from "@/components/orders/WoPlanSection";
import { History } from "@/components/orders/History";
import { orderHistory } from "@/lib/transaction-history";
import { BILLABLE } from "@/lib/orders";
import { milestonesFor } from "@/lib/order-milestones";
import { OrderSchedule } from "@/components/orders/OrderSchedule";
import { OrderLifecycle } from "@/components/orders/OrderLifecycle";
import { OrderSettlements } from "@/components/orders/OrderSettlements";
import { ChangeOrders } from "@/components/orders/ChangeOrders";
import { changeBlocked, describeChanges, revisionsFor, type Diff, type LineField } from "@/lib/change-orders";
import { BuyerCard } from "@/components/orders/BuyerCard";
import { WORK_ORDER_LINE_LABEL } from "@/lib/oracle-status";
import { termsLine } from "@/lib/billing-terms";
import { providerPayReady } from "@/lib/your-path";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Work Order · Panameer" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; view?: string }>;
}) {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const { id } = await params;
  if (!viewer) redirect(`/login?callbackUrl=${encodeURIComponent(`/orders/${id}`)}`);

  let o;
  try {
    o = await getOrderDetail(viewer, id);
  } catch (e) {
    if (e instanceof OrderError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const { tab: rawTab, view } = await searchParams;
  const tab: OrderTab | null = view ? null : rawTab === "schedule" || rawTab === "plan" || rawTab === "settlements" ? rawTab : "lines";
  const revisions = await revisionsFor(o.id);
  const milestones = await milestonesFor(o.lines.map((l) => l.id));
  const pending = revisions.find((r) => r.status === "PENDING") ?? null;
  const pendingChange = !!pending;
  const blockedReason = changeBlocked({ status: o.status, frozen_at: o.frozen ? new Date() : null }, pendingChange);
  const money = (c: number) => formatCents(c, o.currency);

  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl">
      <BackLink href="/orders" label="Work Orders" />

      {/* ══ WT-E001 · THE HEADER — always on top ══ */}
      <header data-order-header className="mt-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">{o.orderNumber}</h1>
              <OriginBadge origin={o.origin} erpRef={o.erp ? o.externalRef ?? "" : null} />
            </div>
            <p className="mt-1.5 text-[14.5px] text-ink-2">
              {o.buyerName} <span className="text-ink-2/60">→</span> {o.providerName}
            </p>
            {/* WA-E005: the chain — Job → Work Request → this Work Order. */}
            {await chainLine(o.id)}
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusPill status={o.status} waiting={o.waiting} frozen={o.frozen} pendingChange={pendingChange} pendingOn={o.pendingOn} />
            <OrderActionsMenu orderId={o.id} controls={o.controls} unusedLabel={money(o.remainingCents)} pending={o.pendingRequests} />
          </div>
        </div>

        <dl data-testid="order-money" className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 rounded-brand border border-line bg-white p-5 sm:grid-cols-4">
          <Fact label="Period">{o.periodStart || o.periodEnd ? `${o.periodStart ?? "…"} → ${o.periodEnd ?? "…"}` : "Not set"}</Fact>
          <Fact label="Value">{money(o.valueCents)}</Fact>
          <Fact label="Drawn">{money(o.drawnCents)}</Fact>
          <Fact label="Remaining">{money(o.remainingCents)}</Fact>
          <Fact label="Not to exceed">{o.notToExceedCents == null ? "No cap" : money(o.notToExceedCents)}</Fact>
          <Fact label="Buyer accepted">{(o.buyerAcceptedAt ?? o.buyerReleasedAt)?.slice(0, 10) ?? "Not yet"}</Fact>
          <Fact label="Provider accepted">{o.providerAcceptedAt ? o.providerAcceptedAt.slice(0, 10) : "Not yet"}</Fact>
          {o.party === "PROVIDER" ? (
            <Fact label="You'll get">{money(o.netCents)} <span className="text-ink-2">· fee {o.lineFeeBps != null ? bpsToPercentLabel(o.lineFeeBps) : "varies"}</span></Fact>
          ) : (
            <Fact label="Hours">{o.hoursOrdered > 0 ? `${o.hoursClaimed} of ${o.hoursOrdered}` : "—"}</Fact>
          )}
        </dl>

        {pending && (
          <div data-pending-change className="mt-4 flex flex-wrap items-center justify-between gap-3 border-l-2 border-magenta bg-[#fbeafb] px-4 py-3 text-[14px]">
            <p className="min-w-0">
              <b>Change order {pending.changeOrderNumber ?? `#${pending.number}`} pending approval</b>
              <span className="text-ink-2"> — {describeChanges(pending.changes, money).slice(0, 3).join("; ")}</span>
            </p>
            <Link href={`/orders/${o.id}?view=changes`} className="font-semibold text-magenta-dark underline underline-offset-4">Review</Link>
          </div>
        )}
      </header>

      {/* WT-E006: the life cycle, directly under the header. */}
      <OrderLifecycle workRequestId={(await prisma.workOrder.findUniqueOrThrow({ where: { id: o.id }, select: { work_request_id: true } })).work_request_id} focusOrderId={o.id} />

      {o.party === "PROVIDER" && <BuyerCard personId={o.buyerPersonId} />}
      {/* WA-E003/E004: the terms each party is accepting. */}
      {o.pendingOn && <OrderTermsBlock orderId={o.id} />}
      {(o.actions.length > 0 || o.pendingOn) && (
        <div className="mt-6">
          <OrderActivation orderId={o.id} actions={o.actions} message={o.activationMessage} payNote={o.party === "PROVIDER" && !(await providerPayReady((await prisma.workOrder.findUniqueOrThrow({ where: { id: o.id }, select: { provider_person_id: true } })).provider_person_id))} />
        </div>
      )}
      {o.erp && (
        <div data-erp-order className="mt-4 border-l-2 border-ink py-1 pl-3.5 text-[14px] text-ink-2">
          {o.party === "BUYER"
            ? "This order comes from your ERP. Hold, freeze, close and changes happen there, and Panameer mirrors what your ERP sends."
            : "This order comes from the customer's ERP. Your acceptance goes back to their ERP, and payment requests go to it as receipts for the requester's approval."}
        </div>
      )}
      {o.origin === "DIRECT" && !o.erp && (
        <p className="mt-4 border-l-2 border-ink py-1 pl-3.5 text-[14px] text-ink-2">
          An externally sourced work order — agreed outside Panameer and brought in to use settlement and payments.
          {o.externalRef && <> The buyer&apos;s reference is <span className="font-mono font-semibold text-ink">{o.externalRef}</span>.</>}
        </p>
      )}

      <OrderTabs id={o.id} current={tab} />

      {/* WT-E005: Actions ▾ views — off the main page, each with a way back. */}
      {view && (
        <p className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <b className="text-[17px]">{view === "history" ? "Transaction History" : "Change History"}</b>
          <Link href={`/orders/${o.id}`} className="text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4">← Back to the order</Link>
        </p>
      )}
      {view === "history" && <section data-view="history" className="mt-2"><History events={await orderHistory(o.id)} /></section>}
      {view === "changes" && (
        <section data-view="changes" className="mt-2">
          <ChangeOrders
            orderId={o.id}
            party={o.party}
            canChange={o.party === "BUYER" && !blockedReason && !o.erp}
            blockedReason={o.erp ? "Change this order in your ERP." : blockedReason}
            header={{ nteCents: o.notToExceedCents, start: o.periodStart, end: o.periodEnd, sow: o.sowText }}
            lines={o.lines.map((l) => ({ id: l.id, lineNumber: l.lineNumber, description: l.description, byQuantity: l.drawdown.pricedBy === "QUANTITY", quantity: l.quantity, rateCents: l.unitPriceCents, amountCents: l.amountCents, start: l.serviceStart, end: l.serviceEnd }))}
            history={revisions.map((r) => ({ id: r.id, number: r.number, status: r.status, createdAt: r.createdAt, decidedAt: r.decidedAt, note: r.note, fromErp: r.fromErp, lines: describeChanges(r.changes, money) }))}
          />
        </section>
      )}

      {tab === "lines" && (
        <section data-tab="lines">
          {o.sowText && (
            <div data-testid="order-sow" className="mt-6">
              <h2 className="text-[17px] font-bold">Statement of Work</h2>
              <p className="mt-2 whitespace-pre-wrap text-[14.5px] leading-relaxed">{o.sowText}</p>
            </div>
          )}
          {o.hasChanges && (
            <div className="mt-6 rounded-brand border-2 border-amber-400/60 bg-amber-50/50 p-5">
              <p className="text-[16px] font-bold">These terms differ from the request</p>
              <ul className="mt-3 grid gap-2.5">
                {o.lines.filter((l) => l.changes.length > 0).map((l) => (
                  <li key={l.id}>
                    <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">Line {l.lineNumber}</p>
                    <ul className="mt-1 grid gap-1">
                      {l.changes.map((c) => (
                        <li key={c.field} className="text-[14px]"><span className="font-semibold">{c.field}:</span> <span className="text-ink-2 line-through">{c.was}</span> <span aria-hidden>→</span> <span className="font-semibold">{c.now}</span></li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="mt-5 grid gap-3">
            {o.lines.map((l) => (
              <LineCard key={l.id} line={l} currency={o.currency} showFee={o.party === "PROVIDER"} proposed={pending?.changes.lines.find((x) => x.lineId === l.id)?.fields ?? null} milestones={milestones.get(l.id) ? <p className="mt-3 text-[13px] text-ink-2">{milestones.get(l.id)!.length} milestone{milestones.get(l.id)!.length === 1 ? "" : "s"} — <Link href={`/orders/${o.id}?tab=schedule`} className="font-semibold text-magenta-dark underline underline-offset-4">see Schedule</Link></p> : null} />
            ))}
          </ul>
        </section>
      )}

      {tab === "plan" && (
        <section data-tab="plan">
          {await (async () => {
            const m = await loadWoMoney(o.id);
            return (
              <>
                {m && <TimeDollars m={m} currency={o.currency} />}
                <WoPlanSection orderId={o.id} viewer={viewer} hoursAuthorized={m?.hoursAuthorized ?? null} currency={o.currency} remainingCents={o.remainingCents} valueCents={o.valueCents} hourlyCents={o.lines.find((l) => (l.uom ?? "").toUpperCase() === "HOUR")?.unitPriceCents ?? null} />
              </>
            );
          })()}
        </section>
      )}

      {tab === "settlements" && (
        <section data-tab="settlements" className="mt-6">
          {o.party === "PROVIDER" && BILLABLE.includes(o.status) && <Button href={`/orders/${o.id}/settle`}>Raise a payment request</Button>}
          <OrderSettlements orderId={o.id} currency={o.currency} />
        </section>
      )}

      {tab === "schedule" && (
        <section data-tab="schedule" className="mt-6">
          <OrderSchedule orderId={o.id} lines={o.lines.map((l) => ({ id: l.id, lineNumber: l.lineNumber, description: l.description, serviceStart: l.serviceStart, serviceEnd: l.serviceEnd, percent: l.drawdown.percent }))} milestones={milestones} canReport={o.party === "PROVIDER" && BILLABLE.includes(o.status)} today={todayIso()} />
        </section>
      )}

      {o.party === "BUYER" && (
        <p className="mt-8 border-t border-line pt-5 text-[14px]">
          <Link href={o.jobId ? `/work-requests/${o.jobId}` : "/orders/work-requests"} className="font-semibold text-magenta-dark underline underline-offset-4">{o.jobId ? "Open the job" : "Open the work request"}</Link>
        </p>
      )}
    </div>
  );
}

/** THE TWO BASES DRAW DIFFERENTLY AND THE TWO BRANCHES ARE NOT COSMETIC. */
function LineCard({ line, currency, showFee, milestones, proposed }: { line: OrderLineView; currency: string; showFee: boolean; milestones?: React.ReactNode; proposed?: Partial<Record<LineField, Diff>> | null }) {
  const d = line.drawdown;
  // WT-E002: the current (approved) order; a pending change order shows "proposed: …" beside the value it changes.
  const prop = (k: LineField, fmt: (v: string | number) => string) => {
    const after = proposed?.[k]?.after;
    return after == null ? null : <span data-proposed={k} className="ml-1.5 rounded-full border border-magenta px-1.5 text-[11.5px] font-semibold text-magenta-dark">proposed: {fmt(after)}</span>;
  };
  const money = (v: string | number) => formatCents(Number(v), currency);
  return (
    <li className="rounded-brand border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">
            Line {line.lineNumber} ·{" "}
            {line.transactionType === "SERVICE_BY_AMT" ? "Amount · not to exceed" : "Rate"}
            {line.externalLineRef && <> · PO line {line.externalLineRef}</>}
            {line.status !== "OPEN" && <> · {WORK_ORDER_LINE_LABEL[line.status as keyof typeof WORK_ORDER_LINE_LABEL] ?? line.status}</>}
            {showFee && <> · fee {bpsToPercentLabel(line.feeBps)}</>}
          </p>
          <p className="mt-1 text-[16px] font-bold">{line.description}</p>
          {termsLine({ billing_cycle: line.billingCycle, payment_terms: line.paymentTerms, payment_event: line.paymentEvent }) && (
            <p data-line-terms className="mt-0.5 text-[13px] text-ink-2">{termsLine({ billing_cycle: line.billingCycle, payment_terms: line.paymentTerms, payment_event: line.paymentEvent })}</p>
          )}
          {(line.overtimeAllowed != null || line.expensesAllowed != null) && (
            <p data-line-ot-expenses className="mt-0.5 text-[13px] text-ink-2">
              {line.overtimeAllowed ? `Overtime at ${line.overtimeMultiplier ?? 1.5}× the rate` : "No overtime"} · {line.expensesAllowed ? (line.expensesCapCents != null ? `Expenses up to $${(line.expensesCapCents / 100).toLocaleString("en-US")}` : "Expenses allowed") : "No expenses"}
            </p>
          )}
          <p className="mt-1 text-[13.5px] text-ink-2" data-line-rate>
            {line.unitPriceCents != null ? <>{formatCents(line.unitPriceCents, currency)} per {(line.uom ?? "unit").toLowerCase()}{prop("unit_price_cents", money)}{line.quantity != null && <> · {line.quantity} {(line.uom ?? "unit").toLowerCase()}s{prop("quantity", String)}</>}</> : line.amountCents != null ? <>{formatCents(line.amountCents, currency)}{prop("amount_cents", money)}</> : null}
          </p>
          {(line.serviceStart || line.serviceEnd || proposed?.service_start || proposed?.service_end) && (
            <p className="mt-1 text-[13.5px] text-ink-2">
              {line.serviceStart ?? "…"}{prop("service_start", String)} → {line.serviceEnd ?? "…"}{prop("service_end", String)}
            </p>
          )}
        </div>
        <p className="text-[15px] font-bold">{formatCents(d.orderedCents, currency)}</p>
      </div>

      <div className="mt-3.5 border-t border-line pt-3.5">
        {d.pricedBy === "QUANTITY" ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[14px]">
              <span className="text-ink-2">
                <span className="font-semibold text-ink">{d.drawnQuantity}</span> of{" "}
                {d.orderedQuantity} {d.uom.toLowerCase()}
                {d.orderedQuantity === 1 ? "" : "s"} drawn
              </span>
              <span className="text-ink-2">
                <span className="font-semibold text-ink">
                  {d.remainingQuantity} {d.uom.toLowerCase()}
                  {d.remainingQuantity === 1 ? "" : "s"}
                </span>{" "}
                remaining · {formatCents(d.remainingCents, currency)}
              </span>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/[0.07]"
              role="progressbar"
              aria-valuenow={d.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Line ${line.lineNumber} drawn`}
            >
              <div className="h-full rounded-full bg-magenta" style={{ width: `${d.percent}%` }} />
            </div>
          </>
        ) : (
          <div className="text-[14px]">
            {/* O-E005: an amount (blanket) line is drawn down by payment requests, capped at its amount. */}
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-ink-2">
                <span className="font-semibold text-ink">{formatCents(d.drawnCents, currency)}</span> of {formatCents(d.orderedCents, currency)} drawn
              </span>
              <span className="text-ink-2">
                <span className="font-semibold text-ink">{formatCents(d.remainingCents, currency)}</span> remaining
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/[0.07]" role="progressbar" aria-valuenow={d.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Line ${line.lineNumber} drawn`}>
              <div className="h-full rounded-full bg-ink" style={{ width: `${d.percent}%` }} />
            </div>
            {d.inconsistent && (
              <p className="mt-1.5 text-[13.5px] font-semibold text-magenta-dark">
                This line records more drawn than its amount. Reported rather than shown as progress. Please contact support.
              </p>
            )}
          </div>
        )}
      </div>

      {milestones}
      {/* A line with no originating request line says so, rather than showing an */}
      {!line.hasOrigin && (
        <p className="mt-3 text-[13px] text-ink-2">
          No originating work-request line — nothing to compare these terms with.
        </p>
      )}
    </li>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-ink-2">{label}</dt>
      <dd className="mt-0.5 truncate text-[14.5px]">{children}</dd>
    </div>
  );
}

async function chainLine(orderId: string) {
  const w = await prisma.workOrder.findUnique({ where: { id: orderId }, select: { legacy_number: true, workRequest: { select: { wr_number: true, job: { select: { id: true, title: true } } } } } });
  const wr = w?.workRequest;
  if (!wr) return null;
  const was = w.legacy_number ? <> · was {w.legacy_number}</> : null;
  return (
    <p className="mt-0.5 text-[13px] text-ink-2" data-order-chain>
      From Work Request {wr.job ? <Link href={`/work-requests/${wr.job.id}`} className="font-semibold text-ink underline underline-offset-2">{wr.wr_number ?? "—"}</Link> : <b>{wr.wr_number ?? "—"}</b>}
      {wr.job && <> · Job: <Link href={`/work-requests/${wr.job.id}`} className="font-semibold text-ink underline underline-offset-2">{wr.job.title || "Untitled"}</Link></>}
      {was}
    </p>
  );
}

/** Today in New York, YYYY-MM-DD (the schedule's "now"). */
function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}
