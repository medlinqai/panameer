"use client";

import { useState, type ReactNode } from "react";

/**
 * The small pieces every Settings page uses (J2.4 WS-H).
 *
 * Extracted after the third page repeated the same toggle row and the same
 * save-and-report dance. Nothing here is clever; the point is that eight pages
 * agree on what a switch looks like and on what happens when a save fails,
 * because a settings area where each page invents its own answer to that is the
 * one place users notice inconsistency immediately.
 */

export function Card({
  title,
  description,
  children,
  tone = "plain",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "plain" | "dashed";
}) {
  return (
    <section
      className={
        "rounded-brand p-5 " +
        (tone === "dashed"
          ? "border border-dashed border-line"
          : "border border-line bg-white")
      }
    >
      <h2 className="font-display text-[16px] font-bold">{title}</h2>
      {description && (
        <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
          {description}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * A labelled switch that saves itself.
 *
 * OPTIMISTIC WITH A REVERT, the same contract the persona menu's availability
 * toggle uses: a switch that waits for a round trip feels broken, and one that
 * stays flipped after a failed write tells the user something untrue about
 * their own account.
 */
export function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  disabledReason,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onChange: (next: boolean) => Promise<boolean>;
}) {
  const [value, setValue] = useState(checked);
  const [busy, setBusy] = useState(false);

  const flip = async () => {
    if (disabled || busy) return;
    const next = !value;
    setValue(next);
    setBusy(true);
    const ok = await onChange(next);
    if (!ok) setValue(!next);
    setBusy(false);
  };

  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-[14.5px] font-semibold">{label}</p>
        {hint && (
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{hint}</p>
        )}
        {disabled && disabledReason && (
          <p className="mt-0.5 text-[12.5px] font-semibold text-magenta">
            {disabledReason}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        disabled={disabled || busy}
        onClick={flip}
        className={
          "relative mt-0.5 h-[22px] w-10 shrink-0 rounded-full transition-colors disabled:opacity-40 " +
          (value ? "bg-magenta" : "bg-line")
        }
      >
        <span
          className={
            "absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all " +
            (value ? "left-[21px]" : "left-[3px]")
          }
        />
      </button>
    </div>
  );
}

/** A text input with a label, used by every form here. */
export function Input({
  label,
  hint,
  ...rest
}: {
  label: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-bold">{label}</span>
      <input
        {...rest}
        className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px] outline-none focus:border-magenta disabled:bg-black/[0.03] disabled:text-ink-2"
      />
      {hint && <span className="mt-1 block text-[12.5px] text-ink-2">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  hint,
  children,
  ...rest
}: {
  label: string;
  hint?: string;
  children: ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-bold">{label}</span>
      <select
        {...rest}
        className="w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-magenta"
      >
        {children}
      </select>
      {hint && <span className="mt-1 block text-[12.5px] text-ink-2">{hint}</span>}
    </label>
  );
}

/** Primary action + inline result. One place decides what "saved" looks like. */
export function SaveBar({
  onSave,
  label = "Save",
  disabled,
}: {
  onSave: () => Promise<string | null>;
  label?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={busy || disabled}
        onClick={async () => {
          setBusy(true);
          setSaved(false);
          setError(null);
          const err = await onSave();
          setError(err);
          setSaved(!err);
          setBusy(false);
        }}
        className="rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
      >
        {busy ? "Saving…" : label}
      </button>
      {saved && (
        <span className="text-[13.5px] font-semibold text-emerald-600">✓ Saved</span>
      )}
      {error && <span className="text-[13.5px] text-red-700">{error}</span>}
    </div>
  );
}

/**
 * POST helper shared by every settings form.
 *
 * Returns null on success and the server's message otherwise, which is the
 * shape `SaveBar` and `ToggleRow` both want — and it means no page hand-rolls
 * its own idea of what a failed save looks like.
 */
export async function postSetting(
  url: string,
  body: unknown
): Promise<string | null> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return data.error ?? "We couldn't save that.";
    return null;
  } catch {
    return "We couldn't reach the server.";
  }
}
