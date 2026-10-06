"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, Notice } from "@/components/onboarding/controls";

type Kind = "SOLE_SOURCED" | "APP_SOURCED" | "SERVICE_PRODUCT";
type TxType = "PRODUCT_BY_QTY" | "SERVICE_BY_QTY" | "SERVICE_BY_AMT";

export type CommissionRow = {
  sourcing_kind: Kind;
  transaction_type: TxType | null;
  rate_bps: number;
  note: string | null;
};

const KIND_LABEL: Record<Kind, string> = {
  SOLE_SOURCED: "Sole-sourced",
  APP_SOURCED: "App-sourced",
  SERVICE_PRODUCT: "Service product",
};
const KIND_HINT: Record<Kind, string> = {
  SOLE_SOURCED: "The buyer already knew the provider. Panameer sourced nothing.",
  APP_SOURCED: "Panameer matched, proposed, tested or shortlisted.",
  SERVICE_PRODUCT: "The catalog made the sale.",
};
const TX_LABEL: Record<TxType, string> = {
  PRODUCT_BY_QTY: "Product by quantity",
  SERVICE_BY_QTY: "Service by quantity",
  SERVICE_BY_AMT: "Service by amount",
};
const KINDS: Kind[] = ["SOLE_SOURCED", "APP_SOURCED", "SERVICE_PRODUCT"];

export function ApplicationCommissionsEditor({ rows }: { rows: CommissionRow[] }) {
  const router = useRouter();
  const defaults = KINDS.map((k) => ({
    kind: k,
    row: rows.find((r) => r.sourcing_kind === k && r.transaction_type === null) ?? null,
  }));
  const overrides = rows.filter((r) => r.transaction_type !== null);

  const [pct, setPct] = useState<Record<string, string>>(
    Object.fromEntries(defaults.map((d) => [d.kind, String((d.row?.rate_bps ?? 0) / 100)]))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function save(kind: Kind, transaction_type: TxType | null, value: string) {
    const percent = Number(value);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setError("Enter a percentage between 0 and 100.");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/admin/application-commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcing_kind: kind, transaction_type, percent }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => null))?.error ?? "That didn't save.");
        return;
      }
      setSaved(`${KIND_LABEL[kind]} saved. It applies to new transactions only.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-8">
      <section>
        <h2 className="text-[17px] font-bold text-ink">Default Rates</h2>
        <p className="mt-1 text-[14px] text-ink-2">
          One per sourcing kind. These apply to every transaction type unless an
          override below names one.
        </p>
        <div className="mt-4 space-y-4">
          {defaults.map((d) => (
            <div key={d.kind} className="border-t border-line pt-4">
              <div className="flex flex-wrap items-end gap-3">
                <Field label={`${KIND_LABEL[d.kind]} (%)`}>
                  <TextInput
                    value={pct[d.kind] ?? ""}
                    /* ⚠ THE EVENT, NOT THE VALUE — `TextInput` forwards the
                       native handler, which `TaxRateEditor` beside it already
                       does. The compiler caught the mismatch rather than a
                       runtime `undefined`. */
                    onChange={(e) => setPct({ ...pct, [d.kind]: e.target.value })}
                    inputMode="decimal"
                  />
                </Field>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => save(d.kind, null, pct[d.kind] ?? "")}
                  className="min-h-11 border-[1.5px] border-line px-5 text-[14.5px] font-bold text-ink hover:border-magenta hover:text-magenta disabled:opacity-50"
                >
                  Save
                </button>
              </div>
              <p className="mt-1.5 text-[13.5px] text-ink-2">{KIND_HINT[d.kind]}</p>
              {/* ⚠⚠ A KIND WITH NO ROW IS SAYING SOMETHING AND MUST SAY IT. It
                  falls to the built-in floor, which means nobody chose the
                  number being charged. */}
              {!d.row && (
                <p className="mt-1 text-[13.5px] font-semibold text-ink">
                  Not saved yet — the built-in floor is being used.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[17px] font-bold text-ink">Per-Transaction-Type Overrides</h2>
        <p className="mt-1 text-[14px] text-ink-2">
          Most specific wins — an override here beats the kind&apos;s default.
        </p>
        {overrides.length === 0 ? (
          /* ⚠ A REAL ZERO, IN INK, WITH ITS REASON — never a dash and never a
             fabricated row. There are none because none was asked for. */
          <p className="mt-3 text-[14px] text-ink-2">
            None. The three defaults above are doing all the work, which is how
            this shipped.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {overrides.map((o) => (
              <li key={`${o.sourcing_kind}-${o.transaction_type}`} className="py-3 text-[14.5px]">
                <span className="font-semibold">{KIND_LABEL[o.sourcing_kind]}</span>
                {" · "}
                {TX_LABEL[o.transaction_type as TxType]}
                {" → "}
                <span className="font-semibold">{(o.rate_bps / 100).toFixed(2)}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <Notice tone="error">{error}</Notice>}
      {/* ⚠ `Notice` offers `info` and `error` only — there is no success tone,
          and inventing one here would be a second visual language for the same
          idea. */}
      {saved && <Notice tone="info">{saved}</Notice>}

      {/*
        ── ⚠⚠⚠ THE FOOTER THAT SAYS THE OPPOSITE OF THE PAGE BESIDE IT ─────────
        ⚠ `/admin/tax-rates` ends: *"a change here applies to reports that have
        already been sent. That is intended — the rate is a current statement,
        not a historical one."* ⚠⚠ **CORRECT THERE. THE EXACT REVERSE HERE**, and
        stated in full so a reader cannot carry the first page's rule onto this
        one (ruling `97b`).
      */}
      <p className="text-[13.5px] text-ink-2">
        ⚠ A change here applies to <strong className="text-ink">new transactions only</strong>.
        The rate is resolved once when a work order is created and written onto
        the line, so nothing already agreed moves. A fee is a term of the
        contract, and a term that changes after signature is not a term.
      </p>
    </div>
  );
}
