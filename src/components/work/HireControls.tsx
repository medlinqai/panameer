"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/casing/Button";

/**
 * ── ⚠⚠⚠ THE TWO TRANSITIONS (`P2-A8-E684` WS-F) ─────────────────────────
 *
 * ⚠⚠ **RULING 17 SPLITS THEM AND THIS FILE KEEPS THEM SPLIT.**
 *   · **SELECT** — `POSTED → ASSIGNED`. The provider, **their proposed rate**,
 *     the line status, the bid `AWARDED`, the losers `NOT_SELECTED`.
 *     ⚠ Reversible: `reverseSelection` exists for exactly this state.
 *   · **ORDER** — `ASSIGNED → ORDERED`. A `WorkOrder` `ISSUED` with its lines,
 *     and `not_to_exceed_cents` set. ⚠⚠⚠ **THIS IS THE IRREVERSIBLE ONE**, and
 *     that is why it is a second button and not the tail of the first.
 *
 * ⚠⚠⚠ **A BUYER WHO SELECTS IS NOT THEREBY CONTRACTED.** Collapsing the two
 * would make choosing somebody and committing to them the same click, which is
 * the one place in this chain where an accidental press costs money.
 *
 * ⚠⚠ **NO MONEY MOVES HERE.** No `Payment` row, no `PAID`, no cut computed —
 * `check:work-chain` §6 holds all four and was run before this was written and
 * again at its gate. ⚠ Acceptance (`provider_accepted_at`, `buyer_accepted_at`,
 * `RELEASED`) is **out of scope by ruling 43** and nothing here writes it.
 */
