"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ErpMessageRow = { id: string; at: string; connection: string; direction: string; type: string; status: string; payloadId: string; related: string; response: string | null; error: string | null; body: string };

/** X-E007: the ERP inbox/outbox log, with Resend for failed or held outbound messages. */
export function ErpMessages({ rows }: { rows: ErpMessageRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const resend = async (id: string) => {
    setBusy(id);
    const r = await fetch("/api/admin/erp/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = (await r.json().catch(() => ({}))) as { note?: string; error?: string };
    setBusy(null);
    setNote((n) => ({ ...n, [id]: j.note ?? j.error ?? "" }));
    router.refresh();
  };
  return (
    <section className="mt-10">
      <h2 className="text-[20px] font-bold">Message Log</h2>
      <table className="mt-3 w-full text-left text-[12.5px]">
        <thead><tr className="border-b border-line text-ink-2"><th className="py-2">When</th><th>Connection</th><th>Dir</th><th>Type</th><th>Status</th><th>Related</th><th>Response</th><th /></tr></thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} data-erp-message={m.status} className="border-b border-line align-top">
              <td className="py-1.5 whitespace-nowrap">{m.at}</td>
              <td>{m.connection}</td>
              <td>{m.direction}</td>
              <td><button type="button" onClick={() => setOpen(open === m.id ? null : m.id)} className="underline">{m.type}</button>{open === m.id && <pre className="mt-1 max-h-64 max-w-[520px] overflow-auto whitespace-pre-wrap bg-bg-soft p-2 text-[11px]">{m.body}</pre>}</td>
              <td className="font-semibold">{m.status}</td>
              <td>{m.related}</td>
              <td className="max-w-[260px] truncate" title={m.error ?? m.response ?? ""}>{m.error ?? m.response ?? "—"}</td>
              <td>{m.direction === "OUT" && (m.status === "FAILED" || m.status === "HELD") && <button type="button" disabled={busy === m.id} onClick={() => resend(m.id)} className="font-semibold underline">{busy === m.id ? "…" : "Resend"}</button>}{note[m.id] && <span className="ml-1 text-ink-2">{note[m.id]}</span>}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="py-4 text-ink-2">No ERP messages yet.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
