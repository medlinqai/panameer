"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Edit logo in place: the original file is kept as uploaded (no forced crop); "Fit to Square" is optional.
// "Fit to Square": trims empty margins (white or transparent) and centres the
// WHOLE logo in a square with even padding — never cuts any of it off.
async function squarePng(file: File, size = 512): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(new Error("That file isn't an image we can read."));
      i.src = url;
    });
    const w = img.naturalWidth, h = img.naturalHeight;
    const src = document.createElement("canvas");
    src.width = w; src.height = h;
    const sx = src.getContext("2d")!;
    sx.drawImage(img, 0, 0);
    // Find the box of "ink": not transparent and not near-white.
    const d = sx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      const ink = d[k + 3] > 16 && !(d[k] > 242 && d[k + 1] > 242 && d[k + 2] > 242);
      if (ink) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const cx = c.getContext("2d")!;
    cx.fillStyle = "#ffffff";
    cx.fillRect(0, 0, size, size);
    const inner = size * 0.84; // ~8% padding each side
    const scale = Math.min(inner / bw, inner / bh);
    const dw = bw * scale, dh = bh * scale;
    cx.imageSmoothingQuality = "high";
    cx.drawImage(src, x0, y0, bw, bh, (size - dw) / 2, (size - dh) / 2, dw, dh);
    return await new Promise<Blob>((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error("Could not read that image."))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function CompanyLogoUpload({
  companyId,
  currentUrl = null,
  label = "Edit logo",
  className,
  statusClassName = "",
  quiet = false,
}: {
  companyId: string;
  currentUrl?: string | null;
  label?: string;
  className?: string;
  statusClassName?: string;
  quiet?: boolean;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // After an upload: the file (for Fit to Square) and the logo it replaced (for Undo).
  const [last, setLast] = useState<{ file: File; previous: string | null; cropped: boolean } | null>(null);
  const upload = async (file: File, crop: boolean, previous: string | null) => {
    setBusy(crop ? "Fitting…" : "Uploading…");
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
      if (quiet) {
        setToast(crop ? "Fitted to square" : "Logo updated");
        setTimeout(() => setToast(null), 3000);
      }
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
      {toast && (
        <span role="status" data-toast className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 bg-ink px-4 py-2.5 text-[13px] font-semibold text-surface shadow-lg">
          {toast}
        </span>
      )}
      {!quiet && last && !busy && (
        <span data-logo-done className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap text-[12px]">
          <span className="font-semibold text-ink">{last.cropped ? "Fitted to square" : "Logo updated"}</span>
          {!last.cropped && (
            <button type="button" onClick={() => upload(last.file, true, last.previous)} className="font-semibold text-magenta-dark underline">
              Fit to Square
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

/** Crops the current logo to a square and uploads it (Branding's small link under the logo box). */
export function CropLogoToSquare({ companyId, currentUrl, className }: { companyId: string; currentUrl: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const crop = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await (await fetch(currentUrl)).blob();
      const sq = await squarePng(new File([blob], "logo", { type: blob.type || "image/png" }));
      const fd = new FormData();
      fd.append("file", new File([sq], "logo.png", { type: "image/png" }));
      fd.append("companyId", companyId);
      const r = await fetch("/api/company/logo", { method: "POST", body: fd });
      if (!r.ok) throw new Error("Could not fit that logo.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fit that logo.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button type="button" data-crop-square onClick={crop} disabled={busy} className={className}>
        {busy ? "Fitting…" : "Fit to Square"}
      </button>
      {error && <span role="alert" className="block text-[12px] font-semibold text-magenta-dark">{error}</span>}
    </>
  );
}
