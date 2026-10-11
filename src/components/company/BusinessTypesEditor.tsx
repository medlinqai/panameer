"use client";

import { useState } from "react";

// TX-E003: the business types this company sells under — more than one allowed; admins change them.
export function BusinessTypesEditor({ types, initial, canEdit }: { types: { id: string; name: string; group: string | null }[]; initial: string[]; canEdit: boolean }) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const flip = async (id: string) => {
    setError(null);
    const r = await fetch("/api/company/business-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessTypeId: id, on: !on.includes(id) }) });
    const j = (await r.json().catch(() => ({}))) as { ids?: string[]; error?: string };
    if (r.ok && j.ids) setOn(j.ids);
    else setError(j.error ?? "Could not save that");
  };
  return (
    <section id="business-types" data-business-types className="mt-8 border-t border-line pt-5">
      <h2 className="text-[19px] font-bold">Business Types</h2>
      <p className="mt-1 text-[13.5px] text-ink-2">What your company sells. Each one brings its own Service Catalog to Build Your Catalog.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {types.map((t) => {
          const active = on.includes(t.id);
          return canEdit ? (
            <button key={t.id} type="button" aria-pressed={active} onClick={() => flip(t.id)} className={"border px-3 py-1.5 text-[13.5px] font-semibold " + (active ? "border-ink bg-ink text-surface" : "border-line hover:border-ink")}>
              {active ? "✓ " : "+ "}{t.name}
            </button>
          ) : active ? (
            <span key={t.id} className="border border-ink px-3 py-1.5 text-[13.5px] font-semibold">{t.name}</span>
          ) : null;
        })}
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{error}</p>}
    </section>
  );
}
