"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

/**
 * Focused onboarding chrome: logo top-left, a magenta progress bar, the step
 * content, and a Back/Continue footer. Deliberately NO app or marketing nav —
 * this is a full-screen flow (per the onboarding decks + brief_E layout rule).
 */
export function WizardShell({
  progress,
  title,
  subtitle,
  children,
  onBack,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
  busy = false,
  canBack = true,
  secondaryLabel,
  onSecondary,
  hideFooter = false,
}: {
  progress: number; // 0..1
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  busy?: boolean;
  canBack?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  hideFooter?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      <header className="border-b border-line px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center">
          <Link href="/" aria-label="Panameer home">
            <Image
              src="/brand/panameer-logo.png"
              alt="Panameer"
              width={786}
              height={111}
              priority
              className="h-8 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Progress */}
      <div className="h-1.5 w-full bg-line" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
        <div
          className="h-full bg-magenta transition-[width] duration-300"
          style={{ width: `${Math.max(4, Math.min(100, progress * 100))}%` }}
        />
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10 sm:py-14">
        <div className="flex-1">
          <h1 className="text-[28px] font-extrabold tracking-[-0.6px] sm:text-[34px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-xl text-[17px] text-ink-2">{subtitle}</p>
          )}
          <div className="mt-8">{children}</div>
        </div>

        {!hideFooter && (
          <div className="mt-10 flex items-center gap-3 border-t border-line pt-6">
            {canBack && onBack && (
              <button
                onClick={onBack}
                disabled={busy}
                className="rounded-full border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
              >
                Back
              </button>
            )}
            {secondaryLabel && onSecondary && (
              <button
                onClick={onSecondary}
                disabled={busy}
                className="rounded-full px-4 py-3 font-bold text-ink-2 transition-colors hover:text-magenta disabled:opacity-50"
              >
                {secondaryLabel}
              </button>
            )}
            {onContinue && (
              <button
                onClick={onContinue}
                disabled={continueDisabled || busy}
                className="ml-auto rounded-full bg-magenta px-8 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
              >
                {busy ? "Saving…" : continueLabel}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
