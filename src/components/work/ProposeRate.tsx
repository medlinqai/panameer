"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/casing/Button";

export function ProposeRate({
  workRequestId,
  existing,
}: {
  workRequestId: string;
  existing: {
    unitPriceCents: number | null;
    basis: "RATE" | "AMOUNT";
    coverNote: string | null;
    validUntil: string | null;
    submittedAt: string | null;
  } | null;
}) {
  const router = useRouter();

  const [amount, setAmount] = useState(
    existing?.unitPriceCents != null ? (existing.unitPriceCents / 100).toFixed(2) : ""
  );
  const [basis, setBasis] = useState<"RATE" | "AMOUNT">(existing?.basis ?? "RATE");
  const [coverNote, setCoverNote] = useState(existing?.coverNote ?? "");
  const [validUntil, setValidUntil] = useState(existing?.validUntil?.slice(0, 10) ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { replaced: boolean }>(null);

  const dollars = Number(amount);
  const ready = amount.trim() !== "" && Number.isFinite(dollars) && dollars > 0 && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/work-requests/${workRequestId}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverNote: coverNote.trim() || null,
          validUntil: validUntil || null,
          rate: {
            /* ⚠⚠ ROUNDED, NOT TRUNCATED — see the docblock. */
            unitPriceCents: Math.round(dollars * 100),
            basis,
          },
        }),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(out.error ?? "Could not send that proposal.");
        return;
      }
      setDone({ replaced: Boolean(out.replaced) });
      /* ⚠ The server component re-reads `proposeEligibility`, so the page's own
         summary and this form's prefill cannot disagree after a submit. */
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-brand border-2 border-magenta/40 bg-magenta/[0.04] p-5">
        <p className="text-[16px] font-bold">
          {done.replaced ? "Your proposal is updated." : "Your proposal is sent."}
        </p>
        {/*
          ⚠⚠ IT NAMES WHAT HAPPENS NEXT AND PROMISES NO TIMING. The buyer now
          owes a response and their worklist says so (`work.proposal_received`),
          but nothing in this build tells them WHEN — so this copy must not
          either (ruling 18's family: do not print what has no writer).
        */}
        <p className="mt-1.5 text-[14px] text-ink-2">
          The buyer has it on their list to answer. You can change your rate here
          until they decide.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-brand border border-line bg-white p-5">
      <h2 className="font-display text-[18px] font-bold">
        {existing ? "Your Proposal" : "Propose Your Rate"}
      </h2>

      {existing?.submittedAt && (
        <p className="mt-1 text-[13.5px] text-ink-2">
          Sent {new Date(existing.submittedAt).toLocaleDateString()} — editing
          replaces it.
        </p>
      )}

      {/*
        ⚠ TWO BASES, BECAUSE `LineBasis` HAS EXACTLY TWO and they mean different
        things to a buyer: `RATE` is hours at a price, `AMOUNT` is a fixed fee
        for the whole job. ⚠⚠ Buttons, not a select, so both readings are visible
        without opening anything.
      */}
      <div className="mt-4 flex gap-2">
        {(
            [
              ["RATE", "Hourly Rate"],
              ["AMOUNT", "Fixed Fee"],
            ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setBasis(value)}
            className={`border px-4 py-1.5 text-[13.5px] font-bold transition-colors ${
              basis === value
                ? "border-magenta bg-magenta/[0.06] text-magenta"
                : "border-line text-ink-2 hover:border-ink/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="text-[13.5px] font-bold">
          {basis === "RATE" ? "Your hourly rate" : "Your fixed fee"}
        </span>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[15px] text-ink-2">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-40 rounded-brand border border-line px-3 py-2 text-[15px]"
          />
          {basis === "RATE" && (
            <span className="text-[14px] text-ink-2">per hour</span>
          )}
        </div>
        {/*
          ⚠⚠ THE BUYER'S DATES DECIDE THE HOURS, NOT THE PROVIDER. `writeRate`
          writes `quantity: null` deliberately — *"a provider-supplied quantity
          would be a second source for the number"* — so this form must not ask
          for one, and this line is what stops somebody adding it later.
        */}
        {basis === "RATE" && (
          <span className="mt-1 block text-[12.5px] text-ink-2">
            You state the rate. The hours come from the buyer&apos;s dates.
          </span>
        )}
      </label>

      <label className="mt-4 block">
        <span className="text-[13.5px] font-bold">Your pitch</span>
        <textarea
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Why you're right for this work."
          className="mt-1 w-full rounded-brand border border-line px-3 py-2 text-[15px]"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-[13.5px] font-bold">Good until</span>
        <input
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          className="mt-1 block rounded-brand border border-line px-3 py-2 text-[15px]"
        />
        <span className="mt-1 block text-[12.5px] text-ink-2">
          Optional. Leave it empty if your rate doesn&apos;t expire.
        </span>
      </label>

      {error && (
        <p className="mt-4 rounded-brand border border-magenta/40 bg-magenta/[0.04] px-3 py-2 text-[14px]">
          {error}
        </p>
      )}

      <div className="mt-5">
        <Button disabled={!ready} onClick={submit}>
          {busy
            ? "Sending your proposal…"
            : existing
              ? "Update Your Proposal"
              : "Send Your Proposal"}
        </Button>
      </div>
    </div>
  );
}
