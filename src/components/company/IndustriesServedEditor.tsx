"use client";

import { useState } from "react";

// BT-E001: Industries You Serve — a seller company's industries (any number); admins change them.
export function IndustriesServedEditor({ industries, initial, canEdit }: { industries: { id: string; name: string }[]; initial: string[]; canEdit: boolean }) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const flip = async (id: string) => {
    setError(null);
    const r = await fetch("/api/company/industries-served", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ specializationId: id, on: !on.includes(id) }) });
    const j = (await r.json().catch(() => ({}))) as { ids?: string[]; error?: string };
    if (r.ok && j.ids) setOn(j.ids);
    else setError(j.error ?? "Could not save that");
  };
  const shown = canEdit ? industries : industries.filter((i) => on.includes(i.id));
  return (
    <section id="industries-served" data-industries-served className="mt-8 border-t border-line pt-5">
      <h2 className="text-[19px] font-bold">Industries You Serve</h2>
      <p className="mt-1 text-[13.5px] text-ink-2">Optional. Buyers in these industries see your company first.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {shown.length === 0 && <span className="text-[13.5px] text-ink-2">None yet.</span>}
        {shown.map((i) => {
          const active = on.includes(i.id);
          return canEdit ? (
            <button key={i.id} type="button" aria-pressed={active} onClick={() => flip(i.id)} className={"border px-3 py-1.5 text-[13px] font-semibold " + (active ? "border-ink bg-ink text-surface" : "border-line hover:border-ink")}>
              {active ? "✓ " : "+ "}{i.name}
            </button>
          ) : (
            <span key={i.id} className="border border-ink px-3 py-1.5 text-[13px] font-semibold">{i.name}</span>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{error}</p>}
    </section>
  );
}
