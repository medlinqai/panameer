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
        "w-full rounded-brand border-2 p-5 text-left transition-all " +
        (selected
          ? "border-magenta bg-magenta/[0.04] shadow-brand"
          : "border-line hover:border-[#d9d4e2]") +
        " " +
        className
      }
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={
            "mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full border-2 text-[11px] font-black text-white " +
            (selected ? "border-magenta bg-magenta" : "border-line bg-transparent")
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
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14.5px] font-semibold transition-colors " +
        (selected
          ? "border-magenta bg-magenta text-white"
          : "border-line text-ink-2 hover:border-[#d9d4e2] hover:text-ink")
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
  "w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta";

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
        "rounded-[12px] border px-4 py-3 text-[14px] " +
        (tone === "error"
          ? "border-red-600/20 bg-red-600/5 text-red-700"
          : "border-magenta/25 bg-magenta/5 text-magenta-dark")
      }
    >
      {children}
    </div>
  );
}
