"use client";

import type { ReactNode } from "react";
import { Notice } from "@/components/onboarding/controls";

/** A settings card with a title, editable body, and a per-section Save. */
export function Section({
  title,
  description,
  children,
  onSave,
  saving,
  saved,
  error,
  saveLabel = "Save",
  saveDisabled = false,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
  error?: string | null;
  saveLabel?: string;
  saveDisabled?: boolean;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-brand border border-line p-6">
      <h2 className="text-[18px] font-bold">{title}</h2>
      {description && (
        <p className="mt-1 text-[14.5px] text-ink-2">{description}</p>
      )}
      <div className="mt-4">{children}</div>
      {error && (
        <div className="mt-4">
          <Notice>{error}</Notice>
        </div>
      )}
      {(onSave || footer) && (
        <div className="mt-5 flex items-center gap-3">
          {footer}
          {onSave && (
            <>
              {saved && !saving && (
                <span className="text-[14px] font-semibold text-emerald-600">
                  Saved ✓
                </span>
              )}
              <button
                onClick={onSave}
                disabled={saving || saveDisabled}
                className="ml-auto rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
              >
                {saving ? "Saving…" : saveLabel}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
