import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { formatCents, bpsToPercentLabel } from "@/lib/display";
import { SettlementStatusPill } from "@/components/settle/SettlementRows";
import { SettlementDecision } from "@/components/settle/SettlementDecision";
import { getSettlement, SettlementError } from "@/lib/settlements";
import { BackLink } from "@/components/console/BackLink";
import { History } from "@/components/orders/History";
import { settlementHistory } from "@/lib/transaction-history";
import { remitInstructions } from "@/lib/remit";

export const metadata = { title: "Payment Request · Panameer" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const { id } = await params;
  if (!viewer)
    redirect(`/login?callbackUrl=${encodeURIComponent(`/payments/payment-requests/${id}`)}`);

  let s;
  try {
    s = await getSettlement(viewer, id);
  } catch (e) {
    if (e instanceof SettlementError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const timesheet = s.lines.filter((l) => l.basis === "RATE");
  const milestones = s.lines.filter((l) => l.basis === "AMOUNT");

  return (
    <div className="mx-auto w-full max-w-4xl">
      <BackLink
        href={s.party === "BUYER" ? "/pay" : "/payments/payment-requests"}
        label={s.party === "BUYER" ? "Payments" : "Payment Requests"}
      />

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">
            {s.settlementNumber}
          </h1>
          <p className="mt-1.5 text-[14.5px] text-ink-2">
            {s.providerName} <span className="text-ink-2/60">→</span> {s.buyerName} ·{" "}
            <Link href={`/orders/${s.orderId}`} className="underline underline-offset-2 hover:text-magenta">
              {s.orderNumber}
            </Link>
          </p>
        </div>
        <SettlementStatusPill status={s.status} paidOut={s.party === "PROVIDER" ? !!s.paidOut : undefined} erp={s.erp} />
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-3.5 rounded-brand border border-line bg-white p-5 sm:grid-cols-3">
        <Fact label="Period">{s.periodStart} → {s.periodEnd}</Fact>
        <Fact label="Total">{formatCents(s.totalCents, s.currency)}</Fact>
        <Fact label="Submitted">{s.submittedAt ? s.submittedAt.slice(0, 10) : "Not yet"}</Fact>
        <Fact label="Due">{s.dueDate ?? "—"}</Fact>
        {s.party === "PROVIDER" && (
          <>
            <Fact label="Service fee">
              {feeLabel(s.lines.map((l) => l.feeBps))} · {formatCents(s.feeCents, s.currency)}
            </Fact>
            <Fact label="You'll get">{formatCents(s.netCents, s.currency)}</Fact>
          </>
        )}
      </dl>

      {/* A REJECTION IS SHOWN WITH ITS REASON, PROMINENTLY. That is the whole */}
      {(s.resubmitOf || s.resubmittedAs) && (
        <p data-testid="resubmit-link" className="mt-4 text-[14px] text-ink-2">
          {s.resubmitOf && (
            <>Resubmission of <Link href={`/payments/payment-requests/${s.resubmitOf.id}`} className="font-mono underline">{s.resubmitOf.number}</Link>, which was sent back.</>
          )}
          {s.resubmittedAs && (
            <>Resubmitted as <Link href={`/payments/payment-requests/${s.resubmittedAs.id}`} className="font-mono underline">{s.resubmittedAs.number}</Link>.</>
          )}
        </p>
      )}

      {s.status === "REJECTED" && s.party === "PROVIDER" && !s.resubmittedAs && (
        <div className="mt-4">
          <Link
            href={`/orders/${s.orderId}/settle?from=${s.id}`}
            className="inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover"
          >
            Resubmit
          </Link>
        </div>
      )}

      {s.status === "REJECTED" && (
        <div className="mt-5 rounded-brand border-2 border-rose-300 bg-rose-50/60 p-5">
          <p className="text-[15px] font-bold">Rejected</p>
          <p className="mt-1 whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-2">
            {s.decisionNote}
          </p>
        </div>
      )}

      {/* THE DECISION — renders for the buyer on a SUBMITTED request and for */}
      {s.party === "PROVIDER" && s.paidOut && (
        <section data-testid="paid-out" className="mt-6 border-t-2 border-ink pt-5">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">PAID</p>
          <p className="mt-1 text-[28px] font-bold">{formatCents(s.paidOut.netCents, s.currency)}</p>
          <p className="mt-1 text-[14px] text-ink-2">
            Sent {s.paidOut.paidAt ?? ""}{s.paidOut.method ? ` by ${s.paidOut.method === "WIRE" ? "wire" : s.paidOut.method}` : ""}, after the{" "}
            {formatCents(s.feeCents, s.currency)} service fee.
          </p>
        </section>
      )}

      {s.party === "BUYER" && s.status === "APPROVED" && (
        <PaymentDue amountCents={s.totalCents} currency={s.currency} reference={s.settlementNumber} />
      )}

      <div className="mt-5">
        <SettlementDecision settlementId={s.id} actions={s.actions} hasTimesheet={s.hasTimesheet} />
      </div>

      {/* ══ THE TIMESHEET RENDERING — one row per service date ═══════════ */}
      {timesheet.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-[20px] font-bold tracking-[-0.3px]">
            Time claimed{" "}
            <span className="font-normal text-ink-2">
              ({timesheet.reduce((n, l) => n + (l.quantity ?? 0), 0)}{" "}
              {(timesheet[0].uom ?? "hour").toLowerCase()}s)
            </span>
          </h2>
          <div className="mt-4 overflow-x-auto rounded-brand border border-line bg-white">
            <table className="w-full min-w-[520px] text-[14px]">
              <thead>
                <tr className="border-b border-line text-left text-[12.5px] uppercase tracking-[0.06em] text-ink-2">
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold">{(timesheet[0].uom ?? "hour").toLowerCase()}s</th>
                  <th className="px-5 py-3 font-bold">Rate</th>
                  <th className="px-5 py-3 font-bold">What</th>
                  <th className="px-5 py-3 text-right font-bold">Value</th>
                </tr>
              </thead>
              <tbody>
                {timesheet.map((l) => (
                  <tr key={l.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">{l.serviceDate ?? "—"}</td>
                    <td className="px-5 py-3">{l.quantity ?? 0}</td>
                    {/* THE RATE IS THE ORDER'S, SHOWN AS A FACT. It was never */}
                    <td className="px-5 py-3 text-ink-2">
                      {formatCents(l.unitPriceCents ?? 0, s.currency)}
                    </td>
                    <td className="px-5 py-3 text-ink-2">{l.note ?? "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {formatCents(l.valueCents, s.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ THE MILESTONE RENDERING — one row, in full ═══════════════════ */}
      {milestones.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-[20px] font-bold tracking-[-0.3px]">
            Fixed amounts claimed
          </h2>
          <ul className="mt-4 grid gap-3">
            {milestones.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-brand border border-line bg-white p-5"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-bold">{l.description ?? "Fixed amount"}</p>
                  <p className="mt-0.5 text-[13.5px] text-ink-2">Claimed in full</p>
                </div>
                <p className="text-[15px] font-bold">{formatCents(l.valueCents, s.currency)}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <p className="text-[16px] font-bold">Total {formatCents(s.totalCents, s.currency)}</p>
      </div>

      <History events={await settlementHistory(s.id)} />
    </div>
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

function feeLabel(bps: number[]): string {
  const u = [...new Set(bps)];
  return u.length === 1 ? bpsToPercentLabel(u[0]) : "Varies by line";
}

function PaymentDue({ amountCents, currency, reference }: { amountCents: number; currency: string; reference: string }) {
  const r = remitInstructions();
  const rows: [string, string | null][] = [
    ["Pay to", r.payee],
    ["Bank", r.bankName],
    ["Account name", r.accountName],
    ["Routing (ACH)", r.routingNumber],
    ["Account number", r.accountNumber],
    ["SWIFT (wire)", r.swift],
    ["Bank address", r.bankAddress],
  ];
  return (
    <section data-testid="payment-due" className="mt-6 border-t-2 border-ink pt-5">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">PAYMENT DUE</p>
      <p className="mt-1 text-[28px] font-bold">{formatCents(amountCents, currency)}</p>
      <p className="mt-1 text-[14px] text-ink-2">
        Pay {r.payee} by ACH or wire. Put reference <b className="font-mono text-ink">{reference}</b> on the payment so we
        can match it. We pay the provider once your payment arrives.
      </p>
      {r.configured ? (
        <dl className="mt-4 grid max-w-xl grid-cols-[160px_1fr] gap-y-2 text-[14px]">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-2">{k}</dt>
                <dd className="font-mono">{v}</dd>
              </div>
            ))}
        </dl>
      ) : (
        <p className="mt-3 text-[14px] text-ink-2">
          Bank details to follow — email <a className="underline" href={`mailto:${r.contactEmail}`}>{r.contactEmail}</a> with
          reference {reference} and we will send them.
        </p>
      )}
    </section>
  );
}
