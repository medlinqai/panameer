import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { formatCents } from "@/lib/display";
import { SettlementStatusPill } from "@/components/settle/SettlementRows";
import { SettlementDecision } from "@/components/settle/SettlementDecision";
import { getSettlement, SettlementError } from "@/lib/settlements";

/**
 * `/finances/payment-requests/[id]` — ONE PAYMENT REQUEST (`P1-J4-E394`).
 *
 * ⚠⚠ ONE PAGE, BOTH PARTIES, TWO RENDERINGS. The provider reads what they
 * raised; the buyer reads it and decides. The lines render as a TIMESHEET or as a
 * MILESTONE ROW purely on each line's `basis` — the same branch the create screen
 * makes, from the same column, with no `settlement_type` anywhere.
 *
 * ⚠ THE DECISION BUTTONS COME FROM `settlement.actions`, computed server-side by
 * `settlementActions(settlement, party)`. This page passes an ARRAY and no party
 * flag — `E393`'s pattern, and `SettlementDecision` explains why that is the
 * proof rather than a convention.
 *
 * ⚠ ONE URL FOR BOTH SIDES ON PURPOSE. A buyer following a link from `/pay` and a
 * provider following one from their own list land on the same document; two
 * routes would mean two renderings of one record that could drift.
 */
export const metadata = { title: "Payment Request · Panameer" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const { id } = await params;
  if (!viewer)
    redirect(`/login?callbackUrl=${encodeURIComponent(`/finances/payment-requests/${id}`)}`);

  let s;
  try {
    s = await getSettlement(viewer, id);
  } catch (e) {
    /* ⚠ NOT A PARTY MEANS NOT FOUND — confirming an id exists is itself a leak. */
    if (e instanceof SettlementError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const timesheet = s.lines.filter((l) => l.basis === "RATE");
  const milestones = s.lines.filter((l) => l.basis === "AMOUNT");

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href={s.party === "BUYER" ? "/pay" : "/finances/payment-requests"}
        className="text-[13.5px] font-semibold text-ink-2 hover:text-magenta"
      >
        ← {s.party === "BUYER" ? "Payments" : "Payment Requests"}
      </Link>

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
        <SettlementStatusPill status={s.status} />
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-3.5 rounded-brand border border-line bg-white p-5 sm:grid-cols-3">
        <Fact label="Period">{s.periodStart} → {s.periodEnd}</Fact>
        <Fact label="Total">{formatCents(s.totalCents, s.currency)}</Fact>
        <Fact label="Submitted">{s.submittedAt ? s.submittedAt.slice(0, 10) : "Not yet"}</Fact>
      </dl>

      {/*
        ⚠⚠ A REJECTION IS SHOWN WITH ITS REASON, PROMINENTLY. That is the whole
        point of requiring one — `E388`: *"a rejection with no stated reason is
        unanswerable."* Hiding it in a timeline would waste the requirement.
      */}
      {s.status === "REJECTED" && (
        <div className="mt-5 rounded-brand border-2 border-rose-300 bg-rose-50/60 p-5">
          <p className="text-[15px] font-bold">Sent back</p>
          <p className="mt-1 whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-2">
            {s.decisionNote}
          </p>
        </div>
      )}

      {/* ⚠ THE DECISION — renders for the buyer on a SUBMITTED request and for
          nobody else. It returns null when `actions` is empty. */}
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
                    {/* ⚠ THE RATE IS THE ORDER'S, SHOWN AS A FACT. It was never
                        typed here — `priceSettlementLine` copied it. */}
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
