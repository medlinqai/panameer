"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The admin's half of a ticket: reply, status, priority, assign, resolution
 * (`P2-J1.1-E032` WS-4).
 *
 * ⚠ A CLIENT COMPONENT FOR THE ACTIONS ONLY — the ticket and its thread are read
 * on the server. ⚠ IT NEVER IMPORTS `lib/storage.ts`: that module is server-only
 * (service-role key) and its docblock forbids exactly this. The screenshot
 * arrives as an already-signed URL from the server component.
 */
export function TicketAdminPanel({
  ticketId,
  status,
  priority,
  resolution,
  assigned,
  statuses,
  priorities,
}: {
  ticketId: string;
  status: string;
  priority: string;
  resolution: string;
  assigned: boolean;
  statuses: readonly string[];
  priorities: readonly string[];
}) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [res, setRes] = useState(resolution);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        setError((await r.json().catch(() => ({}))).error ?? "Could not update.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      if (!r.ok) {
        setError((await r.json().catch(() => ({}))).error ?? "Could not send that reply.");
        return;
      }
      setReply("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-brand border border-line bg-white p-5">
      {error && <p className="mb-3 text-[14px] text-amber-700">{error}</p>}

      <label className="block text-[14px] font-semibold">Reply to the reporter</label>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={4}
        placeholder="Thanks for the report — we've reproduced it and…"
        className="mt-1 w-full rounded-[12px] border border-line p-3 text-[15px] outline-none focus:border-magenta"
      />
      <button
        type="button"
        disabled={busy || !reply.trim()}
        onClick={send}
        className="mt-2 rounded-full bg-magenta px-6 py-2 font-bold text-white hover:bg-magenta-dark disabled:opacity-40"
      >
        {busy ? "Working…" : "Send Reply"}
      </button>

      <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
        <div>
          <label className="block text-[14px] font-semibold">Status</label>
          <select
            value={status}
            onChange={(e) => patch({ status: e.target.value })}
            disabled={busy}
            className="mt-1 w-full rounded-[10px] border border-line p-2.5 text-[14.5px]"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[14px] font-semibold">Priority</label>
          <select
            value={priority}
            onChange={(e) => patch({ priority: e.target.value })}
            disabled={busy}
            className="mt-1 w-full rounded-[10px] border border-line p-2.5 text-[14.5px]"
          >
            {priorities.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        {/* ⚠ ASSIGN-TO-SELF rather than a picker: there is exactly one Panameer
            admin today, the same fact that made Scott defer `TicketHelper`. An
            id parameter would be an unused surface taking a person id from the
            client. This grows a picker when there is a second admin. */}
        <button
          type="button"
          disabled={busy}
          onClick={() => patch(assigned ? { unassign: true } : { assignToSelf: true })}
          className="rounded-full border-[1.5px] border-line bg-white px-5 py-2 text-[14px] font-bold hover:border-magenta hover:text-magenta disabled:opacity-40"
        >
          {assigned ? "Unassign" : "Assign to Me"}
        </button>
      </div>

      <div className="mt-5 border-t border-line pt-5">
        <label className="block text-[14px] font-semibold">Resolution</label>
        <textarea
          value={res}
          onChange={(e) => setRes(e.target.value)}
          rows={3}
          placeholder="What was wrong and what changed."
          className="mt-1 w-full rounded-[12px] border border-line p-3 text-[15px] outline-none focus:border-magenta"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ resolution: res })}
          className="mt-2 rounded-full border-[1.5px] border-line bg-white px-5 py-2 text-[14px] font-bold hover:border-magenta hover:text-magenta disabled:opacity-40"
        >
          Save Resolution
        </button>
        {/* ⚠ `date_solved` IS DERIVED FROM THE STATUS server-side, never sent —
            so the column and the status cannot disagree. */}
      </div>
    </div>
  );
}
