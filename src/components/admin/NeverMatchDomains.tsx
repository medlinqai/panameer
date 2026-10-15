"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// BC-E007: Admin › Settings — email domains that never auto-match a company.
export function NeverMatchDomains({ domains }: { domains: string[] }) {
  const router = useRouter();
  const [text, setText] = useState(domains.join("\n"));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    setBusy(true);
    setSaved(false);
    const r = await fetch("/api/admin/settings/domains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domains: text.split(/[\s,]+/).filter(Boolean) }) });
    const j = (await r.json().catch(() => ({}))) as { domains?: string[] };
    if (r.ok && j.domains) { setText(j.domains.join("\n")); setSaved(true); }
    setBusy(false);
    router.refresh();
  };
  return (
    <section data-setting="never_match_email_domains" className="border-b border-line py-4">
      <b className="text-[15px]">Email domains that never auto-match a company</b>
      <span className="block text-[13px] text-ink-2">One per line. People signing up with these emails aren&apos;t matched to a company by email domain (website and tax ID still match).</span>
      <textarea aria-label="Email domains that never auto-match a company" value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} rows={4} className="mt-2 block w-full max-w-md border border-line bg-surface p-2 font-mono text-[13.5px]" />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" disabled={busy} onClick={save} className="bg-ink px-4 py-2 text-[13.5px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        {saved && <span className="text-[13px] text-ink-2">Saved.</span>}
      </div>
    </section>
  );
}
