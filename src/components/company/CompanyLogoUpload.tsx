"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Edit logo in place: the original file is kept as uploaded (no forced crop); "Crop to Square" is optional.
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
  const [picked, setPicked] = useState<File | null>(null);
  const choose = async (file: File | undefined, crop = false) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setPicked(null);
    try {
      const upload = crop ? new File([await squarePng(file)], "logo.png", { type: "image/png" }) : file;
      const fd = new FormData();
      fd.append("file", upload);
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
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPicked(f);
        }}
        data-logo-input
      />
      {picked && (
        <span data-logo-confirm className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
          <button type="button" onClick={() => choose(picked)} className="border border-ink bg-ink px-2.5 py-1 font-bold text-surface">
            Use as Is
          </button>
          <button type="button" onClick={() => choose(picked, true)} className="border border-ink bg-surface px-2.5 py-1 font-bold text-ink">
            Crop to Square
          </button>
        </span>
      )}
      {error && <span role="alert" className="mt-1 block text-[12px] font-semibold text-magenta-dark">{error}</span>}
    </>
  );
}
