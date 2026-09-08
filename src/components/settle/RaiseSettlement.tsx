"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/casing/Button";
import { formatCents } from "@/lib/display";
import type { SettleForm, SettleLineOption } from "@/lib/settlements";

/**
 * RAISE A PAYMENT REQUEST — ⚠⚠ ONE COMPONENT, TWO RENDERINGS
 * (`P1-J4-E394` WS-1 + WS-2).
 *
 * ── ⚠⚠ THE BRANCH IS ON THE ORDER LINE'S `basis` AND NOWHERE ELSE ───────────
 *
 *     RATE   → a day-by-day TIMESHEET GRID (a service date + hours per row)
 *     AMOUNT → ONE ROW: the milestone and its figure, claimed in full
 *
 * **Both post the same body to the same endpoint** (`POST /api/settlements`).
 * There is no `type` in that body, no second route, and no `settlement_type`
 * column — the difference is HOW MANY `SettlementLine` ROWS come out, and nothing
 * else. `check:settle` asserts all three.
 *
 * ── ⚠⚠ THE RULES ARE E388's. THIS MAKES THEM LEGIBLE, IT DOES NOT RE-DECIDE ──
 *
 * Every constraint below is enforced server-side by `assertSettlementDraw`. What
 * this adds is that a provider learns them BEFORE they submit rather than at a
 * refusal:
 *
 *   · ⚠⚠ THE RATE IS READ-ONLY AND SAYS WHY. *"A provider who thinks they can
 *     adjust it will try, and a silently-ignored input is worse than a disabled
 *     one."* So it is rendered as TEXT, not a disabled input — a disabled input
 *     still looks like a field that could be enabled.
 *   · remaining counts down AS THEY TYPE, from the server's number.
 *   · an AMOUNT line is a checkbox, because in-full-or-not-at-all has two states.
 *   · a line with nothing left is shown and NOT claimable — hiding it would make
 *     a provider wonder where their line went.
 */

type Row = { key: string; serviceDate: string; quantity: string; note: string };

let seq = 0;
const newRow = (date: string): Row => ({
  key: `r${seq++}`,
  serviceDate: date,
  quantity: "",
  note: "",
});

export function RaiseSettlement({ form }: { form: SettleForm }) {
  const router = useRouter();
  const [periodStart, setPeriodStart] = useState(form.orderPeriodStart ?? "");
  const [periodEnd, setPeriodEnd] = useState(form.orderPeriodEnd ?? "");
  const [rowsByLine, setRowsByLine] = useState<Record<string, Row[]>>({});
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rate = form.lines.filter((l) => l.basis === "RATE");
  const amount = form.lines.filter((l) => l.basis === "AMOUNT");

  const rowsFor = (id: string) => rowsByLine[id] ?? [];
  const setRows = (id: string, rows: Row[]) =>
    setRowsByLine((prev) => ({ ...prev, [id]: rows }));

  /** ⚠ CLAIMED SO FAR, PER LINE — what "remaining" counts down from. */
  const claimedQty = (id: string) =>
    rowsFor(id).reduce((n, r) => n + (Number(r.quantity) || 0), 0);

  const total = useMemo(() => {
    let cents = 0;
    for (const l of rate) cents += Math.round(claimedQty(l.workOrderLineId) * (l.unitPriceCents ?? 0));
    for (const l of amount) if (claimed[l.workOrderLineId]) cents += l.amountCents ?? 0;
    return cents;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsByLine, claimed, form]);

  /** ⚠ THE OVERDRAW IS SHOWN BEFORE SUBMIT — the server still refuses it. */
  const overdrawn = rate.filter(
    (l) => claimedQty(l.workOrderLineId) > (l.remainingQuantity ?? 0)
  );

  const anyClaim =
    rate.some((l) => claimedQty(l.workOrderLineId) > 0) ||
    amount.some((l) => claimed[l.workOrderLineId]);
  const ready = anyClaim && overdrawn.length === 0 && !!periodStart && !!periodEnd && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      /* ⚠ ONE BODY SHAPE FOR BOTH RENDERINGS. A timesheet contributes many lines
         naming one order line; a milestone contributes one with no quantity. */
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
          .map((l) => ({ workOrderLineId: l.workOrderLineId })),
      ];
      const r = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: form.orderId, periodStart, periodEnd, lines }),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(out.error ?? "That didn't work.");
        return;
      }
      router.push(`/finances/payment-requests/${out.id}`);
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

      {/* ⚠ THE PERIOD MUST SIT INSIDE THE ORDER'S — E388 rule 5. The bounds are
          set as `min`/`max` so the picker cannot offer an illegal day. */}
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

      {/* ══ AMOUNT LINES — ONE ROW, IN FULL ═══════════════════════════════ */}
      {amount.map((l) => (
        <MilestoneLine
          key={l.workOrderLineId}
          line={l}
          currency={form.currency}
          checked={!!claimed[l.workOrderLineId]}
          onChange={(v) => setClaimed((p) => ({ ...p, [l.workOrderLineId]: v }))}
        />
      ))}

      <div className="mt-7 rounded-brand border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[16px] font-bold">
              Total {formatCents(total, form.currency)}
            </p>
            {/* ⚠ THE BUTTON SAYS WHY IT IS OFF — the pattern E392/E393 follow. */}
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

/**
 * ⚠ A RATE LINE IS A DAY-BY-DAY GRID. One `SettlementLine` per row, each with a
 * `service_date` — which is what makes it a timesheet rather than a number.
 */
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
          {/*
            ⚠⚠ THE RATE IS TEXT, NOT A DISABLED INPUT. A disabled field still
            reads as "a box that could be enabled", and the brief is explicit that
            a provider who thinks they can adjust it will try. The sentence under
            it is the whole reason it is not editable.
          */}
          <p className="text-[15px] font-bold">
            {formatCents(line.unitPriceCents ?? 0, currency)} / {unit}
          </p>
          <p className="text-[12.5px] text-ink-2">the rate agreed on the work order</p>
        </div>
      </div>

      {/* ⚠ REMAINING COUNTS DOWN AS THEY TYPE, from E393's drawdown. */}
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
            Add a day
          </button>
        </>
      )}
    </div>
  );
}

/**
 * ⚠⚠ AN AMOUNT LINE IS ONE ROW AND A CHECKBOX, because in-full-or-not-at-all has
 * exactly two states. **There is no quantity field and no amount field** — a
 * number input here would invite a partial claim, which `E388` refuses and which
 * cannot exist.
 */
function MilestoneLine({
  line,
  currency,
  checked,
  onChange,
}: {
  line: SettleLineOption;
  currency: string;
  checked: boolean;
  onChange: (v: boolean) => void;
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
          <p className="text-[12.5px] text-ink-2">the amount agreed on the work order</p>
        </div>
      </div>

      {line.alreadyDrawn ? (
        <p className="mt-3 text-[14px] text-ink-2">
          Already claimed in full — a fixed-amount line is drawn once and cannot be
          claimed again.
        </p>
      ) : (
        <label className="mt-3.5 flex items-center gap-2.5 text-[14.5px]">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-magenta)]"
          />
          Claim this line in full
        </label>
      )}
    </div>
  );
}
