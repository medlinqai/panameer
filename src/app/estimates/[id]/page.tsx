import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { estimateFor, EstimateError, lineAmount } from "@/lib/estimates";
import { formatCents } from "@/lib/display";
import { BILLING_CYCLE_LABEL, PAYMENT_TERMS_LABEL } from "@/lib/billing-terms";
import { CoverBand } from "@/components/casing/CoverBand";
import { EstimateActions } from "@/components/catalog/EstimateActions";

export const metadata = { title: "Cost Estimate · Panameer" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { DRAFT: "Draft", SENT: "Sent", CHANGES_REQUESTED: "Changes Requested", ACCEPTED: "Accepted", DECLINED: "Declined", EXPIRED: "Expired" };
const KIND: Record<string, string> = { SERVICE: "Service", FIXED: "Fixed", NOT_TO_EXCEED: "Not-to-exceed" };
const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// CAT-E006: one estimate, private to the provider and that customer. Signed out → Join / Sign In.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getSessionViewer();
  if (!viewer)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-[26px] font-bold">You&apos;ve Been Sent a Cost Estimate</h1>
        <p className="mt-2 text-[15px] text-ink-2">Join Panameer with your name and company to open it — then accept it, ask for changes or decline. It&apos;s free. After you join, open this link again.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/join/requester" className="inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface">Join Panameer</Link>
          <Link href={`/login?callbackUrl=${encodeURIComponent(`/estimates/${id}`)}`} className="inline-flex min-h-11 items-center border border-ink px-5 text-[14px] font-semibold">Sign In</Link>
        </div>
      </main>
    );
  let data;
  try {
    data = await estimateFor(viewer, id);
  } catch (e) {
    if (e instanceof EstimateError) notFound();
    throw e;
  }
  const { e, party, providerName, customerName } = data;
  const rev = e.revisions[0];
  const older = e.revisions.slice(1);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8" data-estimate={e.status}>
      <div className="border border-line bg-white">
        <CoverBand code="EST" tone={["#272334", "#6b2f6a"]} className="h-[96px]">Estimate · {e.estimate_number}{e.current_revision > 1 ? ` · Revision ${e.current_revision}` : ""}</CoverBand>
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold leading-tight">{e.title}</h1>
              <p className="mt-1 text-[13.5px] text-ink-2">{party === "PROVIDER" ? `For ${customerName}` : `From ${providerName}`} · valid to {day(e.valid_until)}</p>
            </div>
            <span className={"border px-3 py-1 text-[12.5px] font-bold " + (e.status === "SENT" || e.status === "CHANGES_REQUESTED" ? "border-magenta text-magenta-dark" : e.status === "ACCEPTED" ? "border-ink bg-ink text-surface" : "border-line text-ink-2")}>{STATUS[e.status]}</span>
          </div>
          {rev.scope && <p className="mt-4 whitespace-pre-wrap text-[14.5px]">{rev.scope}</p>}
          {rev.assumptions && <p className="mt-3 text-[13.5px] text-ink-2"><b className="text-ink">Assumptions:</b> {rev.assumptions}</p>}
          {rev.exclusions && <p className="mt-1 text-[13.5px] text-ink-2"><b className="text-ink">Not included:</b> {rev.exclusions}</p>}
          <table className="mt-5 w-full text-left text-[13.5px]">
            <thead><tr className="border-b border-line text-ink-3"><th className="py-1.5">Line</th><th className="text-right">Qty</th><th className="text-right">Rate / Price</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {rev.lines.map((l) => (
                <tr key={l.id} className="border-b border-line">
                  <td className="py-2"><b className="block">{l.description}</b><span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">{KIND[l.kind]}</span></td>
                  <td className="text-right">{l.kind === "SERVICE" ? `${Number(l.quantity)} ${(l.uom ?? "h").toLowerCase()}` : l.kind === "FIXED" ? "1" : "—"}</td>
                  <td className="text-right">{l.kind === "SERVICE" ? formatCents(l.rate_cents ?? 0, e.currency) : l.kind === "NOT_TO_EXCEED" ? "cap" : formatCents(l.amount_cents ?? 0, e.currency)}</td>
                  <td className="text-right font-semibold">{formatCents(lineAmount(l), e.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 flex justify-between text-[16px] font-bold"><span>Estimate total</span><span>{formatCents(rev.total_cents, e.currency)}</span></p>
          <p className="mt-1 text-[12.5px] text-ink-2">{PAYMENT_TERMS_LABEL[rev.payment_terms]} · services billed {BILLING_CYCLE_LABEL[rev.billing_cycle].toLowerCase()} by timesheet · fixed lines paid on acceptance · not-to-exceed lines drawn down by payment request.</p>
          {rev.message && <p className="mt-4 border-l-2 border-magenta pl-3 text-[14px] italic text-ink-2">{rev.message}</p>}
          <EstimateActions id={e.id} party={party} status={e.status} sent={!!rev.sent_at} workOrderId={e.work_order_id} />
        </div>
      </div>
      {(older.length > 0 || rev.customer_comment) && (
        <section className="mt-6">
          <h2 className="text-[16px] font-bold">History</h2>
          <ul className="mt-2 grid gap-2 text-[13px]">
            {[rev, ...older].filter((r) => r.sent_at).map((r) => (
              <li key={r.id} className="border-b border-line pb-2">
                <b>Revision {r.revision_number}</b> · sent {day(r.sent_at!)} · {formatCents(r.total_cents, e.currency)}
                {r.decision && <> · {STATUS[r.decision] ?? r.decision}{r.decided_at ? ` ${day(r.decided_at)}` : ""}</>}
                {r.customer_comment && <span className="block text-ink-2">“{r.customer_comment}”</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
