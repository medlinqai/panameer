"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/casing/Button";
import type { SettlementAction } from "@/lib/settlements";

const LABEL: Record<SettlementAction, string> = {
  APPROVE: "Approve",
  REJECT: "Reject",
};

export function SettlementDecision({
  settlementId,
  actions,
  hasTimesheet,
}: {
  settlementId: string;
  actions: SettlementAction[];
  /** Only changes the wording of what approval means. */
  hasTimesheet: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<SettlementAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  if (actions.length === 0) return null;

  async function run(action: SettlementAction, body?: unknown) {
    setBusy(action);
    setError(null);
    try {
      const r = await fetch(
        `/api/settlements/${settlementId}/${action === "APPROVE" ? "approve" : "reject"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        }
      );
      const out = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(out.error ?? "That didn't work.");
        return;
      }
      /* ⚠ A REFRESH, NOT A LOCAL PATCH. Deciding changes the status, which changes
         which actions exist — and that recomputation belongs on the server. */
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-brand border border-line bg-white p-5">
      {/*
        ⚠⚠ WHAT APPROVAL MEANS, SAID BEFORE THE CLICK. The wording differs
        because the two are genuinely different acts: signing off hours worked,
        versus accepting a deliverable as done.
      */}
      <p className="text-[15px] font-bold">
        {hasTimesheet
          ? "Approving signs off these hours as worked"
          : "Approving accepts this work as delivered"}
      </p>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
        {hasTimesheet
          ? "It confirms the time was spent as recorded and clears the amount for payment. There is no separate sign-off step."
          : "There is no separate acceptance step for a deliverable — approving this payment request IS accepting the work."}
      </p>

      {error && (
        <div className="mt-3 rounded-[10px] border border-amber-400/60 bg-amber-50 p-3 text-[14px]">
          {error}
        </div>
      )}

      {rejecting ? (
        <div className="mt-4">
          <label className="block text-[13.5px] font-semibold">
            Why are you rejecting this? *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="The 14th is a public holiday and wasn't worked."
            className="mt-1 w-full rounded-[10px] border border-line bg-white p-2.5 text-[14.5px] outline-none focus:border-magenta"
          />
          <p className="mt-1 text-[13px] text-ink-2">
            {/* ⚠ THE REASON THE FIELD EXISTS, not just that it is required. */}
            Required — without a reason there is nothing for the provider to act on.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              disabled={reason.trim().length < 3 || busy !== null}
              onClick={() => run("REJECT", { reason })}
            >
              {busy === "REJECT" ? "Sending…" : "Send rejection"}
            </Button>
            <Button
              variant="quiet"
              disabled={busy !== null}
              onClick={() => {
                setRejecting(false);
                setReason("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* ⚠⚠ THE ONLY PLACE EITHER BUTTON CAN COME FROM. */}
          {actions.map((a) =>
            a === "APPROVE" ? (
              <Button key={a} disabled={busy !== null} onClick={() => run("APPROVE")}>
                {busy === "APPROVE" ? "Working…" : LABEL[a]}
              </Button>
            ) : (
              /* ⚠ REJECT OPENS THE REASON BOX — it never posts directly, so there
                 is no path from this button to a reasonless rejection. */
              <Button key={a} variant="ghost" disabled={busy !== null} onClick={() => setRejecting(true)}>
                {LABEL[a]}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
