"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";

/**
 * Profile-photo picker (brief_O). Posts the chosen file to the owner-scoped
 * POST /api/profile/photo, which validates type + size server-side and returns
 * the stored public URL.
 *
 * Shared by the onboarding "Add a Photo" step and Settings → Profile so there
 * is one upload UI. The photo is always OPTIONAL — with none set, `Avatar`
 * renders the initials fallback.
 */

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

export function PhotoUpload({
  firstName,
  lastName,
  photoUrl,
  onChange,
  size = 80,
}: {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  /** Called with the new URL (or null when removed) once the server confirms. */
  onChange: (photoUrl: string | null) => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = () => {
    setError(null);
    inputRef.current?.click();
  };

  const upload = async (file: File) => {
    setError(null);
    // Client-side pre-checks for a fast, clear message; the server re-validates.
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("That file type isn't supported. Upload a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is larger than 5 MB. Choose a smaller file.");
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const r = await fetch("/api/profile/photo", { method: "POST", body });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "Could not upload that image.");
        return;
      }
      onChange(data.photoUrl ?? null);
    } catch {
      setError("Could not upload that image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/profile/photo", { method: "DELETE" });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data.error ?? "Could not remove that photo.");
        return;
      }
      onChange(null);
    } catch {
      setError("Could not remove that photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-5">
        <Avatar
          firstName={firstName}
          lastName={lastName}
          photoUrl={photoUrl}
          size={size}
        />
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={pick}
              disabled={busy}
              className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
            >
              {busy ? "Uploading…" : photoUrl ? "Replace Photo" : "Upload a Photo"}
            </button>
            {photoUrl && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="text-[14px] font-bold text-ink-2 underline underline-offset-4 transition-colors hover:text-magenta disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
          <p className="mt-2 text-[13px] text-ink-2">
            PNG, JPG, or WebP · up to 5 MB. Optional — we&apos;ll use your
            initials without one.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {error && (
        <p className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-[14px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
