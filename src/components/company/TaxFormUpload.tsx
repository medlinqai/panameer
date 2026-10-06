"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Legal & Tax: upload the company's W-9 (US) or W-8BEN-E (outside the US). PDF, PNG or JPG.
export function TaxFormUpload({ label, hasFile }: { label: string; hasFile: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = async (f: File) => {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", f);
    const r = await fetch("/api/company/tax-form", { method: "POST", body: fd }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    if (input.current) input.current.value = "";
    if (!r?.ok) return setError(b?.error ?? "That upload didn't work.");
    router.refresh();
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" data-tax-form-upload disabled={busy} onClick={() => input.current?.click()} className="border border-ink px-2.5 py-1 text-[12px] font-bold disabled:opacity-50">
        {busy ? "Uploading…" : hasFile ? `Replace ${label}` : `Upload ${label}`}
      </button>
      <input ref={input} type="file" accept="application/pdf,image/png,image/jpeg" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {error && <span role="alert" className="text-[12px] font-semibold text-magenta-dark">{error}</span>}
    </span>
  );
}
