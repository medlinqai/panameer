"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/casing/Button";
import { SignGateModal, type SignGate } from "@/components/work/SignGateModal";
import type { OrderAction } from "@/lib/orders";

const LABEL: Record<OrderAction, string> = {
  ACCEPT: "Accept Terms",
};

const ENDPOINT: Record<OrderAction, string> = {
  ACCEPT: "accept",
};

export function OrderActivation({
  orderId,
  actions,
  message,
}: {
  orderId: string;
  actions: OrderAction[];
  message: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<OrderAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<SignGate | null>(null);

  async function run(action: OrderAction) {
    setBusy(action);
    setError(null);
    try {
      const r = await fetch(`/api/orders/${orderId}/${ENDPOINT[action]}`, { method: "POST" });
      const out = await r.json().catch(() => ({}));
      if (r.status === 409 && out.code === "SIGN_GATE") {
        setGate(out.gate);
        return;
      }
      if (!r.ok) {
        setError(out.error ?? "That didn't work.");
        return;
      }
      // A REFRESH, NOT A LOCAL STATE PATCH. Accepting changes the status, which
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-brand border border-line bg-white p-5">
      <SignGateModal gate={gate} onClose={() => setGate(null)} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="min-w-0 flex-1 text-[14.5px] leading-relaxed text-ink-2">{message}</p>
        {/* THE ONLY PLACE EITHER BUTTON CAN COME FROM. */}
        {actions.map((a) => (
          <Button key={a} disabled={busy !== null} onClick={() => run(a)}>
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
