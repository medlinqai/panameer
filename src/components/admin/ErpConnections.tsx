"use client";

import { useState } from "react";
import type { ConnectionRow } from "@/lib/erp/connections";

const INPUT = "mt-0.5 h-10 w-full border border-line bg-surface px-2.5 text-[13.5px] font-normal focus:border-ink focus:outline-none";
const BTN_K = "inline-flex min-h-10 items-center bg-ink px-4 text-[13.5px] font-semibold text-surface disabled:opacity-40";

type Draft = { id: string | null; pAccountId: string; name: string; fromIdentity: string; senderIdentity: string; toIdentity: string; outboundCxmlUrl: string; oracleRestBaseUrl: string; credentialEnvName: string; active: boolean; newSecret: string };
const blank = (): Draft => ({ id: null, pAccountId: "", name: "", fromIdentity: "", senderIdentity: "", toIdentity: "PANAMEER", outboundCxmlUrl: "", oracleRestBaseUrl: "", credentialEnvName: "", active: true, newSecret: "" });

/** X-E001: list + create/edit ERP connections. The shared secret can be set or rotated, never read back. */
export function ErpConnections({ initial, accounts }: { initial: ConnectionRow[]; accounts: { id: string; name: string }[] }) {
  const [rows, setRows] = useState(initial);
  const [d, setD] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!d) return;
    setBusy(true);
    setError(null);
    const { id, ...connection } = d;
    const r = await fetch("/api/admin/erp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, connection: { ...connection, newSecret: connection.newSecret || null } }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; connections?: ConnectionRow[] };
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "Could not save");
    setRows(j.connections ?? rows);
    setD(null);
  };
  const field = (k: keyof Draft, label: string, ph = "") => (
    <label className="text-[12px] font-bold">{label}<input value={String(d![k])} onChange={(e) => setD({ ...d!, [k]: e.target.value })} placeholder={ph} className={INPUT} /></label>
  );
  return (
    <section>
      <table className="w-full text-left text-[13px]">
        <thead><tr className="border-b border-line text-ink-2"><th className="py-2">Connection</th><th>Customer</th><th>From / Sender</th><th>Secret</th><th>Credentials</th><th>Status</th><th /></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-b border-line">
              <td className="py-2 font-semibold">{c.name} <span className="font-normal text-ink-3">· {c.erpKind}</span></td>
              <td>{c.accountName}</td>
              <td>{c.fromIdentity} / {c.senderIdentity}</td>
              <td>{c.hasSecret ? "Set (hashed)" : "Not set"}</td>
              <td>{c.credentialEnvName ? `${c.credentialEnvName} · ${c.credentialSet ? "present" : "missing"}` : "—"}</td>
              <td>{c.active ? "Active" : "Off"}</td>
              <td><button type="button" onClick={() => setD({ id: c.id, pAccountId: c.pAccountId, name: c.name, fromIdentity: c.fromIdentity, senderIdentity: c.senderIdentity, toIdentity: c.toIdentity, outboundCxmlUrl: c.outboundCxmlUrl ?? "", oracleRestBaseUrl: c.oracleRestBaseUrl ?? "", credentialEnvName: c.credentialEnvName ?? "", active: c.active, newSecret: "" })} className="font-semibold underline">Edit</button></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="py-4 text-ink-2">No ERP connections yet.</td></tr>}
        </tbody>
      </table>
      {!d && <button type="button" onClick={() => setD(blank())} className={`${BTN_K} mt-4`}>Add a Connection</button>}
      {d && (
        <div data-erp-form className="mt-4 grid gap-3 border border-line bg-white p-4 sm:grid-cols-3">
          <label className="text-[12px] font-bold">Customer account
            <select value={d.pAccountId} onChange={(e) => setD({ ...d, pAccountId: e.target.value })} className={INPUT}>
              <option value="">Choose…</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          {field("name", "Name", "Acme · Oracle Cloud")}
          {field("credentialEnvName", "Credential env var", "ORACLE_ACME_REST")}
          {field("fromIdentity", "cXML From identity", "ACME-ERP")}
          {field("senderIdentity", "cXML Sender identity", "ACME-ERP")}
          {field("toIdentity", "cXML To identity", "PANAMEER")}
          {field("outboundCxmlUrl", "Outbound cXML URL", "https://…/cxml")}
          {field("oracleRestBaseUrl", "Oracle REST base URL", "https://acme.fa.ocs.oraclecloud.com")}
          {field("newSecret", d.id ? "New shared secret (rotates it)" : "Shared secret (16+ characters)")}
          <label className="flex items-center gap-2 text-[13px] font-semibold"><input type="checkbox" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} /> Active</label>
          <div className="flex items-center gap-3 sm:col-span-3">
            <button type="button" disabled={busy || !d.pAccountId} onClick={save} className={BTN_K}>{busy ? "Saving…" : "Save Connection"}</button>
            <button type="button" onClick={() => { setD(null); setError(null); }} className="text-[13px] font-semibold underline">Cancel</button>
            {error && <span role="alert" className="text-[13px] font-semibold text-magenta-dark">{error}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
