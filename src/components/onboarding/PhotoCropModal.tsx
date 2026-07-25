"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";

/**
 * Photo crop / zoom modal (brief_P / E019).
 *
 * Pick a file → pan and zoom inside a circular viewport → Attach. The crop is
 * applied client-side on a canvas and uploaded as a square PNG to the
 * owner-scoped endpoint from brief_O, so the server contract is unchanged.
 *
 * Canvas rather than a cropping dependency: the interaction is a pan + a zoom,
 * and the export is one `drawImage`, which isn't worth a library.
 */

const VIEW = 280; // on-screen viewport (px)
const OUT = 512; // exported image edge (px)
const MAX_INPUT_BYTES = 5 * 1024 * 1024;

export function PhotoCropModal({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (photoUrl: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [src, setSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    setSrc(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError(null);
    imgRef.current = null;
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  // Revoke the object URL when it changes or the modal closes.
  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, VIEW, VIEW);
    ctx.save();
    // Circular viewport.
    ctx.beginPath();
    ctx.arc(VIEW / 2, VIEW / 2, VIEW / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#f4f1f8";
    ctx.fillRect(0, 0, VIEW, VIEW);

    // "Cover" the viewport at zoom 1, then apply zoom + pan around the centre.
    const base = Math.max(VIEW / img.width, VIEW / img.height);
    const scale = base * zoom;
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (VIEW - w) / 2 + offset.x, (VIEW - h) / 2 + offset.y, w, h);
    ctx.restore();
  }, [zoom, offset]);

  useEffect(() => {
    draw();
  }, [draw, src]);

  const pick = (file: File) => {
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("That file type isn't supported. Upload a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("That image is larger than 5 MB. Choose a smaller file.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setSrc(url);
    };
    img.onerror = () => setError("We couldn't open that image.");
    img.src = url;
  };

  const attach = async () => {
    const img = imgRef.current;
    if (!img) return;
    setBusy(true);
    setError(null);
    try {
      // Re-render the same framing at export resolution.
      const out = document.createElement("canvas");
      out.width = OUT;
      out.height = OUT;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("no canvas context");
      const k = OUT / VIEW;
      const base = Math.max(VIEW / img.width, VIEW / img.height);
      const scale = base * zoom * k;
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (OUT - w) / 2 + offset.x * k, (OUT - h) / 2 + offset.y * k, w, h);

      const blob = await new Promise<Blob | null>((res) =>
        out.toBlob(res, "image/png")
      );
      if (!blob) throw new Error("could not export image");

      const body = new FormData();
      body.append("file", new File([blob], "profile-photo.png", { type: "image/png" }));
      const r = await fetch("/api/profile/photo", { method: "POST", body });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "Could not upload that image.");
        return;
      }
      onUploaded(data.photoUrl ?? null);
      reset();
      onClose();
    } catch {
      setError("Could not upload that image.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Add Your Photo">
      <p className="text-[14px] leading-relaxed text-ink-2">
        Must be an actual photo of you. Logos, clip-art, group photos, and
        altered images aren&apos;t allowed.
      </p>

      <div className="mt-5 flex flex-col items-center">
        {src ? (
          <>
            <canvas
              ref={canvasRef}
              width={VIEW}
              height={VIEW}
              className="cursor-grab touch-none rounded-full border border-line active:cursor-grabbing"
              onPointerDown={(e) => {
                drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!drag.current) return;
                setOffset({
                  x: e.clientX - drag.current.x,
                  y: e.clientY - drag.current.y,
                });
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
            />
            <label className="mt-4 flex w-full max-w-xs items-center gap-3">
              <span className="text-[13px] font-bold text-ink-2">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[#D72CD6]"
              />
            </label>
            <p className="mt-2 text-[13px] text-ink-2">Drag the photo to reposition.</p>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid h-[280px] w-[280px] place-items-center rounded-full border-2 border-dashed border-line text-center text-[14px] font-semibold text-ink-2 transition-colors hover:border-magenta hover:text-magenta"
          >
            <span>
              Choose a Photo
              <br />
              <span className="text-[13px] font-normal">PNG, JPG, or WebP · up to 5 MB</span>
            </span>
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
        }}
      />

      {error && (
        <p className="mt-4 rounded-[10px] bg-red-50 px-3 py-2 text-[14px] text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
        <button
          type="button"
          onClick={() => {
            if (src) reset();
            else onUploaded(null);
          }}
          disabled={busy}
          className="text-[15px] font-semibold text-ink-2 underline underline-offset-4 hover:text-magenta disabled:opacity-50"
        >
          {src ? "Choose a Different Photo" : "Delete"}
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={attach}
            disabled={!src || busy}
            className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            {busy ? "Attaching…" : "Attach Photo"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
