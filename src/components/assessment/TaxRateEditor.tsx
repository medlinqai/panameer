"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, Notice } from "@/components/onboarding/controls";
import { STATES } from "@/lib/assessment/bands";

type Override = { geography: string; rate_bps: number; note: string | null };

/**
 * Editor for the funding rate (WS-C admin half).
 *
 * PERCENTAGES IN THE UI, BASIS POINTS IN THE DATABASE. An admin types 18 or
 * 18.5; the row stores 1800 or 1850. Converting at the boundary rather than
 * storing a float is what keeps a funding figure from arriving as
 * $89,999.9999997 — and the conversion lives in `tax-rate.ts` next to the code
 * that multiplies by it, not inlined here.
 */
export function TaxRateEditor({
  global,
  overrides,
  builtInBps,
}: {
  global: { rate_bps: number; note: string | null } | null;
  overrides: Override[];
  builtInBps: number;
}) {
  const router = useRouter();
  const [globalPct, setGlobalPct] = useState(
    String((global?.rate_bps ?? builtInBps) / 100)
  );
  const [globalNote, setGlobalNote] = useState(global?.note ?? "");
  const [newState, setNewState] = useState("");
  const [newPct, setNewPct] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function save(geography: string | null, pct: string, note?: string) {
    const value = Number(pct);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError("Enter a percentage between 0 and 100.");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch("/api/admin/tax-rates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ geography, percent: value, note: note ?? null }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "Save failed");
      setSaved(geography ?? "global");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(geography: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/admin/tax-rates?geography=${encodeURIComponent(geography)}`,
        { method: "DELETE" }
      );
      if (!r.ok) throw new Error("Delete failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {error && <Notice>{error}</Notice>}

      <section className="rounded-brand border border-line bg-white p-6">
        <h2 className="text-[17px] font-bold text-ink">Global Default</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-2">
          Applies wherever no state override matches. Funding on a report ={" "}
          <span className="font-semibold text-ink">EBITDA × this rate</span>.
        </p>
        {!global && (
          <p className="mt-3 rounded-[10px] border border-dashed border-line px-3 py-2 text-[13.5px] text-ink-2">
            Nothing saved yet — reports are currently using the built-in{" "}
            {builtInBps / 100}% default. Saving here replaces it.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-32">
            <Field label="Rate %">
              <TextInput
                inputMode="decimal"
                value={globalPct}
                onChange={(e) => setGlobalPct(e.target.value)}
              />
            </Field>
          </div>
          <div className="min-w-[240px] flex-1">
            <Field label="Note (optional)">
              <TextInput
                value={globalNote}
                onChange={(e) => setGlobalNote(e.target.value)}
                placeholder="Blended credit + depreciation, pre-CPA"
              />
            </Field>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => save(null, globalPct, globalNote)}
            className="rounded-full bg-magenta px-5 py-3 text-[14.5px] font-bold text-white disabled:opacity-50"
          >
            {saved === "global" ? "Saved ✓" : "Save"}
          </button>
        </div>
      </section>

      <section className="rounded-brand border border-line bg-white p-6">
        <h2 className="text-[17px] font-bold text-ink">Per-Geography Overrides</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-2">
          Most specific wins: a row here beats the global default for assessments filed in
          that state.
        </p>

        {overrides.length > 0 && (
          <ul className="mt-4 divide-y divide-line">
            {overrides.map((o) => (
              <li key={o.geography} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-12 font-bold text-ink">{o.geography}</span>
                <span className="w-24 text-ink-2">{o.rate_bps / 100}%</span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink-2">
                  {o.note ?? ""}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(o.geography)}
                  className="text-[13.5px] font-bold text-ink-2 underline underline-offset-2 hover:text-magenta disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <Field label="State">
              <select
                value={newState}
                onChange={(e) => setNewState(e.target.value)}
                className="rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] outline-none focus:border-magenta"
              >
                <option value="">State…</option>
                {STATES.filter((s) => !overrides.some((o) => o.geography === s)).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="w-32">
            <Field label="Rate %">
              <TextInput
                inputMode="decimal"
                value={newPct}
                onChange={(e) => setNewPct(e.target.value)}
              />
            </Field>
          </div>
          <button
            type="button"
            disabled={busy || !newState || !newPct}
            onClick={async () => {
              await save(newState, newPct);
              setNewState("");
              setNewPct("");
            }}
            className="rounded-full border-[1.5px] border-line px-5 py-3 text-[14.5px] font-bold text-ink hover:border-magenta hover:text-magenta disabled:opacity-50"
          >
            Add override
          </button>
        </div>
      </section>

      <p className="text-[13.5px] text-ink-2">
        ⚠ Reports recompute funding on every render, so a change here applies to reports
        that have already been sent. That is intended — the rate is a current statement,
        not a historical one.
      </p>
    </div>
  );
}
