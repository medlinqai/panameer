"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "make_admin" | "remove" | "hand_over" | "step_down";

// People: Make Admin / Hand Over Admin / Remove on a member row, Step Down on your own admin row (admins only). Remove and hand-over ask first.
export function MemberActions({ membershipId, name, self = false, canStepDown = false }: { membershipId: string; name: string; self?: boolean; canStepDown?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const act = async (action: Action) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/company/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ membershipId, action }) }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    setConfirm(null);
    if (!r?.ok) return setError(b?.error ?? "That didn't save.");
    router.refresh();
  };
  const BTN = "border border-ink bg-surface px-3 py-[7px] text-[12.5px] font-bold text-ink hover:bg-surface-hover disabled:opacity-50";
  const BTN_K = "border border-ink bg-ink px-3 py-[7px] text-[12.5px] font-bold text-surface hover:bg-ink-hover disabled:opacity-50";
  return (
    <span className="flex flex-wrap items-center justify-end gap-2" data-member-actions>
      {self ? (
        canStepDown && <button type="button" disabled={busy} onClick={() => act("step_down")} className={BTN} data-step-down>Step Down</button>
      ) : confirm ? (
        <>
          <span className="text-[12.5px] text-ink-2">{confirm === "remove" ? `Remove ${name}?` : `Make ${name} the admin and step down yourself?`}</span>
          <button type="button" disabled={busy} onClick={() => act(confirm)} className={BTN_K}>
            {confirm === "remove" ? "Remove" : "Hand Over"}
          </button>
          <button type="button" onClick={() => setConfirm(null)} className={BTN}>Cancel</button>
        </>
      ) : (
        <>
          <button type="button" disabled={busy} onClick={() => act("make_admin")} className={BTN}>Make Admin</button>
          <button type="button" disabled={busy} onClick={() => setConfirm("hand_over")} className={BTN} data-hand-over>Hand Over Admin</button>
          <button type="button" disabled={busy} onClick={() => setConfirm("remove")} className={BTN}>Remove</button>
        </>
      )}
      {error && <span role="alert" className="basis-full text-right text-[12.5px] font-semibold text-magenta-dark">{error}</span>}
    </span>
  );
}
