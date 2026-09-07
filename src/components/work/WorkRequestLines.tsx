"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/casing/Button";
import { formatCents } from "@/lib/display";
import type { SerializedLine, WorkRequestDetail } from "@/lib/work-request-lines";

/**
 * THE LINES TABLE AND ITS ACTIONS (`P1-J4-E392` WS-2).
 *
 * ── ⚠⚠ WHY THIS EXISTS AND THE WIZARD WAS NOT TOUCHED ───────────────────────
 *
 * **The nine-step wizard is a GUIDED FIRST REQUEST and it works.** It produces
 * LINE 1. This produces lines 2..n. Rebuilding `CreateWorkRequest.tsx` into a
 * line editor would have been a 1,000-line rewrite of something that is not
 * broken, and it would have made the common case — one role, one provider —
 * strictly worse. ⚠ ITS `STEPS` ARRAY IS UNCHANGED BY THIS BRIEF.
 *
 * ── ⚠⚠ THE DISABLED BUTTON SAYS WHY ─────────────────────────────────────────
 *
 * **A disabled button with no reason is a defect this codebase already fixed
 * once** — the identity-gaps mirror on `/create-work`. So Complete is greyed out
 * of `completeness`, which arrives from the server, and the sentence beside it
 * NAMES THE LINES and says whether each wants a provider, a price or both. ⚠ The
 * API refuses with the same sentence, from the same function, so the two cannot
 * disagree even about the words.
 */

type ProviderOption = { personId: string; name: string; headline: string };

const EMPTY_DRAFT = {
  basis: "RATE" as "RATE" | "AMOUNT",
  description: "",
  uom: "HOUR",
  quantity: "",
  unitPrice: "",
  amount: "",
  serviceStart: "",
  serviceEnd: "",
};
type Draft = typeof EMPTY_DRAFT;

function toBody(d: Draft) {
  const dollars = (v: string) => {
    const n = Number(v);
    return v.trim() === "" || Number.isNaN(n) ? null : Math.round(n * 100);
  };
  return {
    basis: d.basis,
    description: d.description,
    uom: d.basis === "RATE" ? d.uom : null,
    quantity: d.basis === "RATE" && d.quantity.trim() !== "" ? Number(d.quantity) : null,
    unitPriceCents: d.basis === "RATE" ? dollars(d.unitPrice) : null,
    amountCents: d.basis === "AMOUNT" ? dollars(d.amount) : null,
    serviceStart: d.serviceStart || null,
    serviceEnd: d.serviceEnd || null,
  };
}

function draftFrom(l: SerializedLine): Draft {
  return {
    basis: l.basis,
    description: l.description,
    uom: l.uom ?? "HOUR",
    quantity: l.quantity == null ? "" : String(l.quantity),
    unitPrice: l.unitPriceCents == null ? "" : String(l.unitPriceCents / 100),
    amount: l.amountCents == null ? "" : String(l.amountCents / 100),
    serviceStart: l.serviceStart ?? "",
    serviceEnd: l.serviceEnd ?? "",
  };
}

