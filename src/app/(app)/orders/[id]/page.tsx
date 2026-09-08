import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { formatCents } from "@/lib/display";
import { Button } from "@/components/casing/Button";
import { OriginBadge, StatusPill } from "@/components/orders/OrderChrome";
import { OrderActivation } from "@/components/orders/OrderActivation";
import { getOrderDetail, OrderError, type OrderLineView } from "@/lib/orders";

/**
 * `/orders/[id]` — THE WORK ORDER (`P1-J4-E393` WS-2 + WS-3).
 *
 * ⚠ THE WORK ORDER **IS** THE SOW (`P1-ALL-E380`, quoted in `lib/nav.ts`): scope,
 * duration and price are ITS FIELDS — not a separate document, not an attachment,
 * not a generated PDF to be signed. This page is therefore the document itself
 * and not a summary of one held elsewhere.
 *
 * ⚠⚠ EXCEPT FOR A DIRECT ORDER, WHERE IT **REPRESENTS** A SOW MADE ELSEWHERE.
 * The page says which of the two it is looking at, in a sentence, because the
 * platform can assert the terms of an order it generated and can only record the
 * existence of one it did not. ⚠ Which document GOVERNS if they disagree is a
 * lawyer's question — `E380` flagged it, and nothing here answers it.
 *
 * ⚠ NOT-FOUND, NOT FORBIDDEN, for a non-party. Telling a stranger that an order
 * id exists but belongs to other people is itself a leak.
 */
export const metadata = { title: "Work Order · Panameer" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
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

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link href="/orders" className="text-[13.5px] font-semibold text-ink-2 hover:text-magenta">
        ← Work Orders
      </Link>

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

      {/*
        ⚠⚠ THE TWO-SIDED ACTIVATION. The buttons come from `o.actions`, computed
        server-side by `availableActions(order, party)`. This page passes an
        ARRAY and no party flag — see `OrderActivation` for why that is the proof
        rather than a convention.
      */}
      <div className="mt-6">
        <OrderActivation orderId={o.id} actions={o.actions} message={o.activationMessage} />
      </div>

      {/*
        ⚠⚠ A DIRECT ORDER SAYS WHAT IT IS, IN WORDS, NOT ONLY IN A BADGE. The row
        on the list must not imply a work request; this page must not imply that
        Panameer issued terms it merely recorded.
      */}
      {o.origin === "DIRECT" && (
        <div className="mt-4 rounded-brand border border-line bg-ink/[0.02] p-5">
          <p className="text-[15px] font-bold">A direct work order</p>
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
      </dl>

      {/*
        ⚠⚠ WHAT CHANGED — SHOWN TO THE PROVIDER BEFORE THEY ACCEPT.
        *"ERP approvers cut quantities and shorten dates — that is what approval
        IS."* Accepting terms without being shown they moved is how a marketplace
        loses providers.

        ⚠⚠ AND THE HEADING SAYS EXACTLY WHAT IS BEING COMPARED. This is the ORDER
        against the WORK-REQUEST LINE — what the provider was ASKED to price. It
        is NOT the bid: `WorkOrderLine` has no link of any kind to
        `ProviderBidLine`, so an order-versus-bid diff cannot be computed today
        and this does not imply one. See `termChanges` and the report.
      */}
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
          <LineCard key={l.id} line={l} currency={o.currency} />
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-6">
        {/*
          ⚠⚠ RAISING A PAYMENT REQUEST LIVES INSIDE THE ORDER (`P1-J4-E394`).
          `nav.ts`: *"Timesheet and fixed-firm-price billing both surface as
          Payment Requests generated from a Work Order… A rail item for a thing
          that is a tab inside another thing taught the wrong model of how work
          gets billed."*

          ⚠ AND IT RENDERS FOR THE PROVIDER, ON A RELEASED ORDER, AND NOBODY
          ELSE — the same party rule the Accept/Release buttons follow. A buyer
          has nothing to claim; an unreleased order has nothing claimable.
          Absent, not disabled.
        */}
        {o.party === "PROVIDER" && o.status === "RELEASED" && (
          <Button href={`/orders/${o.id}/settle`}>Raise a payment request</Button>
        )}
        {o.workRequestId && (
          <Button href={`/work-requests/${o.workRequestId}`} variant="ghost">
            Open the work request
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * ⚠⚠ THE TWO BASES DRAW DIFFERENTLY AND THE TWO BRANCHES ARE NOT COSMETIC.
 *
 * A `RATE` line draws down BY QUANTITY, repeatedly, so it gets ordered / drawn /
 * remaining and a bar.
 *
 * ⚠⚠ AN `AMOUNT` LINE DRAWS ONCE, IN FULL (`E388` rule 3) — so it gets DRAWN or
 * NOT DRAWN and **no bar, no percentage and no "remaining"**. A part-drawn amount
 * line cannot exist, and `Drawdown`'s AMOUNT variant carries no field that could
 * express one, so this branch has nothing partial to render even by mistake.
 */
function LineCard({ line, currency }: { line: OrderLineView; currency: string }) {
  const d = line.drawdown;
  return (
    <li className="rounded-brand border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">
            Line {line.lineNumber} · {line.basis === "RATE" ? "Rate" : "Fixed amount"}
            {line.externalLineRef && <> · PO line {line.externalLineRef}</>}
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
        {d.basis === "RATE" ? (
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
            {/* ⚠ DRAWN OR NOT. There is no third state, and no bar. */}
            {d.drawn ? (
              <span className="font-semibold text-emerald-700">
                ✓ Drawn in full — {formatCents(d.drawnCents, currency)}
              </span>
            ) : (
              <span className="text-ink-2">
                Not drawn yet · draws once, in full
              </span>
            )}
            {/*
              ⚠⚠ THE IMPOSSIBLE STATE IS REPORTED, NOT DRAWN. `assertSettlementDraw`
              refuses a partial amount draw, so a row that is neither 0 nor the full
              amount did not come from the settlement path. Rendering it as a
              progress bar would make a data fault look like a feature.
            */}
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

      {/* ⚠ A line with no originating request line says so, rather than showing an
          empty diff — which would imply a comparison was made and found nothing. */}
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
