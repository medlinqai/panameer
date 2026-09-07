"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/casing/Button";
import type { OrderAction } from "@/lib/orders";

/**
 * THE ACTIVATION ROW (`P1-J4-E393` WS-2).
 *
 * ── ⚠⚠ WHY THIS COMPONENT CANNOT RENDER THE WRONG PARTY'S BUTTON ────────────
 *
 * **It does not know who is looking, and it has no way to find out.** Its only
 * input is `actions: OrderAction[]`, computed SERVER-SIDE by
 * `availableActions(order, party)` — the one function the API also refuses with.
 * There is no `party` prop, no `isBuyer` flag and no session read in this file,
 * so there is no expression here that could evaluate to "show Accept to a buyer".
 *
 * ⚠⚠ AND THE TWO LABELS EXIST ONLY INSIDE A MAP OVER THAT ARRAY. The strings
 * "Accept" and "Release" appear exactly once each, in `LABEL`, keyed by the
 * action — so an action that is not in the array has no rendering path at all.
 * `check:orders` asserts this structurally: no `Accept`/`Release` button may
 * appear anywhere in the orders surfaces outside this map.
 *
 * ⚠ A GREYED-OUT BUTTON WOULD HAVE BEEN THE WRONG ANSWER. It still tells a buyer
 * that Accept is theirs to press one day, and it is not — accepting is the
 * provider agreeing to terms, and a buyer who could accept on their behalf would
 * be signing the provider's side of a SOW. Absent, not disabled.
 */

const LABEL: Record<OrderAction, string> = {
  ACCEPT: "Accept these terms",
  RELEASE: "Release the order",
};

const ENDPOINT: Record<OrderAction, string> = {
  ACCEPT: "accept",
  RELEASE: "release",
};

export function OrderActivation({
  orderId,
  actions,
  message,
}: {
  orderId: string;
  /** ⚠ SERVER-COMPUTED. This component never derives it. */
  actions: OrderAction[];
  message: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<OrderAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: OrderAction) {
    setBusy(action);
    setError(null);
    try {
      const r = await fetch(`/api/orders/${orderId}/${ENDPOINT[action]}`, { method: "POST" });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(out.error ?? "That didn't work.");
        return;
      }
      /*
        ⚠ A REFRESH, NOT A LOCAL STATE PATCH. Accepting changes the status, which
        changes which actions exist — and that recomputation belongs on the
        server, where the one function lives. Patching it here would be a second
        derivation of exactly the rule this brief is about.
      */
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-brand border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="min-w-0 flex-1 text-[14.5px] leading-relaxed text-ink-2">{message}</p>
        {/* ⚠⚠ THE ONLY PLACE EITHER BUTTON CAN COME FROM. */}
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
