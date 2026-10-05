"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Edit logo in place (Scott 2026-10-05): pick a file → centre-crop to a square PNG → save. No page change.
async function squarePng(file: File, size = 512): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(new Error("That file isn't an image we can read."));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const out = Math.min(size, side);
    const c = document.createElement("canvas");
    c.width = c.height = out;
    c.getContext("2d")!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out);
    return await new Promise<Blob>((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error("Could not read that image."))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function CompanyLogoUpload({ companyId, label = "Edit logo", className }: { companyId: string; label?: string; className?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const choose = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await squarePng(file);
      const fd = new FormData();
      fd.append("file", new File([blob], "logo.png", { type: "image/png" }));
      fd.append("companyId", companyId);
      const r = await fetch("/api/company/logo", { method: "POST", body: fd });
      const b = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(b.error ?? "Could not upload that image.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload that image.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <>
      <button type="button" data-logo-upload onClick={() => input.current?.click()} disabled={busy} className={className}>
        {busy ? "Uploading…" : label}
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => choose(e.target.files?.[0])} data-logo-input />
      {error && <span role="alert" className="mt-1 block text-[12px] font-semibold text-magenta-dark">{error}</span>}
    </>
  );
}
