import Link from "next/link";
import type { ReactNode } from "react";
import { NeutralAvatar } from "@/components/Avatar";

/** THE PUBLIC PREVIEW'S OWN SMALL UI KIT */

const SQUARE =
  "inline-flex items-center justify-center px-[18px] py-2.5 " +
  "text-[13.5px] font-semibold transition-colors";

/** Solid ink. One per view — the thing we want pressed. */
export function PublicPrimary({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${SQUARE} border border-ink bg-ink text-white hover:bg-ink/90 ${className}`}
    >
      {children}
    </Link>
  );
}

/** White with an ink border. Everything else. */
export function PublicSecondary({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${SQUARE} border border-ink bg-white text-ink hover:bg-bg-soft dark:bg-transparent dark:text-white dark:border-white/60 ${className}`}
    >
      {children}
    </Link>
  );
}

/** A magenta-outlined chip. Skills, certifications and industries. */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full px-2.5 py-[3px] text-[11.5px] font-medium text-magenta-dark shadow-[inset_0_0_0_1px_var(--color-magenta)] dark:text-magenta">
      {children}
    </span>
  );
}

/** THE LOCK LINE. It says WHAT is withheld and WHAT unlocks it, in that */
export function LockLine({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
      <svg viewBox="0 0 24 24" aria-hidden className="h-[13px] w-[13px] shrink-0 fill-none stroke-current stroke-2">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      {children}
    </span>
  );
}

/** NA-E001: the neutral avatar — never the photo, not even blurred. */
export function MaskedAvatar({ size = 48 }: { size?: number }) {
  return <NeutralAvatar size={size} />;
}

/** The square hero avatar on the profile preview. */
export function MaskedAvatarLarge() {
  return (
    <div data-neutral-avatar className="flex aspect-square w-full max-w-[160px] items-center justify-center rounded-[4px] bg-ink sm:max-w-none" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-[72px] w-[72px] fill-none stroke-white stroke-[1.2]">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    </div>
  );
}

/** A FIELD THAT IS THERE, AND BLURRED */
export function BlurredField({
  children,
  label,
  className = "",
}: {
  children: ReactNode;
  /** What a screen reader hears instead — the TRUTH, not the placeholder. */
  label: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span className="sr-only">{label}</span>
      <span aria-hidden className="select-none blur-[4px]">
        {children}
      </span>
    </span>
  );
}
