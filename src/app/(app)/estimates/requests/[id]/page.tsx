import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { requestFor } from "@/lib/estimate-requests";
import { RequestActions } from "@/components/catalog/RequestActions";

export const metadata = { title: "Cost Estimate Request · Panameer" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { OPEN: "Open", ANSWERED: "Answered", DECLINED: "Declined", WITHDRAWN: "Withdrawn" };

// EST-E002: one request — private to the buyer and the provider.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await guardPage("authenticated");
  const { id } = await params;
  const d = await requestFor(viewer, id).catch(() => null);
  if (!d) notFound();
  const { r, party } = d;
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8" data-estimate-request={r.status}>
      <Link href="/estimates" className="text-[13px] font-bold text-ink-2 hover:text-magenta">‹ Cost Estimates</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">COST ESTIMATE REQUEST</p>
          <h1 className="mt-1 text-[24px] font-bold">{party === "PROVIDER" ? `${d.buyerName}${d.buyerCompany ? ` · ${d.buyerCompany}` : ""}` : `To ${d.providerName}`}</h1>
          <p className="text-[13px] text-ink-3">Sent {r.created_at.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{d.service ? ` · for ${d.service.name}` : d.product ? ` · for ${d.product.title}` : ""}</p>
        </div>
        <span className={"border px-3 py-1 text-[12.5px] font-bold " + (r.status === "OPEN" ? "border-magenta text-magenta-dark" : "border-line text-ink-2")}>{STATUS[r.status]}</span>
      </div>
      <p className="mt-5 whitespace-pre-wrap text-[15px]">{r.description}</p>
      <dl className="mt-4 grid grid-cols-[130px_minmax(0,1fr)] gap-y-1.5 text-[14px]">
        {r.start_by && (<><dt className="font-semibold text-ink-3">Preferred start</dt><dd>{r.start_by.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd></>)}
        {d.budget && (<><dt className="font-semibold text-ink-3">Budget</dt><dd>{d.budget}</dd></>)}
        {d.attachments.length > 0 && (<><dt className="font-semibold text-ink-3">Files</dt><dd className="grid gap-1">{d.attachments.map((a) => <a key={a.path} href={`/api/estimate-requests/${r.id}/file?path=${encodeURIComponent(a.path)}`} className="truncate font-semibold text-magenta-dark underline underline-offset-4">{a.name}</a>)}</dd></>)}
        {r.decline_reason && (<><dt className="font-semibold text-ink-3">Reason</dt><dd>{r.decline_reason}</dd></>)}
      </dl>
      {r.cost_estimate_id && (r.status === "ANSWERED" || party === "PROVIDER") && <Link href={`/estimates/${r.cost_estimate_id}`} className="mt-5 inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface">Open the Estimate</Link>}
      <RequestActions id={r.id} party={party} status={r.status} hasDraft={!!r.cost_estimate_id} />
    </main>
  );
}
