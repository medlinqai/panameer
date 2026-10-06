"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// People: Make Admin / Remove for a member row (admins only). Remove asks first.
export function MemberActions({ membershipId, name }: { membershipId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (action: "make_admin" | "remove") => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/company/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ membershipId, action }) }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    setConfirm(false);
    if (!r?.ok) return setError(b?.error ?? "That didn't save.");
    router.refresh();
  };
  const BTN = "border border-ink bg-surface px-3 py-[7px] text-[12.5px] font-bold text-ink hover:bg-surface-hover disabled:opacity-50";
  return (
    <span className="flex flex-wrap items-center justify-end gap-2" data-member-actions>
      {confirm ? (
        <>
          <span className="text-[12.5px] text-ink-2">Remove {name}?</span>
          <button type="button" disabled={busy} onClick={() => act("remove")} className={BTN.replace("bg-surface", "bg-ink").replace("text-ink ", "text-surface ")}>
            Remove
          </button>
          <button type="button" onClick={() => setConfirm(false)} className={BTN}>Cancel</button>
        </>
      ) : (
        <>
          <button type="button" disabled={busy} onClick={() => act("make_admin")} className={BTN}>Make Admin</button>
          <button type="button" disabled={busy} onClick={() => setConfirm(true)} className={BTN}>Remove</button>
        </>
      )}
      {error && <span role="alert" className="basis-full text-right text-[12.5px] font-semibold text-magenta-dark">{error}</span>}
    </span>
  );
}
