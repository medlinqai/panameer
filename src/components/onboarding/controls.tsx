"use client";

import type { ReactNode } from "react";

/** A large selectable card (single- or multi-select option). */
export function OptionCard({
  selected,
  onClick,
  title,
  description,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "w-full border p-5 text-left transition-colors " +
        (selected
          ? "border-ink bg-surface"
          : "border-line hover:bg-surface-hover") +
        " " +
        className
      }
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={
            "mt-0.5 grid h-[18px] w-[18px] flex-none place-items-center border-[1.5px] text-[11px] font-black text-white " +
            (selected ? "border-ink bg-ink text-surface" : "border-ink bg-transparent")
          }
        >
          {selected ? "✓" : ""}
        </span>
        <span className="min-w-0">
          <span className="block font-bold">{title}</span>
          {description && (
            <span className="mt-0.5 block text-[14.5px] text-ink-2">
              {description}
            </span>
          )}
        </span>
      </div>
    </button>
  );
}

/** A toggle chip (used for multi-select skills / work types). */
export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "inline-flex items-center gap-2 border px-4 py-2 text-[14.5px] font-semibold transition-colors " +
        (selected
          ? "border-ink bg-ink text-surface"
          : "border-line text-ink-2 hover:border-ink hover:text-ink")
      }
    >
      {children}
      <span aria-hidden>{selected ? "✓" : "+"}</span>
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[13px] text-ink-2">{hint}</span>}
    </label>
  );
}

const INPUT =
  "w-full border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT} ${props.className ?? ""}`} />;
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea {...props} className={`${INPUT} min-h-32 ${props.className ?? ""}`} />
  );
}

/** Inline error / info banner. */
export function Notice({
  tone = "error",
  children,
}: {
  tone?: "error" | "info";
  children: ReactNode;
}) {
  return (
    <div
      className={
        "border px-4 py-3 text-[14px] " +
        (tone === "error"
          ? "border-red-600/20 bg-red-600/5 text-red-700"
          : "border-magenta/25 bg-magenta/5 text-magenta-dark")
      }
    >
      {children}
    </div>
  );
}
