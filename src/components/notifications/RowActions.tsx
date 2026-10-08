"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RowAction } from "@/lib/worklist-actions";

// The buttons on a Worklist / Notifications row: Approve · Decline, Reply, or Dismiss — with Open as the secondary.
export function RowActions({ id, action, href, onDone }: { id: string; action: RowAction; href: string | null; onDone?: (label: string) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const post = async (body: Record<string, unknown>, label: string) => {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/worklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }).catch(() => null);
    const b = (await r?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!r?.ok) return setErr(b?.error ?? "That didn't work.");
    setDone(label);
    // The Worklist keeps the row in place (it turns Completed); the Notifications list refreshes.
    if (onDone) onDone(label);
    else router.refresh();
  };
  if (done) return <span data-row-done className="text-[12.5px] font-bold text-[#1f8a5b]">✓ {done}</span>;
  const open = href && <Link href={href} className="pm-triage-btn pm-triage-btn-s">Open</Link>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5" data-row-actions={action?.kind ?? "open"} onClick={(e) => e.stopPropagation()}>
      {action?.kind === "join" && action.pending && (
        <>
          <button type="button" data-approve disabled={busy} onClick={() => post({ action: "decide", decision: "APPROVED" }, "Approved")} className="pm-triage-btn pm-triage-btn-p">Approve</button>
          <button type="button" data-decline disabled={busy} onClick={() => post({ action: "decide", decision: "REJECTED" }, "Declined")} className="pm-triage-btn pm-triage-btn-s">Decline</button>
        </>
      )}
      {action?.kind === "reply" && <Link href={action.href} data-reply className="pm-triage-btn pm-triage-btn-p">Reply</Link>}
      {action?.kind === "dismiss" && <button type="button" data-dismiss disabled={busy} onClick={() => post({ action: "dismiss" }, "Dismissed")} className="pm-triage-btn pm-triage-btn-s">Dismiss</button>}
      {action?.kind !== "reply" && open}
      {!href && !action && <span className="text-[12.5px] text-ink-3">No link</span>}
      {err && <span role="alert" className="text-[12px] font-semibold text-magenta-dark">{err}</span>}
    </span>
  );
}

/** A Worklist row whose Status cell turns Completed in place once a row action succeeds. */
export function WorklistRow({ id, resolved, action, href, children }: { id: string; resolved: boolean; action: RowAction; href: string | null; children: React.ReactNode }) {
  const [done, setDone] = useState(resolved);
  return (
    <tr data-row={id} data-resolved={done ? "yes" : "no"}>
      <td data-label="Status"><span className="pm-wl-status">{done ? "Completed" : "Open"}</span></td>
      {children}
      <td data-label="Action">{resolved ? (href ? <Link href={href} className="pm-triage-btn pm-triage-btn-s">Open</Link> : <span className="text-[12.5px] text-ink-3">No link</span>) : <RowActions id={id} action={action} href={href} onDone={() => setDone(true)} />}</td>
    </tr>
  );
}
