"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Composer: text, plus an image by paste, drag-and-drop or 📎 (PNG/JPG/WebP, ≤5 MB). Text + image in one message is fine.
const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX = 5 * 1024 * 1024;

export function Composer({ toUserId, maxLength }: { toUserId: string; maxLength: number }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const take = (f: File | null | undefined) => {
    if (!f) return;
    if (!TYPES.includes(f.type)) return setError("Images must be PNG, JPG or WebP.");
    if (f.size > MAX) return setError("That image is too large (5MB max).");
    setError(null);
    setImage(f);
  };
  const clearImage = () => setImage(null);

  async function send() {
    const text = body.trim();
    if ((!text && !image) || busy) return;
    setBusy(true);
    setError(null);
    try {
      let res: Response;
      if (image) {
        const form = new FormData();
        form.append("toUserId", toUserId);
        form.append("body", text);
        form.append("file", image);
        res = await fetch("/api/messages/image", { method: "POST", body: form });
      } else {
        res = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", toUserId, body: text }) });
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) return setError(data?.error ?? "That didn't send. Try again.");
      setBody("");
      clearImage();
      router.refresh();
    } catch {
      setError("That didn't send. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-composer
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
      className={"border-t border-line pt-3 " + (drag ? "outline-dashed outline-2 outline-magenta" : "")}
    >
      {preview && (
        <div data-pending-image className="relative mb-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Image to send" className="max-h-[140px] max-w-[220px] border border-line object-contain" />
          <button type="button" aria-label="Remove image" onClick={clearImage} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-[12px] text-surface">✕</button>
        </div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onPaste={(e) => { const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/")); if (f) { e.preventDefault(); take(f); } }}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
        maxLength={maxLength}
        rows={3}
        placeholder="Type a message — paste or drop an image"
        aria-label="Write a message"
        className="w-full resize-y rounded-brand border border-line bg-white px-3 py-2 text-[14px] outline-none placeholder:text-ink-2/70 focus:border-magenta/60"
      />
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" aria-label="Attach an image" title="Attach an image" onClick={() => fileRef.current?.click()} className="grid min-h-[44px] w-11 place-items-center border border-line text-[18px] hover:border-ink">📎</button>
        <button
          type="button"
          onClick={send}
          disabled={busy || (body.trim().length === 0 && !image)}
          className="min-h-[44px] bg-magenta px-4 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta/90 disabled:bg-ink-2/15 disabled:text-ink-2"
        >
          {busy ? "Sending…" : "Send"}
        </button>
        {error && <span className="text-[12.5px] text-red-600">{error}</span>}
      </div>
    </div>
  );
}