function useHirePost(workRequestId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function post(path: string, body: Record<string, unknown>, label: string) {
    setBusy(label);
    setError(null);
    try {
      const r = await fetch(`/api/work-requests/${workRequestId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) {
        /* ⚠⚠ THE WRITER'S OWN SENTENCE REACHES THE BUYER — "that proposal
           doesn't state a rate, so the hours can't be priced" is what they need
           to read, and a generic failure would hide the one actionable fact. */
        setError(out.error ?? "That didn't work.");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(null);
    }
  }
  return { post, busy, error, setError };
}

/** ⚠ TRANSITION ONE, offered per proposal — the buyer picks a person, not a row. */
export function SelectProposal({
  workRequestId,
  providerPersonId,
  providerName,
  hasRate,
  selected,
}: {
  workRequestId: string;
  providerPersonId: string;
  providerName: string;
  /** ⚠⚠ `selectProvider` REFUSES a proposal with no rate; the button says so
      rather than posting into a refusal (`E579` — do not render a control whose
      handler is known to refuse). */
  hasRate: boolean;
  selected: boolean;
}) {
  const { post, busy, error } = useHirePost(workRequestId);
  if (selected) {
    return (
      <p className="mt-3 border-t border-line pt-3 text-[13.5px] font-bold text-emerald-700">
        Selected for this work.
      </p>
    );
  }
  return (
    <div className="mt-3 border-t border-line pt-3">
      {hasRate ? (
        <Button
          disabled={busy !== null}
          onClick={() => post("select", { providerPersonId }, "select")}
        >
          {busy ? "Selecting…" : "Select This Provider"}
        </Button>
      ) : (
        <p className="text-[13.5px] text-ink-2">
          {providerName} hasn&apos;t stated a rate, so this proposal can&apos;t be
          priced or selected yet.
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-brand border border-magenta/40 bg-magenta/[0.04] px-3 py-2 text-[13.5px]">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * ⚠⚠⚠ THE DIRECT ROUTE, AND THE REASON THE LINE PATCH LOST `providerPersonId`
 * IN THE SAME COMMIT. `Assign a provider…` wrote a NAME with no rate, no line
 * status and no bid. This writes the pair the model actually needs, through
 * `assignProviderDirectly` — the `route: "DIRECT"` the schema already named.
 * ⚠ **A RATE IS REQUIRED**, because a line with a provider and no price cannot
 * be ordered — `work-request-lines.ts` counts both as `missing`.
 */
export function AssignDirectly({
  workRequestId,
  providers,
}: {
  workRequestId: string;
  providers: { personId: string; name: string }[];
}) {
  const { post, busy, error } = useHirePost(workRequestId);
  const [personId, setPersonId] = useState("");
  const [amount, setAmount] = useState("");
  const dollars = Number(amount);
  const ready = !!personId && Number.isFinite(dollars) && dollars > 0 && busy === null;

  return (
    <div className="mt-4 rounded-brand border border-line bg-white p-5">
      {/*
        ── ⚠⚠⚠ THE WORD, RENAMED (`P2-A8-E712` WS-D) ──────────────────────────

        ⚠⚠ **SCOTT, 2026-09-27:** *"change the name… from 'direct' (borrowed from Upwork)
        to 'externally sourced'."* ⚠ Here it was the ADVERB form of the same borrowed
        concept — *"directly"* meaning *"without Panameer's sourcing"* — so it is the same
        rename, not a different word that happens to look like it.
        ⚠⚠⚠ **THE THING THAT IS EXTERNALLY SOURCED IS THE PROVIDER**, which is Scott's own
        framing: *"externally sourced transactions (when the provider is sourced
        off-platform)."*
        ⚠ **A HEADING, SO SENTENCE CASE** — rule 11 governs a button LABEL, not this.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   <h3 className="text-[15px] font-bold">Assign someone directly</h3>
      */}
      {/*
        ⚠⚠ **SCOTT'S PHRASE, NOT A PLAINER ONE OF MINE.** I first wrote *"a provider you
        sourced yourself"*, which reads more easily — ⚠⚠⚠ **but WS-D says *"externally
        sourced" everywhere a member can read it*, AND THE PHRASE IS IN THE TERMS OF
        SERVICE.** One word for one thing (`E585`) matters more than my better sentence
        when the word is contractual.
      */}
      <h3 className="text-[15px] font-bold">Assign an externally sourced provider</h3>
      <p className="mt-1 text-[13.5px] text-ink-2">
        No proposal needed — but their rate is, because the order is priced from it.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          disabled={busy !== null}
          aria-label="Provider to assign"
          className="rounded-[10px] border border-line bg-white px-3 py-2 text-[14px] outline-none focus:border-magenta"
        >
          <option value="">Choose a provider…</option>
          {providers.map((p) => (
            <option key={p.personId} value={p.personId}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="text-[15px] text-ink-2">$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          aria-label="Rate per hour"
          disabled={busy !== null}
          className="w-32 rounded-[10px] border border-line px-3 py-2 text-[14px] outline-none focus:border-magenta"
        />
        <span className="text-[14px] text-ink-2">per hour</span>
        <Button
          variant="quiet"
          disabled={!ready}
          onClick={() =>
            post(
              "assign",
              /* ⚠⚠ ROUNDED, NOT TRUNCATED — `19.99 * 100` is
                 `1998.9999999999998` in IEEE 754, and `Math.trunc` would set a
                 rate a cent light. The same rule the proposal form records. */
              { providerPersonId: personId, unitPriceCents: Math.round(dollars * 100), uom: "HOUR" },
              "assign"
            )
          }
        >
          {busy === "assign" ? "Assigning…" : "Assign and Set the Rate"}
        </Button>
      </div>
      {error && (
        <p className="mt-2 rounded-brand border border-magenta/40 bg-magenta/[0.04] px-3 py-2 text-[13.5px]">
          {error}
        </p>
      )}
    </div>
  );
}

/** ⚠⚠⚠ TRANSITION TWO. The irreversible one, and it says so before it is pressed. */
export function CreateOrder({ workRequestId }: { workRequestId: string }) {
  const { post, busy, error } = useHirePost(workRequestId);
  return (
    <div className="mt-4 rounded-brand border-2 border-magenta/40 bg-magenta/[0.04] p-5">
      <p className="text-[15px] font-bold">A provider is selected.</p>
      {/*
        ⚠⚠ IT NAMES WHAT CHANGES AND WHAT STOPS BEING POSSIBLE. Ruling 17's
        split only helps a buyer who is TOLD that the second step is the one
        that closes the door — otherwise the two buttons look like one action
        split for no reason.
      */}
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
        Creating the work order sends it to them to accept, and the selection
        can&apos;t be changed after that.
      </p>
      <div className="mt-3">
        <Button disabled={busy !== null} onClick={() => post("order", {}, "order")}>
          {busy ? "Creating the work order…" : "Create the Work Order"}
        </Button>
      </div>
      {error && (
        <p className="mt-2 rounded-brand border border-magenta/40 bg-white px-3 py-2 text-[13.5px]">
          {error}
        </p>
      )}
    </div>
  );
}
