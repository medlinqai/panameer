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

export function CompanyLogoUpload({ companyId, currentUrl = null, label = "Edit logo", className, statusClassName = "" }: { companyId: string; currentUrl?: string | null; label?: string; className?: string; statusClassName?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // After an upload: the file (for Crop to Square) and the logo it replaced (for Undo).
  const [last, setLast] = useState<{ file: File; previous: string | null; cropped: boolean } | null>(null);
  const upload = async (file: File, crop: boolean, previous: string | null) => {
    setBusy(crop ? "Cropping…" : "Uploading…");
    setError(null);
    try {
      const body = crop ? new File([await squarePng(file)], "logo.png", { type: "image/png" }) : file;
      const fd = new FormData();
      fd.append("file", body);
      fd.append("companyId", companyId);
      const r = await fetch("/api/company/logo", { method: "POST", body: fd });
      const b = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(b.error ?? `Upload failed (${r.status}). Try a PNG, JPG, WebP or SVG under 5 MB.`);
      setLast({ file, previous, cropped: crop });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload that image.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };
  const undo = async () => {
    if (!last) return;
    setBusy("Restoring…");
    setError(null);
    const r = await fetch("/api/company/logo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, logoUrl: last.previous }) }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(null);
    if (!r?.ok) return setError(b?.error ?? "Could not restore the previous logo.");
    setLast(null);
    router.refresh();
  };
  return (
    <>
      <button type="button" data-logo-upload onClick={() => input.current?.click()} disabled={!!busy} className={className}>
        {busy ?? label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f, false, currentUrl);
        }}
        data-logo-input
      />
      <span className={`block ${statusClassName}`}>
      {last && !busy && (
        <span data-logo-done className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap text-[12px]">
          <span className="font-semibold text-ink">{last.cropped ? "Cropped to square" : "Logo updated"}</span>
          {!last.cropped && (
            <button type="button" onClick={() => upload(last.file, true, last.previous)} className="font-semibold text-magenta-dark underline">
              Crop to Square
            </button>
          )}
          <button type="button" onClick={undo} className="font-semibold text-magenta-dark underline">
            Undo
          </button>
        </span>
      )}
      {error && <span role="alert" className="mt-1 block max-w-[260px] text-[12px] font-semibold text-magenta-dark">{error}</span>}
      </span>
    </>
  );
}
