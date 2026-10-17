"use client";

import { useRouter } from "next/navigation";
import { HelpTip } from "@/components/ui/HelpTip";
import { fieldHelp } from "@/lib/field-guide";
import { useState } from "react";

// IN-E002: asked once, only of professional sellers with no industry yet.
export function IndustryAsk({ industries, onSaved }: { industries: { id: string; name: string }[]; /** In the Create What You Sell run: called instead of a page refresh. */ onSaved?: () => void }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const r = await fetch("/api/provider/industries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: picked }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Could not save that");
    if (onSaved) return onSaved();
    router.refresh();
  };
  return (
    <section id="industries" data-industry-ask className="mb-4 border-l-2 border-magenta bg-white py-3 pl-4 pr-3">
      <h2 className="flex items-center text-[16px] font-bold">Which industries have you worked in?<HelpTip label="Industry" text={fieldHelp("Industry", "seller")} /></h2>
      <p className="text-[13px] text-ink-2">Buyers search by industry. Pick every one that fits.</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {industries.map((i) => {
          const on = picked.includes(i.id);
          return <button key={i.id} type="button" data-industry={i.name} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== i.id) : [...p, i.id]))} className={on ? "border border-ink bg-ink px-2.5 py-1 text-[12.5px] text-white" : "border border-line px-2.5 py-1 text-[12.5px]"}>{i.name}</button>;
        })}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" disabled={busy || !picked.length} onClick={save} className="min-h-9 bg-ink px-4 text-[13px] font-bold text-surface disabled:opacity-40">Save Industries</button>
        {msg && <span role="status" className="text-[13px] font-semibold">{msg}</span>}
      </div>
    </section>
  );
}
