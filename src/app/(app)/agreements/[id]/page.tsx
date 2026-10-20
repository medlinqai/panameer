import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/display";
import { sowsUnder } from "@/lib/agreements";

export const dynamic = "force-dynamic";
export const metadata = { title: "Master Services Agreement · Panameer" };

// MS-E003: one MSA and the SOWs (Work Orders) under it — the viewer's own (buyer company or provider); Panameer admins see all.
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ buyer?: string; provider?: string }> }) {
  const viewer = await guardPage("authenticated");
  const { id } = await params;
  const f = await searchParams;
  const a = await prisma.agreement.findUnique({ where: { id } });
  if (!a) notFound();
  const admin = viewer.isSystemAdmin || viewer.isAdmin;
  const rows = await sowsUnder(viewer, a.id, admin ? f : {});
  const providers = admin ? await prisma.person.findMany({ where: { id: { in: (await prisma.workOrder.findMany({ where: { agreement_id: a.id }, distinct: ["provider_person_id"], select: { provider_person_id: true } })).map((w) => w.provider_person_id) } }, orderBy: { first_name: "asc" }, select: { id: true, first_name: true, last_name: true } }) : [];
  const currency = rows[0]?.currency ?? "USD";
  const sum = (k: "valueCents" | "settledCents" | "paidCents") => rows.reduce((n, r) => n + r[k], 0);
  const buyers = admin ? await prisma.workOrder.findMany({ where: { agreement_id: a.id }, distinct: ["p_account_id"], select: { p_account_id: true } }) : [];
  const buyerNames = admin ? new Map((await prisma.company.findMany({ where: { p_account_id: { in: buyers.map((b) => b.p_account_id) } }, select: { p_account_id: true, name: true } })).map((c) => [c.p_account_id, c.name])) : new Map<string, string>();
  return (
    <div className="pm-white-page mx-auto w-full max-w-6xl">
      <Link href={admin ? "/admin/agreements" : "/agreements"} className="text-[13px] font-semibold text-ink-2 hover:text-ink">← Agreements</Link>
      <header className="mt-2 rounded-brand border border-line bg-white p-5" data-msa-header>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-magenta-dark">Master Services Agreement</p>
        <h1 className="mt-1 font-display text-[26px] font-bold">{a.agreement_number}</h1>
        <p className="text-[15px]">{a.title}</p>
        <p className="mt-1 text-[13.5px] text-ink-2">Version {a.version} · effective {a.effective_date.toISOString().slice(0, 10)} · {a.status === "ACTIVE" ? "Active" : "Superseded"} · <Link href={a.document_url} className="font-semibold text-magenta-dark underline underline-offset-4">Read the full Terms of Service →</Link></p>
      </header>

      <h2 className="mt-6 text-[18px] font-bold">SOWs under this MSA</h2>
      {admin && (
        <form className="mt-2 flex flex-wrap gap-2 text-[13.5px]" data-msa-filters>
          <select name="buyer" defaultValue={f.buyer ?? ""} className="border border-line px-2 py-1.5">
            <option value="">All buyers</option>
            {buyers.map((b) => <option key={b.p_account_id} value={b.p_account_id}>{buyerNames.get(b.p_account_id) ?? b.p_account_id.slice(0, 8)}</option>)}
          </select>
          <select name="provider" defaultValue={f.provider ?? ""} className="border border-line px-2 py-1.5">
            <option value="">All providers</option>
            {providers.map((p) => <option key={p.id} value={p.id}>{`${p.first_name} ${p.last_name}`.trim()}</option>)}
          </select>
          <button type="submit" className="border border-ink px-3 font-semibold">Filter</button>
        </form>
      )}
      {rows.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-3">No Work Orders of yours under this MSA yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[13.5px]" data-sow-table>
            <thead>
              <tr className="border-b-2 border-ink text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">
                <th className="py-2 pr-3">Work Order (SOW)</th><th className="pr-3">Buyer</th><th className="pr-3">Provider</th><th className="pr-3">Status</th><th className="pr-3 text-right">Value</th><th className="pr-3 text-right">Settled</th><th className="pr-3 text-right">Paid</th><th>Period</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line" data-sow-row={r.number}>
                  <td className="py-2 pr-3"><Link href={`/orders/${r.id}`} className="font-mono font-semibold hover:underline">{r.number}</Link></td>
                  <td className="pr-3">{r.buyer}</td><td className="pr-3">{r.provider}</td><td className="pr-3">{r.status}</td>
                  <td className="pr-3 text-right tabular-nums">{formatCents(r.valueCents, r.currency)}</td>
                  <td className="pr-3 text-right tabular-nums">{formatCents(r.settledCents, r.currency)}</td>
                  <td className="pr-3 text-right tabular-nums">{formatCents(r.paidCents, r.currency)}</td>
                  <td className="text-ink-2">{r.period}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink font-bold" data-sow-totals>
                <td className="py-2 pr-3">{rows.length} SOW{rows.length === 1 ? "" : "s"}</td><td /><td /><td />
                <td className="pr-3 text-right tabular-nums">{formatCents(sum("valueCents"), currency)}</td>
                <td className="pr-3 text-right tabular-nums">{formatCents(sum("settledCents"), currency)}</td>
                <td className="pr-3 text-right tabular-nums">{formatCents(sum("paidCents"), currency)}</td><td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
