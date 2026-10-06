"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Invited-person card: Resend (once a day) and Cancel Invite (asks first; the card then disappears).
export function InviteActions({ id, email, sentToday }: { id: string; email: string; sentToday: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState(sentToday);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (action: "resend" | "cancel") => {
    setBusy(action);
    setError(null);
    const r = await fetch(`/api/community/invites/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string; sentToday?: boolean } | undefined;
    setBusy(null);
    setConfirm(false);
    if (!r?.ok) {
      if (b?.sentToday) setSent(true);
      else setError(b?.error ?? "That didn't work.");
      return;
    }
    if (action === "resend") setSent(true);
    router.refresh();
  };
  const BTN = "border px-2.5 py-1 text-[12.5px] font-semibold disabled:opacity-50";
  return (
    <div className="pm-cm-actions mt-2 flex flex-wrap items-center gap-2">
      {confirm ? (
        <>
          <span className="text-[12.5px]">Cancel the invite to {email}?</span>
          <button type="button" data-cancel-confirm disabled={!!busy} onClick={() => act("cancel")} className={`${BTN} border-ink bg-ink text-surface`}>
            {busy === "cancel" ? "Cancelling…" : "Cancel Invite"}
          </button>
          <button type="button" onClick={() => setConfirm(false)} className={`${BTN} border-line`}>Keep It</button>
        </>
      ) : (
        <>
          <button type="button" data-resend disabled={sent || !!busy} onClick={() => act("resend")} className={`${BTN} border-ink`}>
            {sent ? "✓ Sent today" : busy === "resend" ? "Sending…" : "Resend"}
          </button>
          <button type="button" data-cancel-invite disabled={!!busy} onClick={() => setConfirm(true)} className={`${BTN} border-line`}>
            Cancel Invite
          </button>
        </>
      )}
      {error && <span role="alert" className="text-[12px] font-semibold text-magenta-dark">{error}</span>}
    </div>
  );
}
