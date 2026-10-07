import { notFound, redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { formatCents, bpsToPercentLabel } from "@/lib/display";
import { Button } from "@/components/casing/Button";
import { OriginBadge, StatusPill } from "@/components/orders/OrderChrome";
import { OrderActivation } from "@/components/orders/OrderActivation";
import { getOrderDetail, OrderError, type OrderLineView } from "@/lib/orders";
import { BackLink } from "@/components/console/BackLink";
import { OrderTabs } from "@/components/orders/OrderTabs";
import { TimeDollars } from "@/components/orders/TimeDollars";
import { loadWoMoney } from "@/lib/wo-money";
import { WoPlanSection } from "@/components/orders/WoPlanSection";
import { History } from "@/components/orders/History";
import { orderHistory } from "@/lib/transaction-history";
import { CloseOrder } from "@/components/orders/CloseOrder";
import { BuyerCard } from "@/components/orders/BuyerCard";

export const metadata = { title: "Work Order · Panameer" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
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

  const { tab } = await searchParams;
  if (tab === "plan") {
    const money = await loadWoMoney(o.id);
    return (
      <div className="pm-white-page mx-auto w-full max-w-5xl">
        <BackLink href="/orders" label="Work Orders" />
        <p className="mt-2 text-[11px] font-semibold tracking-[0.12em] text-magenta">WORK ORDER {o.orderNumber}</p>
        <h1 className="mt-1 text-[28px] font-bold">{o.lines[0]?.description ?? o.orderNumber}</h1>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-ink-2">{o.buyerName} · {o.providerName}</p>
          {o.party === "PROVIDER" && o.status === "RELEASED" && (
            <a href={`/orders/${o.id}/settle`} className="inline-flex min-h-11 w-full items-center justify-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover sm:w-auto">
              Submit Time
            </a>
          )}
        </div>
        <OrderTabs id={o.id} current="plan" />
        {money && <TimeDollars m={money} currency={o.currency} />}
        <WoPlanSection orderId={o.id} viewer={viewer} hoursAuthorized={money?.hoursAuthorized ?? null} currency={o.currency} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <BackLink href="/orders" label="Work Orders" />

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">
              {o.orderNumber}
            </h1>
            <OriginBadge origin={o.origin} />
          </div>
          <p className="mt-1.5 text-[14.5px] text-ink-2">
            {o.buyerName} <span className="text-ink-2/60">→</span> {o.providerName}
          </p>
        </div>
        <StatusPill status={o.status} />
      </div>

      <OrderTabs id={o.id} current="overview" />
      {o.party === "PROVIDER" && <BuyerCard personId={o.buyerPersonId} />}

      {}
      <div className="mt-6">
        <OrderActivation orderId={o.id} actions={o.actions} message={o.activationMessage} />
      </div>

      {}
      {o.origin === "DIRECT" && (
        <div className="mt-4 rounded-brand border border-line bg-ink/[0.02] p-5">
          {}
          <p className="text-[15px] font-bold">An externally sourced work order</p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
            This deal was agreed outside Panameer and brought in to use settlement
            and payments. Panameer records this order rather than issuing it, and
            the master agreement between the parties is their own.
            {o.externalRef && (
              <>
                {" "}
                The buyer&apos;s reference is{" "}
                <span className="font-mono font-semibold text-ink">{o.externalRef}</span>.
              </>
            )}
          </p>
        </div>
      )}

      {o.sowText && (
        <section data-testid="order-sow" className="mt-6 border-t border-line pt-4">
          <h2 className="text-[18px] font-bold">Statement of Work</h2>
          <p className="mt-2 whitespace-pre-wrap text-[14.5px] leading-relaxed">{o.sowText}</p>
        </section>
      )}

      <dl data-testid="order-money" className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 border-y border-line py-5 sm:grid-cols-4">
        <Fact label="Hours">
          {o.hoursOrdered > 0 ? `${o.hoursClaimed} of ${o.hoursOrdered}` : "—"}
        </Fact>
        <Fact label="Approved">{formatCents(o.approvedCents, o.currency)}</Fact>
        <Fact label="Paid">{formatCents(o.paidCents, o.currency)}</Fact>
        <Fact label="Remaining">{formatCents(o.remainingCents, o.currency)}</Fact>
      </dl>

      <dl className="mt-6 grid gap-x-8 gap-y-3.5 rounded-brand border border-line bg-white p-5 sm:grid-cols-3">
        <Fact label="Period">
          {o.periodStart || o.periodEnd
            ? `${o.periodStart ?? "…"} → ${o.periodEnd ?? "…"}`
            : "Not set"}
        </Fact>
        <Fact label="Value">{formatCents(o.valueCents, o.currency)}</Fact>
        <Fact label="Drawn to date">{formatCents(o.drawnCents, o.currency)}</Fact>
        <Fact label="Not to exceed">
          {o.notToExceedCents == null ? "No cap" : formatCents(o.notToExceedCents, o.currency)}
        </Fact>
        <Fact label="Accepted">
          {o.providerAcceptedAt ? o.providerAcceptedAt.slice(0, 10) : "Not yet"}
        </Fact>
        <Fact label="Released">
          {o.buyerReleasedAt ? o.buyerReleasedAt.slice(0, 10) : "Not yet"}
        </Fact>
        {o.party === "PROVIDER" && (
          <>
            <Fact label="Service fee">
              {o.lineFeeBps != null ? bpsToPercentLabel(o.lineFeeBps) : "Varies by line"} ·{" "}
              {formatCents(o.feeCents, o.currency)}
            </Fact>
            <Fact label="You'll get">{formatCents(o.netCents, o.currency)}</Fact>
          </>
        )}
      </dl>

      {/* WHAT CHANGED — SHOWN TO THE PROVIDER BEFORE THEY ACCEPT. */}
      {o.hasChanges && (
        <div className="mt-6 rounded-brand border-2 border-amber-400/60 bg-amber-50/50 p-5">
          <p className="text-[16px] font-bold">These terms differ from the request</p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
            Compared with the work-request line this order came from — what the
            provider was asked to price. Approvers routinely change quantities and
            dates.
          </p>
          <ul className="mt-3.5 grid gap-2.5">
            {o.lines
              .filter((l) => l.changes.length > 0)
              .map((l) => (
                <li key={l.id}>
                  <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">
                    Line {l.lineNumber}
                  </p>
                  <ul className="mt-1 grid gap-1">
                    {l.changes.map((c) => (
                      <li key={c.field} className="text-[14px]">
                        <span className="font-semibold">{c.field}:</span>{" "}
                        <span className="text-ink-2 line-through">{c.was}</span>{" "}
                        <span aria-hidden>→</span>{" "}
                        <span className="font-semibold">{c.now}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* ══ WS-3 · THE DRAWDOWN ═══════════════════════════════════════════ */}
      <h2 className="mt-8 font-display text-[20px] font-bold tracking-[-0.3px]">
        Lines <span className="font-normal text-ink-2">({o.lines.length})</span>
      </h2>
      <ul className="mt-4 grid gap-3">
        {o.lines.map((l) => (
          <LineCard key={l.id} line={l} currency={o.currency} showFee={o.party === "PROVIDER"} />
        ))}
      </ul>

      <History events={await orderHistory(o.id)} />

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-6">
        {/* RAISING A PAYMENT REQUEST LIVES INSIDE THE ORDER . */}
        {o.party === "PROVIDER" && o.status === "RELEASED" && (
          <Button href={`/orders/${o.id}/settle`}>Raise a payment request</Button>
        )}
        {o.party === "BUYER" && (o.status === "RELEASED" || o.status === "ACTIVE") && <CloseOrder orderId={o.id} />}
        {o.workRequestId && (
          <Button href={`/work-requests/${o.workRequestId}`} variant="ghost">
            Open the work request
          </Button>
        )}
      </div>
    </div>
  );
}

/** THE TWO BASES DRAW DIFFERENTLY AND THE TWO BRANCHES ARE NOT COSMETIC. */
function LineCard({ line, currency, showFee }: { line: OrderLineView; currency: string; showFee: boolean }) {
  const d = line.drawdown;
  return (
    <li className="rounded-brand border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">
            Line {line.lineNumber} ·{" "}
            {line.transactionType === "SERVICE_BY_AMT" ? "Fixed amount" : "Rate"}
            {line.externalLineRef && <> · PO line {line.externalLineRef}</>}
            {showFee && <> · fee {bpsToPercentLabel(line.feeBps)}</>}
          </p>
          <p className="mt-1 text-[16px] font-bold">{line.description}</p>
          {(line.serviceStart || line.serviceEnd) && (
            <p className="mt-1 text-[13.5px] text-ink-2">
              {line.serviceStart ?? "…"} → {line.serviceEnd ?? "…"}
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
            {/* DRAWN OR NOT. There is no third state, and no bar. */}
            {d.drawn ? (
              <span className="font-semibold text-emerald-700">
                ✓ Drawn in full — {formatCents(d.drawnCents, currency)}
              </span>
            ) : (
              <span className="text-ink-2">
                Not drawn yet · draws once, in full
              </span>
            )}
            {/* THE IMPOSSIBLE STATE IS REPORTED, NOT DRAWN. `assertSettlementDraw` */}
            {d.inconsistent && (
              <p className="mt-1.5 text-[13.5px] font-semibold text-amber-700">
                This line records a partial draw of {formatCents(d.drawnCents, currency)}
                , which an amount line cannot have. Reported rather than shown as
                progress — please contact support.
              </p>
            )}
          </div>
        )}
      </div>

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
