"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OpenRequest } from "@/lib/admin-money";

const BTN = "inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40";
const BTN_W = "inline-flex min-h-11 items-center border border-ink bg-surface px-5 text-[14px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-40";
const FIELD = "h-11 w-full border border-line bg-surface px-3 text-[14px] outline-none focus:border-ink";
const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const toCents = (s: string) => (s.trim() === "" ? 0 : Math.round(Number(s) * 100));

// Record one buyer payment (received offline) and spread it across that account's approved requests.
export function RecordPayment({ open }: { open: OpenRequest[] }) {
  const router = useRouter();
  const accounts = useMemo(() => [...new Map(open.map((r) => [r.pAccountId, r.pAccountName])).entries()], [open]);
  const [account, setAccount] = useState(accounts[0]?.[0] ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ref, setRef] = useState("");
  const [apply, setApply] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const rows = open.filter((r) => r.pAccountId === account);
  const allocated = rows.reduce((n, r) => n + toCents(apply[r.id] ?? ""), 0);
  const received = toCents(amount);
  const over = allocated > received;

  const fillInOrder = () => {
    let left = received;
    const next: Record<string, string> = {};
    for (const r of rows) {
      const take = Math.min(left, r.remainingCents);
      if (take > 0) next[r.id] = (take / 100).toFixed(2);
      left -= take;
    }
    setApply(next);
  };

  const save = async () => {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pAccountId: account,
        amountCents: received,
        receivedAt: date,
        externalRef: ref,
        allocations: rows.map((r) => ({ settlementId: r.id, amountCents: toCents(apply[r.id] ?? "") })).filter((a) => a.amountCents > 0),
      }),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; paymentNumber?: string; paid?: string[] };
    setBusy(false);
    if (j.ok) {
      setNote({ ok: true, text: `Recorded ${j.paymentNumber}. ${j.paid?.length ?? 0} request(s) now paid.` });
      setAmount("");
      setRef("");
      setApply({});
      router.refresh();
    } else setNote({ ok: false, text: j.error ?? "That didn't save." });
  };

  if (open.length === 0)
    return <p className="border-t border-line py-5 text-[14px] text-ink-2">No approved payment requests are waiting on a buyer payment.</p>;

  return (
    <section data-testid="record-payment" className="border-t border-line py-5">
      <h2 className="text-[20px] font-bold">Record a Received Payment</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <label className="text-[12px] font-semibold text-ink-2 sm:col-span-2">
          Paid by
          <select className={FIELD + " mt-1"} value={account} onChange={(e) => { setAccount(e.target.value); setApply({}); }}>
            {accounts.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-semibold text-ink-2">
          Amount received ($)
          <input className={FIELD + " mt-1"} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount received" />
        </label>
        <label className="text-[12px] font-semibold text-ink-2">
          Received on
          <input type="date" className={FIELD + " mt-1"} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Received on" />
        </label>
        <label className="text-[12px] font-semibold text-ink-2 sm:col-span-2">
          Bank reference
          <input className={FIELD + " mt-1"} value={ref} onChange={(e) => setRef(e.target.value)} aria-label="Bank reference" />
        </label>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-[14px]">
          <thead>
            <tr className="border-b border-ink text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2">
              <th className="py-2">Request</th><th className="py-2">Work order</th><th className="py-2">Provider</th>
              <th className="py-2 text-right">Owed</th><th className="py-2 text-right">Apply ($)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-request={r.settlementNumber} className="border-b border-line">
                <td className="py-2 font-mono">{r.settlementNumber}</td>
                <td className="py-2">{r.orderNumber}</td>
                <td className="py-2">{r.providerName}</td>
                <td className="py-2 text-right">{money(r.remainingCents)}</td>
                <td className="py-2 text-right">
                  <input
                    className="h-9 w-28 border border-line bg-surface px-2 text-right"
                    inputMode="decimal"
                    aria-label={`Apply to ${r.settlementNumber}`}
                    value={apply[r.id] ?? ""}
                    onChange={(e) => setApply((a) => ({ ...a, [r.id]: e.target.value }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={"mt-2 text-[13px] " + (over ? "font-semibold text-red-700" : "text-ink-2")}>
        Applied {money(allocated)} of {money(received)}{over ? " — more than was received" : received > allocated ? ` · ${money(received - allocated)} left unallocated` : ""}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={BTN_W} onClick={fillInOrder} disabled={!received}>Fill Oldest First</button>
        <button type="button" className={BTN} onClick={save} disabled={busy || !received || over}>
          {busy ? "Saving…" : "Record Payment"}
        </button>
      </div>
      {note && <p className={"mt-3 text-[13.5px] font-semibold " + (note.ok ? "text-ink" : "text-red-700")}>{note.text}</p>}
    </section>
  );
}
