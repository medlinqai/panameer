"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MilestoneView } from "@/lib/order-milestones";

const fmt = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// CAT-E007: a line's payment schedule; the provider reports each milestone to raise its payment request.
export function Milestones({ orderId, rows, canReport }: { orderId: string; rows: MilestoneView[]; canReport: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const report = async (id: string) => {
    setBusy(id);
    setError(null);
    const r = await fetch(`/api/orders/${orderId}/milestones/${id}`, { method: "POST" });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!r.ok) return setError(j.error ?? "That didn't work.");
    router.refresh();
  };
  return (
    <div data-milestones className="mt-3 border-t border-line pt-3">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-ink-2">Payment schedule</p>
      <ul className="mt-1">
        {rows.map((m) => (
          <li key={m.id} data-milestone={m.reportedAt ? "reported" : "open"} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-[13.5px] last:border-0">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden className={"grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold " + (m.reportedAt ? "bg-ink text-surface" : "border-2 border-[#C9CDDC]")}>{m.reportedAt ? "✓" : m.sequence}</span>
              <span className="min-w-0 truncate"><b>{m.label}</b> · {m.percent}% · {fmt(m.amountCents)}</span>
            </span>
            {m.settlementId ? (
              <Link href={`/payments/payment-requests/${m.settlementId}`} className="text-[12.5px] font-bold text-magenta-dark underline underline-offset-4">Reported {m.reportedAt} · Payment Request</Link>
            ) : canReport ? (
              <button type="button" disabled={busy === m.id} onClick={() => report(m.id)} className="inline-flex min-h-9 items-center border border-ink px-3 text-[13px] font-semibold disabled:opacity-40">{busy === m.id ? "Reporting…" : m.action}</button>
            ) : (
              <span className="text-[12.5px] text-ink-3">Not reported yet</span>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-1 text-[13px] font-semibold text-magenta-dark">{error}</p>}
    </div>
  );
}
