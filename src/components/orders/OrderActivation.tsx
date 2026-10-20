"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/casing/Button";
import { SignGateModal, type SignGate } from "@/components/work/SignGateModal";
import type { OrderAction } from "@/lib/orders";

const LABEL: Record<OrderAction, string> = {
  ACCEPT: "Accept Work Order",
  REQUEST_CHANGES: "Request Changes",
  DECLINE: "Decline",
};

const ENDPOINT: Record<OrderAction, string> = {
  ACCEPT: "accept",
  REQUEST_CHANGES: "request-changes",
  DECLINE: "decline",
};

export function OrderActivation({
  orderId,
  actions,
  message,
  payNote = false,
}: {
  orderId: string;
  actions: OrderAction[];
  message: string;
  /** RD-E003: the provider's company hasn't finished tax & banking — signing is open, payment waits. */
  payNote?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<OrderAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<SignGate | null>(null);

  async function run(action: OrderAction) {
    // WA-E004: a decline carries the provider's reason.
    const reason = action === "DECLINE" ? window.prompt("Why are you declining? The buyer sees this.") : null;
    if (action === "DECLINE" && reason === null) return;
    setBusy(action);
    setError(null);
    try {
      const r = await fetch(`/api/orders/${orderId}/${ENDPOINT[action]}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reason ? { reason } : {}) });
      const out = await r.json().catch(() => ({}));
      if (r.status === 409 && out.code === "SIGN_GATE") {
        setGate(out.gate);
        return;
      }
      if (!r.ok) {
        setError(out.error ?? "That didn't work.");
        return;
      }
      // WA-E003: Request Changes reopens the Work Request page.
      if (action === "REQUEST_CHANGES" && out.jobId) { router.push(`/hire/terms?job=${out.jobId}&provider=${out.providerPersonId}`); return; }
      // A REFRESH, NOT A LOCAL STATE PATCH. Accepting changes the status, which
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-brand border border-line bg-white p-5">
      <SignGateModal gate={gate} onClose={() => setGate(null)} />
      {payNote && (
        <p data-tax-banking-note className="mb-3 border-l-2 border-magenta py-1 pl-3 text-[14px]">
          Add tax and banking now so you&apos;re paid on time. <a href="/company/legal" className="font-bold text-magenta-dark underline underline-offset-4">Add Tax &amp; Banking</a>
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="min-w-0 flex-1 text-[14.5px] leading-relaxed text-ink-2">
          {message}
          {/* MS-E002: what Accept means. */}
          {actions.includes("ACCEPT") && <span data-sow-accept className="mt-1 block text-[13px] font-semibold text-ink">I accept this Statement of Work under the Panameer Master Services Agreement.</span>}
        </p>
        {/* THE ONLY PLACE EITHER BUTTON CAN COME FROM. */}
        {actions.map((a) => (
          <Button key={a} variant={a === "ACCEPT" ? undefined : "ghost"} disabled={busy !== null} onClick={() => run(a)}>
            {busy === a ? "Working…" : LABEL[a]}
          </Button>
        ))}
      </div>
      {error && (
        <div className="mt-3 rounded-[10px] border border-amber-400/60 bg-amber-50 p-3 text-[14px]">
          {error}
        </div>
      )}
    </div>
  );
}
