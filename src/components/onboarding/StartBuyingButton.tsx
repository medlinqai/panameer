"use client";

import { useState } from "react";

// Turns the buying side on for a signed-in seller, then continues into the buyer steps.
export function StartBuyingButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      data-start-buying
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await fetch("/api/onboarding/requester/enable", { method: "POST" }).catch(() => null);
        if (r?.ok) window.location.assign("/join/requester/start");
        else setBusy(false);
      }}
      className="bg-ink px-7 py-3 text-[15px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-50"
    >
      {busy ? "Starting…" : "Start Buying"}
    </button>
  );
}
