"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { PLAYABLE_STATUSES } from "@/lib/learn";

export const AUDIENCES = [
  { value: "BEGINNERS", label: "Beginners" },
  { value: "END_USER", label: "End Users" },
  { value: "IMPLEMENTER", label: "Implementers" },
  { value: "CONTENT_CREATOR", label: "Content Creators" },
];

export const COURSE_STYLES = [
  { value: "", label: "— None —" },
  { value: "FA_OVERVIEW", label: "Functional Area Overview" },
  { value: "CONCEPTUAL", label: "Conceptual" },
  { value: "HOW_TO_USE", label: "How to Use" },
  { value: "HOW_TO_DEPLOY", label: "How to Deploy" },
  { value: "DAILY_JOURNAL", label: "Daily Journal" },
  { value: "ASK_THE_EXPERT", label: "Ask the Expert" },
];

/** The 0→7 production ladder, in ladder order. */
export const PRODUCTION_STATUSES = [
  { value: "IN_CONCEPT", label: "In Concept" },
  { value: "NEEDS_REFRESH", label: "Needs Refresh" },
  { value: "DECK_READY", label: "Deck Ready" },
  { value: "RAW_SHOT", label: "Raw Shot" },
  { value: "PRODUCED", label: "Produced" },
  { value: "LOADED_TO_STREAMING", label: "Loaded to Streaming" },
  { value: "URL_ADDED_TO_LESSON", label: "URL Added to Lesson" },
  { value: "BLOG_CREATED", label: "Blog Created" },
  { value: "BLOG_RELEASED", label: "Blog Released" },
];

export const CLAIMS_URL: readonly string[] = PLAYABLE_STATUSES;

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold uppercase tracking-wide text-ink-2">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[12.5px] text-ink-2">{hint}</span>}
    </label>
  );
}

const INPUT =
  "mt-1.5 w-full rounded-[12px] border border-line bg-white px-4 py-2.5 text-[14.5px] outline-none transition-colors focus:border-magenta disabled:bg-black/[0.03]";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={INPUT + " " + (props.className ?? "")} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} rows={props.rows ?? 3} className={INPUT} />;
}

export function Select({
  inline = false,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { inline?: boolean }) {
  return (
    <select
      {...props}
      className={
        inline
          ? "w-auto rounded-[12px] border border-line bg-white px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-magenta"
          : INPUT
      }
    />
  );
}

export function Button({
  tone = "primary",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "ghost" | "danger";
}) {
  const cls =
    tone === "primary"
      ? "bg-magenta text-white hover:bg-magenta-dark"
      : tone === "danger"
        ? "border-[1.5px] border-red-500/40 text-red-700 hover:bg-red-500/5"
        : "border-[1.5px] border-line text-ink hover:border-magenta hover:text-magenta";
  return (
    <button
      {...rest}
      className={
        "rounded-full px-5 py-2.5 text-[14px] font-bold transition-colors disabled:opacity-50 " +
        cls +
        " " +
        (rest.className ?? "")
      }
    >
      {children}
    </button>
  );
}

export function StatusPill({ status }: { status: string }) {
  const published = status === "PUBLISHED";
  return (
    <span
      className={
        "rounded-full px-2.5 py-0.5 text-[12px] font-bold " +
        (published
          ? "bg-emerald-500/10 text-emerald-700"
          : "bg-black/[0.05] text-ink-2")
      }
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const r = await fetch("/api/admin/learn/image", { method: "POST", body });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "Could not upload that image.");
        return;
      }
      onChange(data.url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="text-[13px] font-bold uppercase tracking-wide text-ink-2">
        {label}
      </span>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-line bg-black/[0.02]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[11px] text-ink-2">None</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            tone="ghost"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button type="button" tone="ghost" onClick={() => onChange(null)}>
              Remove
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="mt-1 text-[12.5px] text-ink-2">{hint}</p>}
      {error && <p className="mt-1 text-[12.5px] text-red-700">{error}</p>}
    </div>
  );
}

export function vimeoPreview(ref: string | null | undefined): string | null {
  const raw = ref?.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return `https://player.vimeo.com/video/${raw}`;
  if (/player\.vimeo\.com\/video\/\d+/.test(raw)) {
    return raw.startsWith("http") ? raw : `https://${raw}`;
  }
  const m = /vimeo\.com\/(?:channels\/[^/]+\/)?(\d+)(?:\/([0-9a-z]+))?/i.exec(raw);
  if (m) return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}`;
  return null;
}

export function VideoField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const embed = vimeoPreview(value);
  const dirty = value.trim().length > 0;

  return (
    <div>
      <Field label={label} hint={hint}>
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://vimeo.com/123456789 — or just the id"
        />
      </Field>
      {dirty && !embed && (
        <p className="mt-1.5 text-[12.5px] font-semibold text-red-700">
          That isn&apos;t a Vimeo link or id we can play. Paste the video&apos;s
          URL from Vimeo, or its numeric id.
        </p>
      )}
      {embed && (
        <div className="mt-2">
          <div className="aspect-video w-full max-w-md overflow-hidden rounded-[10px] border border-line bg-black">
            <iframe
              src={embed}
              className="h-full w-full"
              allow="fullscreen; picture-in-picture"
              title="Video preview"
            />
          </div>
          <p className="mt-1 text-[12.5px] text-emerald-700">
            ✓ Plays as <span className="font-mono">{embed}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/** A modal for the create/edit forms. Escape and backdrop both close it. */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          "w-full rounded-brand bg-white p-6 shadow-xl " + (wide ? "max-w-3xl" : "max-w-xl")
        }
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-[20px] font-extrabold tracking-[-0.4px]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[20px] leading-none text-ink-2 hover:text-ink"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
