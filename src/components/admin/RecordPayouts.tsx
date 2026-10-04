"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PayoutRow } from "@/lib/admin-money";

const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Requests the buyer has paid; admin pays the provider offline, then records it here.
export function RecordPayouts({ rows }: { rows: PayoutRow[] }) {
  const router = useRouter();
  const [method, setMethod] = useState<Record<string, string>>({});
  const [ref, setRef] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const save = async (r: PayoutRow) => {
    setBusy(r.settlementId);
    const res = await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settlementId: r.settlementId, method: method[r.settlementId] ?? "ACH", externalRef: ref[r.settlementId] ?? "", paidAt: today }),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; payoutNumber?: string };
    setBusy(null);
    setNote({ id: r.settlementId, ok: !!j.ok, text: j.ok ? `Recorded ${j.payoutNumber}.` : j.error ?? "That didn't save." });
    if (j.ok) router.refresh();
  };

  return (
    <section data-testid="record-payouts" className="border-t border-line py-5">
      <h2 className="text-[20px] font-bold">Provider Payouts</h2>
      <p className="mt-1 text-[13.5px] text-ink-2">Paid by the buyer, not yet paid out. Pay the net offline, then record it — the provider sees Paid.</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-2">Nothing waiting to be paid out.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-[14px]">
            <thead>
              <tr className="border-b border-ink text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2">
                <th className="py-2">Request</th><th className="py-2">Provider</th><th className="py-2 text-right">Gross</th>
                <th className="py-2 text-right">Fee</th><th className="py-2 text-right">Net to pay</th><th className="py-2 pl-4">Method</th>
                <th className="py-2">Reference</th><th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.settlementId} data-payout={r.settlementNumber} className="border-b border-line align-middle">
                  <td className="py-2 font-mono">{r.settlementNumber}<span className="block font-sans text-[12px] text-ink-2">{r.orderNumber}</span></td>
                  <td className="py-2">{r.providerName}</td>
                  <td className="py-2 text-right">{money(r.grossCents)}</td>
                  <td className="py-2 text-right">−{money(r.feeCents)}</td>
                  <td className="py-2 text-right font-semibold">{money(r.netCents)}</td>
                  <td className="py-2 pl-4">
                    <select className="h-9 border border-line bg-surface px-2" aria-label={`Method for ${r.settlementNumber}`} value={method[r.settlementId] ?? "ACH"} onChange={(e) => setMethod((m) => ({ ...m, [r.settlementId]: e.target.value }))}>
                      <option value="ACH">ACH</option><option value="WIRE">Wire</option><option value="OTHER">Other</option>
                    </select>
                  </td>
                  <td className="py-2">
                    <input className="h-9 w-36 border border-line bg-surface px-2" aria-label={`Reference for ${r.settlementNumber}`} value={ref[r.settlementId] ?? ""} onChange={(e) => setRef((m) => ({ ...m, [r.settlementId]: e.target.value }))} />
                  </td>
                  <td className="py-2 text-right">
                    <button type="button" className="inline-flex min-h-9 items-center bg-ink px-3 text-[13px] font-semibold text-surface disabled:opacity-40" disabled={busy === r.settlementId} onClick={() => save(r)}>
                      {busy === r.settlementId ? "Saving…" : "Record Payout"}
                    </button>
                    {note?.id === r.settlementId && <span className={"block text-[12px] " + (note.ok ? "text-ink" : "text-red-700")}>{note.text}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