export function WorkRequestLines({
  initial,
  providers,
}: {
  initial: WorkRequestDetail;
  providers: ProviderOption[];
}) {
  const [detail, setDetail] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);

  /**
   * ⚠ EVERY MUTATION REPLACES THE WHOLE DETAIL FROM THE SERVER'S RESPONSE. The
   * routes return `getWorkRequestDetail`, so `completeness` is recomputed
   * server-side on every write. Patching state locally would mean the button's
   * enabled-ness came from a second, client-side derivation of the rule — which
   * is precisely what "one function, read by both" forbids.
   */
  async function send(url: string, init: RequestInit): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(out.error ?? "That didn't work.");
        return false;
      }
      setDetail(out);
      return true;
    } finally {
      setBusy(false);
    }
  }

  const base = `/api/work-requests/${detail.id}`;
  const c = detail.completeness;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[20px] font-bold tracking-[-0.3px]">
          Lines <span className="font-normal text-ink-2">({detail.lines.length})</span>
        </h2>
        <Button variant="ghost" onClick={() => setAdding((v) => !v)} disabled={busy}>
          {adding ? "Cancel" : "Add a line"}
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-[10px] border border-amber-400/60 bg-amber-50 p-3 text-[14px]">
          {error}
        </div>
      )}

      {adding && (
        <div className="mt-4 rounded-brand border border-line bg-white p-5">
          <LineFields draft={draft} setDraft={setDraft} />
          <div className="mt-4 flex items-center gap-3">
            <Button
              disabled={busy || draft.description.trim().length < 2}
              onClick={async () => {
                const ok = await send(`${base}/lines`, {
                  method: "POST",
                  body: JSON.stringify(toBody(draft)),
                });
                if (ok) {
                  setDraft(EMPTY_DRAFT);
                  setAdding(false);
                }
              }}
            >
              {busy ? "Adding…" : "Add line"}
            </Button>
            <Button variant="quiet" onClick={() => setAdding(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ul className="mt-4 grid gap-3">
        {detail.lines.map((l) => {
          const gap = c.gaps.find((g) => g.lineNumber === l.lineNumber);
          const editing = editingId === l.id;
          return (
            <li key={l.id} className="rounded-brand border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">
                    Line {l.lineNumber} · {l.basis === "RATE" ? "Rate" : "Fixed amount"}
                  </p>
                  <p className="mt-1 text-[16px] font-bold">{l.description}</p>
                </div>
                <div className="text-right">
                  {/*
                    ⚠ THE PRICE SHOWN IS THE ONE ITS BASIS USES. A RATE line
                    prices by `unitPriceCents` and an AMOUNT line by
                    `amountCents`; reading one column for both is how a line of
                    the other kind renders as free.
                  */}
                  <p className="text-[15px] font-bold">
                    {l.basis === "RATE"
                      ? l.unitPriceCents != null
                        ? `${formatCents(l.unitPriceCents, l.currency)} / ${(l.uom ?? "hour").toLowerCase()}`
                        : "No rate yet"
                      : l.amountCents != null
                        ? formatCents(l.amountCents, l.currency)
                        : "No amount yet"}
                  </p>
                  {l.basis === "RATE" && l.quantity != null && (
                    <p className="text-[13px] text-ink-2">
                      {l.quantity} {(l.uom ?? "hour").toLowerCase()}s
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-2 text-[13.5px] text-ink-2">
                {l.providerName ? (
                  <span className="font-semibold text-ink">{l.providerName}</span>
                ) : (
                  "No provider assigned"
                )}
                {(l.serviceStart || l.serviceEnd) && (
                  <> · {l.serviceStart ?? "…"} → {l.serviceEnd ?? "…"}</>
                )}
                {l.invitedCount > 0 && (
                  <>
                    {" "}
                    · {l.invitedCount} invited to bid
                  </>
                )}
              </p>

              {gap && (
                <p className="mt-2 text-[13.5px] font-semibold text-amber-700">
                  Needs {gap.missing.join(" and ")}
                </p>
              )}

              <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-line pt-3.5">
                {/*
                  ⚠ ASSIGN IS A SELECT, NOT A FREE-TEXT ID. The options are the
                  providers this request's skills actually matched; the API
                  re-checks `is_service_provider` regardless, because the picker
                  is a convenience and the route is the boundary.
                */}
                <select
                  value={l.providerPersonId ?? ""}
                  disabled={busy}
                  onChange={(e) =>
                    send(`${base}/lines/${l.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ providerPersonId: e.target.value || null }),
                    })
                  }
                  className="rounded-[10px] border border-line bg-white px-3 py-2 text-[14px] outline-none focus:border-magenta"
                >
                  <option value="">Assign a provider…</option>
                  {providers.map((p) => (
                    <option key={p.personId} value={p.personId}>
                      {p.name}
                    </option>
                  ))}
                  {/* ⚠ A provider assigned earlier who no longer matches the
                      skills must still render as the current value, or the select
                      would silently show "Assign a provider…" for an assigned
                      line and the next change would look like an edit. */}
                  {l.providerPersonId &&
                    !providers.some((p) => p.personId === l.providerPersonId) && (
                      <option value={l.providerPersonId}>
                        {l.providerName ?? "Assigned provider"}
                      </option>
                    )}
                </select>

                <Button
                  variant="quiet"
                  disabled={busy}
                  onClick={() => {
                    setEditingId(editing ? null : l.id);
                    setEditDraft(draftFrom(l));
                  }}
                >
                  {editing ? "Cancel" : "Edit"}
                </Button>

                <Link
                  href={`/work-requests/${detail.id}/invite?line=${l.id}`}
                  className="text-[14.5px] font-bold text-ink-2 underline underline-offset-4 hover:text-magenta"
                >
                  Invite providers to bid
                </Link>

                {detail.lines.length > 1 && l.invitedCount === 0 && (
                  <Button
                    variant="quiet"
                    disabled={busy}
                    onClick={() =>
                      send(`${base}/lines/${l.id}`, { method: "DELETE" })
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>

              {editing && (
                <div className="mt-4 border-t border-line pt-4">
                  <LineFields draft={editDraft} setDraft={setEditDraft} />
                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      disabled={busy || editDraft.description.trim().length < 2}
                      onClick={async () => {
                        const ok = await send(`${base}/lines/${l.id}`, {
                          method: "PATCH",
                          body: JSON.stringify(toBody(editDraft)),
                        });
                        if (ok) setEditingId(null);
                      }}
                    >
                      {busy ? "Saving…" : "Save line"}
                    </Button>
                    <Button variant="quiet" onClick={() => setEditingId(null)} disabled={busy}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* ══ THE COMPLETE GATE ══════════════════════════════════════════════ */}
      <div className="mt-7 rounded-brand border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[16px] font-bold">
              {c.complete ? "Ready to complete" : "Not ready yet"}
            </p>
            {/*
              ⚠⚠ THE REASON, ALWAYS. This sentence is built from the SAME
              `completeness` the button reads and the API refuses with — never
              from a second check written here.
            */}
            <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
              {c.reason === "COMPLETE"
                ? "Every line has a provider and a price."
                : c.reason === "NO_LINES"
                  ? "Add at least one line before completing this request."
                  : c.gaps
                      .map((g) => `Line ${g.lineNumber} needs ${g.missing.join(" and ")}`)
                      .join("; ")}
            </p>
          </div>
          <Button
            disabled={!c.complete || busy}
            onClick={() => send(`${base}/complete`, { method: "POST" })}
          >
            {busy ? "Working…" : "Complete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The line form — shared by add and edit so the two cannot ask different questions. */
function LineFields({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
}) {
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const input =
    "mt-1 w-full rounded-[10px] border border-line bg-white p-2.5 text-[14.5px] outline-none focus:border-magenta";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="block text-[13.5px] font-semibold">What is this line for? *</label>
        <input
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Oracle Fusion GL implementation lead"
          className={input}
        />
      </div>

      <div>
        <label className="block text-[13.5px] font-semibold">How is it priced?</label>
        <select
          value={draft.basis}
          onChange={(e) => set({ basis: e.target.value as "RATE" | "AMOUNT" })}
          className={input}
        >
          <option value="RATE">A rate — per hour or per day</option>
          <option value="AMOUNT">A fixed amount</option>
        </select>
      </div>

      {draft.basis === "RATE" ? (
        <>
          <div>
            <label className="block text-[13.5px] font-semibold">Unit</label>
            <select value={draft.uom} onChange={(e) => set({ uom: e.target.value })} className={input}>
              <option value="HOUR">Hour</option>
              <option value="DAY">Day</option>
              <option value="WEEK">Week</option>
            </select>
          </div>
          <div>
            <label className="block text-[13.5px] font-semibold">
              How many? <span className="font-normal text-ink-2">(optional for now)</span>
            </label>
            <input
              value={draft.quantity}
              onChange={(e) => set({ quantity: e.target.value })}
              inputMode="decimal"
              placeholder="160"
              className={input}
            />
          </div>
          <div>
            <label className="block text-[13.5px] font-semibold">
              Rate <span className="font-normal text-ink-2">(optional for now)</span>
            </label>
            <input
              value={draft.unitPrice}
              onChange={(e) => set({ unitPrice: e.target.value })}
              inputMode="decimal"
              placeholder="150.00"
              className={input}
            />
          </div>
        </>
      ) : (
        <div>
          <label className="block text-[13.5px] font-semibold">
            Amount <span className="font-normal text-ink-2">(optional for now)</span>
          </label>
          <input
            value={draft.amount}
            onChange={(e) => set({ amount: e.target.value })}
            inputMode="decimal"
            placeholder="24000.00"
            className={input}
          />
        </div>
      )}

      <div>
        <label className="block text-[13.5px] font-semibold">Starts</label>
        <input
          type="date"
          value={draft.serviceStart}
          onChange={(e) => set({ serviceStart: e.target.value })}
          className={input}
        />
      </div>
      <div>
        <label className="block text-[13.5px] font-semibold">Ends</label>
        <input
          type="date"
          value={draft.serviceEnd}
          onChange={(e) => set({ serviceEnd: e.target.value })}
          className={input}
        />
      </div>
      {/*
        ⚠ A PRICE IS OPTIONAL WHILE YOU ARE WRITING THE LINE, and the COMPLETE
        gate is what insists on it later. Forcing it here would stop a requester
        writing down what they need before they know what it costs — which is the
        normal order, and the reason they are about to invite people to bid.
      */}
    </div>
  );
}
