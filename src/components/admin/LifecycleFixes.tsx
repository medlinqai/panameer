"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Admin › one person: lifecycle fixes. Each posts to /api/admin/user-edit, which writes the audit row.
const BTN = "inline-flex min-h-[38px] items-center border border-ink px-3 text-[13px] font-bold disabled:opacity-50";
const BTN_K = "inline-flex min-h-[38px] items-center border border-ink bg-ink px-3 text-[13px] font-bold text-surface disabled:opacity-50";

function useCall(personId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const call = async (action: string, extra: Record<string, unknown>, done: string) => {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/admin/user-edit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, personId, ...extra }) }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    if (!r?.ok) return setMsg({ ok: false, text: b?.error ?? "That didn't work." }), false;
    setMsg({ ok: true, text: done });
    router.refresh();
    return true;
  };
  const note = msg && <span role="status" className={"text-[12.5px] " + (msg.ok ? "text-ink-2" : "font-semibold text-magenta-dark")}>{msg.text}</span>;
  return { call, busy, note };
}

/** Step 2: Mark Verified asks for a reason (kept in the audit row). */
export function MarkVerified({ personId }: { personId: string }) {
  const { call, busy, note } = useCall(personId);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {open ? (
        <>
          <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" aria-label="Reason" className="h-[38px] w-[220px] border border-line px-2 text-[13px]" />
          <button type="button" disabled={busy || !reason.trim()} onClick={async () => (await call("verify", { reason }, "Marked verified.")) && setOpen(false)} className={BTN_K}>
            Mark Verified
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-[12.5px] font-semibold text-ink-2">Cancel</button>
        </>
      ) : (
        <button type="button" data-mark-verified onClick={() => setOpen(true)} className={BTN}>Mark Verified…</button>
      )}
      {note}
    </span>
  );
}

/** Step 3: send the "finish your profile" notice with their missing items. */
export function NudgeToFinish({ personId }: { personId: string }) {
  const { call, busy, note } = useCall(personId);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" data-nudge-profile disabled={busy} onClick={() => call("nudge", {}, "Nudge sent.")} className={BTN}>
        {busy ? "Sending…" : "Nudge to Finish"}
      </button>
      {note}
    </span>
  );
}

/** Step 4: add to a company as a member (search by name). */
export function AddToCompany({ personId }: { personId: string }) {
  const { call, busy, note } = useCall(personId);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string }[]>([]);
  const [pick, setPick] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    if (q.trim().length < 2) return;
    let live = true;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/company?q=${encodeURIComponent(q.trim())}`).catch(() => null);
      const b = (await r?.json().catch(() => null)) as { companies?: { id: string; name: string }[] } | null;
      if (live) setHits(b?.companies ?? []);
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);
  if (!open)
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <button type="button" data-add-company onClick={() => setOpen(true)} className={BTN}>Add to a Company…</button>
        {note}
      </span>
    );
  return (
    <div data-add-company-form className="mt-2 w-full max-w-md border border-line p-3">
      <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setPick(null); if (e.target.value.trim().length < 2) setHits([]); }} placeholder="Company name…" aria-label="Company" className="h-[38px] w-full border border-line px-2 text-[13.5px]" />
      <ul className="mt-1 max-h-[160px] overflow-y-auto">
        {hits.map((h) => (
          <li key={h.id}>
            <button type="button" onClick={() => setPick(h)} className={"w-full px-2 py-1 text-left text-[13.5px] " + (pick?.id === h.id ? "bg-ink text-surface" : "hover:bg-bg-soft")}>{h.name}</button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || !pick} onClick={async () => (await call("add_company", { companyId: pick!.id }, `Added to ${pick!.name} as a member.`)) && setOpen(false)} className={BTN_K}>
          {pick ? `Add to ${pick.name}` : "Pick a Company"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[12.5px] font-semibold text-ink-2">Cancel</button>
        {note}
      </div>
      <p className="mt-1.5 text-[12px] text-ink-3">Added as a member. Any other company membership closes — one company per person.</p>
    </div>
  );
}
