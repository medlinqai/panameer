"use client";

import Link from "next/link";
import { useState } from "react";

// Lane 7: Make an Offer on a Service (rate) — a different rate and/or a start-by date. Same flow as Service Products.
export function ServiceOfferButton({ serviceId }: { serviceId: string }) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const send = async () => {
    const cents = rate.trim() ? Math.round(Number(rate) * 100) : null;
    if (cents !== null && !(cents > 0)) return setMsg("Enter a rate above zero");
    if (cents === null && !date) return setMsg("Propose a rate or a date");
    setBusy(true);
    const r = await fetch("/api/shop/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerServiceId: serviceId, amountCents: cents, deliveryDate: date || null, note: note || null }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Could not send that offer");
    setOpen(false);
    setMsg(j.status === "DENIED" ? j.message : "Offer sent — they'll accept, counter or decline.");
  };
  return (
    <span className="block" data-service-offer>
      {!open && <button type="button" onClick={() => setOpen(true)} className="text-[12.5px] font-semibold underline underline-offset-4">Make an Offer</button>}
      {open && (
        <span className="mt-1 flex flex-wrap items-center justify-end gap-1.5">
          <span className="inline-flex items-center border border-line bg-surface"><span className="px-1.5 text-ink-3">$</span><input inputMode="decimal" aria-label="Your rate" value={rate} onChange={(e) => setRate(e.target.value)} className="w-16 border-0 py-1 text-[12.5px] outline-none" /></span>
          <input type="date" aria-label="Start by" value={date} onChange={(e) => setDate(e.target.value)} className="border border-line px-1 py-1 text-[12.5px]" />
          <input aria-label="Note" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} className="w-24 border border-line px-1.5 py-1 text-[12.5px]" />
          <button type="button" disabled={busy} onClick={send} className="bg-ink px-2.5 py-1 text-[12.5px] font-bold text-white disabled:opacity-40">Send</button>
        </span>
      )}
      {msg && <span role="status" className="block text-[12px] text-ink-2">{msg} <Link href="/estimates#offers" className="underline">My Offers</Link></span>}
    </span>
  );
}
