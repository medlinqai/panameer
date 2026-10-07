"use client";

import { useRef, useState } from "react";
import type { BuyerProfileView } from "@/lib/buyer-profile";

// Optional "Fill from résumé" for buyers: one read, buyer fields only. Fills an empty title/overview; replaces work history, education.
export function FillFromResume({ onFilled, className = "" }: { onFilled: (p: BuyerProfileView) => void; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const pick = async (file: File) => {
    setBusy(true);
    setMsg(null);
    const body = new FormData();
    body.append("file", file);
    const r = await fetch("/api/buyer/profile/resume", { method: "POST", body }).catch(() => null);
    const b = (await r?.json().catch(() => null)) as { error?: string; profile?: BuyerProfileView; found?: { jobs: number; schools: number; languages: number } } | null;
    setBusy(false);
    if (!r?.ok || !b?.profile) return setMsg({ ok: false, text: b?.error ?? "We couldn't read that file." });
    const f = b.found!;
    setMsg({ ok: true, text: `Filled from your résumé: ${f.jobs} job${f.jobs === 1 ? "" : "s"}, ${f.schools} school${f.schools === 1 ? "" : "s"}, ${f.languages} language${f.languages === 1 ? "" : "s"}. Check it over.` });
    onFilled(b.profile);
  };
  return (
    <div data-fill-from-resume className={className}>
      <input ref={input} type="file" accept=".pdf,.doc,.docx,.txt,.rtf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = ""; }} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex min-h-[40px] items-center border border-ink px-4 text-[13.5px] font-bold disabled:opacity-50">
        {busy ? "Reading your résumé…" : "Fill From Résumé"}
      </button>
      <span className="ml-2 text-[12.5px] text-ink-2">Optional — fills your title, overview, work history, education and languages.</span>
      {msg && <p role="status" className={"mt-1.5 text-[13px] " + (msg.ok ? "text-ink-2" : "font-semibold text-magenta-dark")}>{msg.text}</p>}
    </div>
  );
}
