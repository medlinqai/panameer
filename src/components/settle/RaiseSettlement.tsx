"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/casing/Button";
import { formatCents } from "@/lib/display";
import type { SettleForm, SettleLineOption } from "@/lib/settlements";

type Row = { key: string; serviceDate: string; quantity: string; note: string };

let seq = 0;
const newRow = (date: string): Row => ({
  key: `r${seq++}`,
  serviceDate: date,
  quantity: "",
  note: "",
});

export type ResubmitPrefill = {
  id: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  rate: { workOrderLineId: string; serviceDate: string; quantity: number; note: string }[];
  amountLineIds: string[];
};

export function RaiseSettlement({ form, resubmit }: { form: SettleForm; resubmit?: ResubmitPrefill | null }) {
  const router = useRouter();
  const [periodStart, setPeriodStart] = useState(resubmit?.periodStart ?? form.orderPeriodStart ?? "");
  const [periodEnd, setPeriodEnd] = useState(resubmit?.periodEnd ?? form.orderPeriodEnd ?? "");
  // A resubmission starts from the rejected request's lines; the provider edits what was sent back.
  const [rowsByLine, setRowsByLine] = useState<Record<string, Row[]>>(() => {
    const out: Record<string, Row[]> = {};
    for (const r of resubmit?.rate ?? [])
      (out[r.workOrderLineId] ??= []).push({ ...newRow(r.serviceDate), quantity: String(r.quantity), note: r.note });
    return out;
  });
  const [claimed, setClaimed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((resubmit?.amountLineIds ?? []).map((id) => [id, true]))
  );
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rate = form.lines.filter((l) => l.transactionType !== "SERVICE_BY_AMT");
  const amount = form.lines.filter((l) => l.transactionType === "SERVICE_BY_AMT");

  const rowsFor = (id: string) => rowsByLine[id] ?? [];
  const setRows = (id: string, rows: Row[]) =>
    setRowsByLine((prev) => ({ ...prev, [id]: rows }));

  /** O-E005: the draw-down on an amount line; blank means what's left. */
  const amountFor = (l: SettleLineOption) => {
    const v = amounts[l.workOrderLineId];
    return v == null || v.trim() === "" ? l.remainingCents ?? l.amountCents ?? 0 : Math.round(Number(v) * 100);
  };

  /** CLAIMED SO FAR, PER LINE — what "remaining" counts down from. */
  const claimedQty = (id: string) =>
    rowsFor(id).reduce((n, r) => n + (Number(r.quantity) || 0), 0);

  const total = useMemo(() => {
    let cents = 0;
    for (const l of rate) cents += Math.round(claimedQty(l.workOrderLineId) * (l.unitPriceCents ?? 0));
    for (const l of amount) if (claimed[l.workOrderLineId]) cents += amountFor(l);
    return cents;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsByLine, claimed, amounts, form]);

  /** THE OVERDRAW IS SHOWN BEFORE SUBMIT — the server still refuses it. */
  const overdrawn = [
    ...rate.filter((l) => claimedQty(l.workOrderLineId) > (l.remainingQuantity ?? 0)),
    ...amount.filter((l) => claimed[l.workOrderLineId] && (amountFor(l) <= 0 || amountFor(l) > (l.remainingCents ?? 0))),
  ];

  const anyClaim =
    rate.some((l) => claimedQty(l.workOrderLineId) > 0) ||
    amount.some((l) => claimed[l.workOrderLineId]);
  const ready = anyClaim && overdrawn.length === 0 && !!periodStart && !!periodEnd && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      // ONE BODY SHAPE FOR BOTH RENDERINGS. A timesheet contributes many lines
      const lines = [
        ...rate.flatMap((l) =>
          rowsFor(l.workOrderLineId)
            .filter((r) => Number(r.quantity) > 0)
            .map((r) => ({
              workOrderLineId: l.workOrderLineId,
              serviceDate: r.serviceDate || null,
              quantity: Number(r.quantity),
              note: r.note || null,
            }))
        ),
        ...amount
          .filter((l) => claimed[l.workOrderLineId])
          .map((l) => ({ workOrderLineId: l.workOrderLineId, amountCents: amountFor(l) })),
      ];
      const r = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: form.orderId, periodStart, periodEnd, lines, resubmitsId: resubmit?.id ?? null }),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(out.error ?? "That didn't work.");
        return;
      }
      router.push(`/payments/payment-requests/${out.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-5 rounded-[10px] border border-amber-400/60 bg-amber-50 p-3 text-[14px]">
          {error}
        </div>
      )}

      {/* THE PERIOD MUST SIT INSIDE THE ORDER'S — E388 rule 5. The bounds are */}
      <div className="grid gap-4 rounded-brand border border-line bg-white p-5 sm:grid-cols-2">
        <div>
          <label className="block text-[13.5px] font-semibold">Period from *</label>
          <input
            type="date"
            value={periodStart}
            min={form.orderPeriodStart ?? undefined}
            max={form.orderPeriodEnd ?? undefined}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-line bg-white p-2.5 text-[14.5px] outline-none focus:border-magenta"
          />
        </div>
        <div>
          <label className="block text-[13.5px] font-semibold">Period to *</label>
          <input
            type="date"
            value={periodEnd}
            min={form.orderPeriodStart ?? undefined}
            max={form.orderPeriodEnd ?? undefined}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-line bg-white p-2.5 text-[14.5px] outline-none focus:border-magenta"
          />
        </div>
        {(form.orderPeriodStart || form.orderPeriodEnd) && (
          <p className="text-[13px] text-ink-2 sm:col-span-2">
            The work order runs {form.orderPeriodStart ?? "…"} → {form.orderPeriodEnd ?? "…"}, and a
            payment request has to sit inside it.
          </p>
        )}
      </div>

      {/* ══ RATE LINES — THE TIMESHEET GRID ═══════════════════════════════ */}
      {rate.map((l) => (
        <TimesheetLine
          key={l.workOrderLineId}
          line={l}
          currency={form.currency}
          rows={rowsFor(l.workOrderLineId)}
          claimedQuantity={claimedQty(l.workOrderLineId)}
          onChange={(rows) => setRows(l.workOrderLineId, rows)}
          defaultDate={periodStart}
        />
      ))}

      {/* Amount lines — drawn down by amount (O-E005). */}
      {amount.map((l) => (
        <MilestoneLine
          key={l.workOrderLineId}
          line={l}
          currency={form.currency}
          checked={!!claimed[l.workOrderLineId]}
          onChange={(v) => setClaimed((p) => ({ ...p, [l.workOrderLineId]: v }))}
          amount={amounts[l.workOrderLineId] ?? ""}
          onAmount={(v) => setAmounts((p) => ({ ...p, [l.workOrderLineId]: v }))}
        />
      ))}

      <div className="mt-7 rounded-brand border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[16px] font-bold">
              Total {formatCents(total, form.currency)}
            </p>
            {/* THE BUTTON SAYS WHY IT IS OFF — the pattern E392/E393 follow. */}
            <p className="mt-1 text-[14px] text-ink-2">
              {overdrawn.length > 0
                ? `Line ${overdrawn[0].lineNumber} claims more than remains on the order.`
                : !anyClaim
                  ? "Add hours or tick a fixed-amount line to claim."
                  : !periodStart || !periodEnd
                    ? "Set the period this covers."
                    : "The rate on each line is the one agreed on the work order."}
            </p>
          </div>
          <Button disabled={!ready} onClick={submit}>
            {busy ? "Sending…" : "Send payment request"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** A RATE LINE IS A DAY-BY-DAY GRID. One `SettlementLine` per row, each with a */
function TimesheetLine({
  line,
  currency,
  rows,
  claimedQuantity,
  onChange,
  defaultDate,
}: {
  line: SettleLineOption;
  currency: string;
  rows: Row[];
  claimedQuantity: number;
  onChange: (rows: Row[]) => void;
  defaultDate: string;
}) {
  const remaining = line.remainingQuantity ?? 0;
  const left = remaining - claimedQuantity;
  const unit = (line.uom ?? "hour").toLowerCase();

  return (
    <div className="mt-5 rounded-brand border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">
            Line {line.lineNumber} · Timesheet
          </p>
          <p className="mt-1 text-[16px] font-bold">{line.description}</p>
        </div>
        <div className="text-right">
          {/* THE RATE IS TEXT, NOT A DISABLED INPUT. A disabled field still */}
          <p className="text-[15px] font-bold">
            {formatCents(line.unitPriceCents ?? 0, currency)} / {unit}
          </p>
          <p className="text-[12.5px] text-ink-2">the rate agreed on the work order</p>
        </div>
      </div>

      {/* REMAINING COUNTS DOWN AS THEY TYPE, from E393's drawdown. */}
      <p className={`mt-2.5 text-[13.5px] font-semibold ${left < 0 ? "text-amber-700" : "text-ink-2"}`}>
        {left < 0
          ? `${Math.abs(left)} ${unit}${Math.abs(left) === 1 ? "" : "s"} over the ${remaining} remaining on this line`
          : `${left} of ${remaining} ${unit}${remaining === 1 ? "" : "s"} remaining`}
      </p>

      {!line.claimable ? (
        <p className="mt-3 text-[14px] text-ink-2">
          This line is fully drawn — there is nothing left to claim on it.
        </p>
      ) : (
        <>
          <ul className="mt-4 grid gap-2">
            {rows.map((r, i) => (
              <li key={r.key} className="grid gap-2 sm:grid-cols-[160px_120px_1fr_auto]">
                <input
                  type="date"
                  value={r.serviceDate}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...r, serviceDate: e.target.value };
                    onChange(next);
                  }}
                  className="rounded-[10px] border border-line bg-white p-2.5 text-[14px] outline-none focus:border-magenta"
                />
                <input
                  value={r.quantity}
                  inputMode="decimal"
                  placeholder={unit === "hour" ? "8" : "1"}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...r, quantity: e.target.value };
                    onChange(next);
                  }}
                  className="rounded-[10px] border border-line bg-white p-2.5 text-[14px] outline-none focus:border-magenta"
                  aria-label={`${unit}s on ${r.serviceDate || "this day"}`}
                />
                <input
                  value={r.note}
                  placeholder="What you worked on (optional)"
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...r, note: e.target.value };
                    onChange(next);
                  }}
                  className="rounded-[10px] border border-line bg-white p-2.5 text-[14px] outline-none focus:border-magenta"
                />
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((x) => x.key !== r.key))}
                  className="px-2 text-[14px] text-ink-2 underline underline-offset-4 hover:text-magenta"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onChange([...rows, newRow(defaultDate)])}
            className="mt-3 text-[14px] font-bold text-ink-2 underline underline-offset-4 hover:text-magenta"
          >
            Add a Day
          </button>
        </>
      )}
    </div>
  );
}

/** An amount line is one row: tick it and enter the draw-down (blank = what's left). */
function MilestoneLine({
  line,
  currency,
  checked,
  onChange,
  amount,
  onAmount,
}: {
  line: SettleLineOption;
  currency: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  amount: string;
  onAmount: (v: string) => void;
}) {
  return (
    <div className="mt-5 rounded-brand border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">
            Line {line.lineNumber} · Fixed amount
          </p>
          <p className="mt-1 text-[16px] font-bold">{line.description}</p>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-bold">{formatCents(line.amountCents ?? 0, currency)}</p>
          <p className="text-[12.5px] text-ink-2">{formatCents(line.remainingCents ?? 0, currency)} left to draw</p>
        </div>
      </div>

      {line.alreadyDrawn ? (
        <p className="mt-3 text-[14px] text-ink-2">Fully drawn. Nothing is left to claim on this line.</p>
      ) : (
        <label className="mt-3.5 flex items-center gap-2.5 text-[14.5px]">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-magenta)]"
          />
          Claim against this line
          {checked && (
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => onAmount(e.target.value)}
              placeholder={((line.remainingCents ?? 0) / 100).toFixed(2)}
              aria-label="Amount to claim"
              className="ml-2 h-10 w-36 border border-line px-2.5 text-[14px]"
            />
          )}
        </label>
      )}
    </div>
  );
}
