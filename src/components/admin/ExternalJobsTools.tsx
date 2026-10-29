"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// EX-E001/E006/E008: the small client pieces of Admin › External Jobs.
const B = "inline-flex min-h-8 items-center border border-ink px-3 text-[12.5px] font-semibold hover:bg-bg-soft disabled:opacity-40";
type Res = { ok: boolean; j: { error?: string; key?: string } };
const post = (body: object): Promise<Res> => fetch("/api/admin/external-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ ok: r.ok, j: (await r.json().catch(() => ({}))) as Res["j"] })).catch(() => ({ ok: false, j: { error: "Network error." } }));

export function ExtAction({ action, id, label, ask }: { action: string; id: string; label: string; ask?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} className={B} data-ext-action={action} onClick={async () => {
      const reason = ask ? window.prompt(ask, "") : undefined;
      if (ask && reason === null) return;
      setBusy(true);
      const r = await post({ action, id, reason });
      setBusy(false);
      if (!r.ok) window.alert(r.j.error ?? "That didn't work.");
      else router.refresh();
    }}>{label}</button>
  );
}

export function UploadSheet() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <label className="block text-[13px]">
      <input type="file" accept=".csv,.xlsx" className="text-[13px]" data-ext-upload onChange={async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        setMsg("Reading…");
        const fd = new FormData(); fd.set("file", f);
        const r = await fetch("/api/admin/external-jobs/upload", { method: "POST", body: fd }).catch(() => null);
        const j = (await r?.json().catch(() => ({}))) as { error?: string; received?: number; listed?: number; duplicates?: number; notOracle?: number; needsReview?: number };
        setMsg(r?.ok ? `${j.received} received · ${j.listed} listed · ${j.duplicates} duplicates merged · ${j.notOracle} not Oracle · ${j.needsReview} need review` : j.error ?? "Upload failed.");
        router.refresh();
      }} />
      {msg && <span className="mt-1 block text-[12.5px] text-ink-2" role="status">{msg}</span>}
    </label>
  );
}

export function KeyMaker() {
  const router = useRouter();
  const [key, setKey] = useState<string | null>(null);
  return (
    <div>
      <button type="button" className={B} data-ext-new-key onClick={async () => {
        const label = window.prompt("Name this key (e.g. Job Agent, Clipper)", "Job Agent");
        if (label === null) return;
        const r = await post({ action: "create-key", label });
        if (r.ok && r.j.key) { setKey(r.j.key); router.refresh(); } else window.alert(r.j.error ?? "Couldn't make a key.");
      }}>New Key</button>
      {key && <p className="mt-2 break-all rounded-[8px] bg-state-pending-bg px-3 py-2 text-[12.5px]" data-ext-key>Copy it now — it isn&apos;t shown again: <b className="font-mono">{key}</b></p>}
    </div>
  );
}

export function CopyMessage({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className={B} data-ext-copy onClick={async () => { await navigator.clipboard.writeText(text).catch(() => null); setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? "Copied" : "Copy Message"}</button>;
}

/** XA-E003: Add Contact inline — name, LinkedIn profile, email (all optional, one needed). */
export function AddContact({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", linkedinUrl: "", email: "" });
  const [busy, setBusy] = useState(false);
  if (!open) return <button type="button" className={B} onClick={() => setOpen(true)} data-ext-add-contact>Add Contact</button>;
  const field = (k: keyof typeof f, label: string) => <input aria-label={label} placeholder={label} value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} className="min-h-8 w-40 border border-state-border bg-surface px-2 text-[12.5px]" />;
  return (
    <span className="flex flex-wrap items-center gap-1.5" data-ext-contact-form>
      {field("name", "Name")}{field("linkedinUrl", "LinkedIn Profile URL")}{field("email", "Email")}
      <button type="button" className={B} disabled={busy} onClick={async () => {
        setBusy(true);
        const r = await post({ action: "add-contact", id, ...f });
        setBusy(false);
        if (!r.ok) window.alert(r.j.error ?? "Couldn't add that contact.");
        else { setOpen(false); setF({ name: "", linkedinUrl: "", email: "" }); router.refresh(); }
      }}>Save</button>
      <button type="button" className={B} onClick={() => setOpen(false)}>Cancel</button>
    </span>
  );
}

/** XA-E003: Mark Contacted — the date is today; the channel is the one you used. */
export function MarkContacted({ id, again }: { id: string; again: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const mark = async (channel: "LINKEDIN" | "EMAIL") => {
    setBusy(true);
    const r = await post({ action: "contacted", id, channel });
    setBusy(false);
    if (!r.ok) window.alert(r.j.error ?? "That didn't work."); else router.refresh();
  };
  return (
    <span className="flex items-center gap-1.5" data-ext-mark-contacted>
      <span className="text-[12px] text-ink-2">{again ? "Contacted Again:" : "Mark Contacted:"}</span>
      <button type="button" className={B} disabled={busy} onClick={() => mark("LINKEDIN")}>LinkedIn</button>
      <button type="button" className={B} disabled={busy} onClick={() => mark("EMAIL")}>Email</button>
    </span>
  );
}
