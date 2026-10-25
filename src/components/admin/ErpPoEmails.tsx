"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

// PE-E005: emailed POs — what came in, how it matched, and the two actions on a Needs Review row.
export type PoEmailRow = { id: string; at: string; from: string; connection: string; poNumber: string | null; status: string; note: string | null; orders: { id: string; number: string }[]; hasPdf: boolean; checks: { lineNumber: string; supplierConfigurationId: string | null; ok: boolean; reason: string | null }[] };
const PILL: Record<string, string> = { PROCESSED: "bg-state-accepted-bg text-state-accepted", NEEDS_REVIEW: "bg-state-pending-bg text-state-pending", FAILED: "bg-state-declined-bg text-state-declined", RECEIVED: "bg-state-inactive-bg text-state-inactive" };
const LABEL: Record<string, string> = { PROCESSED: "Processed", NEEDS_REVIEW: "Needs Review", FAILED: "Failed", RECEIVED: "Received" };

export function ErpPoEmails({ rows }: { rows: PoEmailRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const call = async (id: string, action: string, note?: string) => {
    setBusy(id); setError(null);
    const r = await fetch("/api/admin/erp/po-emails", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, note }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string; url?: string };
    setBusy(null);
    if (!r?.ok) { setError(j.error ?? "That didn't work."); return; }
    if (j.url) window.open(j.url, "_blank", "noopener"); else router.refresh();
  };
  return (
    <section className="mt-2" data-po-emails>
      {error && <p role="alert" className="mb-3 text-[13px] font-semibold text-state-declined">{error}</p>}
      <table className="w-full text-left text-[13px]">
        <thead><tr className="border-b border-line text-ink-2"><th className="py-2">Received</th><th>From</th><th>PO Number</th><th>Status</th><th>Order</th><th /></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line align-top">
              <td className="py-2 whitespace-nowrap">{r.at}<span className="block text-ink-3">{r.connection}</span></td>
              <td className="max-w-[220px] truncate">{r.from}</td>
              <td className="font-semibold">{r.poNumber ?? "—"}</td>
              <td>
                <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${PILL[r.status] ?? PILL.RECEIVED}`}>{LABEL[r.status] ?? r.status}</span>
                {r.note && <span className="mt-1 block text-ink-3">{r.note}</span>}
                {r.status === "NEEDS_REVIEW" && r.checks.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5" data-po-checks>
                    {r.checks.map((c) => <li key={c.lineNumber} className={c.ok ? "text-state-accepted" : "text-state-declined"}>Line {c.lineNumber}: {c.ok ? "Matches" : c.reason}</li>)}
                  </ul>
                )}
              </td>
              <td>{r.orders.length ? r.orders.map((o) => <Link key={o.id} href={`/orders/${o.id}`} className="block font-semibold underline">{o.number}</Link>) : "—"}</td>
              <td className="whitespace-nowrap text-right">
                {r.hasPdf && <button type="button" disabled={busy === r.id} onClick={() => call(r.id, "pdf")} className="mr-3 font-semibold underline">View PDF</button>}
                {r.status === "NEEDS_REVIEW" && <>
                  <button type="button" disabled={busy === r.id} onClick={() => call(r.id, "create")} className="mr-3 font-semibold underline" data-po-create>Create Order</button>
                  <button type="button" disabled={busy === r.id} onClick={() => { const n = window.prompt("Dismiss — why?"); if (n?.trim()) void call(r.id, "dismiss", n); }} className="font-semibold text-state-declined underline">Dismiss</button>
                </>}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={6} className="py-4 text-ink-2">No PO emails yet. ERPs email PO PDFs to each connection&apos;s PO Email address.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
