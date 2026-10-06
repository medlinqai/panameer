"use client";

import { useState } from "react";

// Nudge on "Waiting to Verify": resends the verification email (server refuses test accounts).
export function ResendVerification({ userId }: { userId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | string>("idle");
  const go = async () => {
    setState("busy");
    const r = await fetch("/api/admin/users/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string; alreadyVerified?: boolean } | undefined;
    setState(r?.ok ? (b?.alreadyVerified ? "Already verified" : "sent") : (b?.error ?? "Could not resend."));
  };
  if (state === "sent") return <span className="text-[12.5px] font-semibold text-ink">Sent ✓</span>;
  if (state !== "idle" && state !== "busy") return <span className="text-[12.5px] text-ink-2">{state}</span>;
  return (
    <button type="button" data-nudge onClick={go} disabled={state === "busy"} className="border border-ink bg-surface px-2.5 py-1 text-[12px] font-bold text-ink disabled:opacity-50">
      {state === "busy" ? "Sending…" : "Resend Verification"}
    </button>
  );
}
