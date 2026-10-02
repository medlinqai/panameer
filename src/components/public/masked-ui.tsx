import Link from "next/link";
import type { ReactNode } from "react";

/**
 * ── ⚠⚠ THE PUBLIC PREVIEW'S OWN SMALL UI KIT (`P2-A1.1-E738`) ─────────────
 *
 * ⚠⚠ **WHY NOT `Btn` FROM `components/marketing/brand.tsx`:** the approved
 * mockup draws SQUARE buttons (4px) with a solid INK primary, and `Btn`'s
 * primary is a pill-ish magenta. ⚠ Changing `Btn` is the app-wide style pass
 * (super run 2's **B1**), which Scott listed under *"Not in this run"* — so
 * restyling the shared component here would reach 19 public pages inside a
 * brief about talent masking.
 *
 * ⚠⚠⚠ **SO THIS IS SCOPED TO THE MASKED SURFACES AND IS DELIBERATELY SMALL.**
 * When B1 lands, these two components should be DELETED and replaced by the one
 * button component — they exist to avoid pre-empting that decision, not to
 * compete with it.
 * ⚠ The brief's rule is obeyed: *"Square buttons, Montserrat, magenta for chips
 * and links only."*
 */

const SQUARE =
  "inline-flex items-center justify-center rounded-[4px] px-[18px] py-2.5 " +
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

/**
 * ⚠ A magenta-outlined chip. Skills, certifications and industries.
 * ⚠⚠ `box-shadow: inset` RATHER THAN A BORDER, per the mockup — a 1px border
 * on a 3px-padded pill shifts the text baseline by a hair and the chips stop
 * sitting on one line.
 */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full px-2.5 py-[3px] text-[11.5px] font-medium text-magenta-dark shadow-[inset_0_0_0_1px_var(--color-magenta)] dark:text-magenta">
      {children}
    </span>
  );
}

/**
 * ⚠⚠ THE LOCK LINE. It says WHAT is withheld and WHAT unlocks it, in that
 * order, and never implies the member is incomplete.
 * ⚠ The icon is inline SVG: this surface is reached signed out and must not
 * wait on an icon font.
 */
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

/**
 * ⚠⚠⚠ THE PLACEHOLDER AVATAR — AND IT IS A **DRAWING**, NOT AN IMAGE.
 *
 * ⚠ There is no `src`, because there is no photo URL in the payload to put in
 * one. ⚠⚠ That is the mask working as designed: the brief requires that a masked
 * value is *"never sent to the browser: not in the HTML, not in JSON, not in
 * props, not in image URLs, not in `alt` text or metadata."*
 * ⚠⚠⚠ **DO NOT REPLACE THIS WITH `<Avatar>`.** That component takes a first and
 * last name to build its initials and its `alt` text — i.e. it would leak the
 * masked name through an accessibility attribute, which is the exact mistake
 * `lib/explore.ts` documents having avoided on the teaser cards.
 */
export function MaskedAvatar({ size = 48, blur }: { size?: number; blur?: string | null }) {
  if (blur) {
    return (
      /*
        ⚠⚠⚠ THE BLUR IS NOT WHAT HIDES THE FACE — THE DOWNSCALE IS (`E767`).
        `blur` is a 16px-wide JPEG inlined as a `data:` URI; the detail was thrown
        away on the server before these bytes existed. ⚠ The CSS `blur()` here is
        **cosmetic smoothing of the upscale**, not a mask, and removing it would
        reveal nothing but a blockier version of the same 250 pixels.
        ⚠⚠ That ordering is the whole difference from the thing this must never
        be: a real photo under `filter: blur()`, which is one dev-tools toggle and
        one network-tab entry from being undone.
      */
      <span
        className="block shrink-0 overflow-hidden rounded-full border border-line dark:border-white/15"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blur}
          alt=""
          width={size}
          height={size}
          className="h-full w-full scale-110 object-cover blur-[3px]"
        />
      </span>
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-line bg-bg-soft dark:border-white/15 dark:bg-white/5"
      style={{ width: size, height: size }}
      /* ⚠ Decorative: it carries no information about who this is, so naming it
         for a screen reader would only add noise. The title beside it is the
         accessible label for the card. */
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="fill-none stroke-ink-3 stroke-[1.6]"
        style={{ width: size * 0.46, height: size * 0.46 }}
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    </span>
  );
}

/** The square hero placeholder on the profile preview. */
export function MaskedAvatarLarge({ blur }: { blur?: string | null } = {}) {
  if (blur) {
    return (
      <div
        className="aspect-square w-full max-w-[160px] overflow-hidden rounded-[4px] border border-line sm:max-w-none dark:border-white/15"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={blur} alt="" className="h-full w-full scale-110 object-cover blur-[10px]" />
      </div>
    );
  }
  return (
    <div
      className="flex aspect-square w-full max-w-[160px] items-center justify-center rounded-[4px] border border-line bg-bg-soft sm:max-w-none dark:border-white/15 dark:bg-white/5"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-[72px] w-[72px] fill-none stroke-ink-3 stroke-[1.2]">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    </div>
  );
}


/**
 * ── ⚠⚠⚠ A FIELD THAT IS THERE, AND BLURRED (`P2-A1.1-E767`) ────────────────
 *
 * ⚠ **SCOTT, 2026-10-02:** *"maybe all that info, but blurry."*
 *
 * ⚠⚠⚠ **WHAT IS BLURRED HERE IS A CONSTANT, NEVER THE PERSON'S VALUE.** The
 * strings come from `PLACEHOLDER` in `lib/masked-photo.ts` — fixed length, fixed
 * alphabet, identical for every member. ⚠⚠ **A SAME-LENGTH SCRAMBLE WAS
 * CONSIDERED AND RULED OUT BY SCOTT**, because the character count of a name is
 * itself a narrowing: over a grid, a length plus a job title is often one person.
 * ⚠ Shuffling the real letters would be worse again — it preserves the multiset,
 * which is nearly an anagram.
 *
 * ⚠⚠ **SO THE DOM IS SAFE TO READ.** Select-all, view-source and dev tools all
 * return the same invented string for everybody, which is the property a
 * CSS-blurred real value can never have.
 *
 * ⚠ `aria-hidden` with a stated reason beside it: a screen reader announcing
 * `Anskeld Marrowen` would be inventing a person. The `label` is what it hears.
 */
export function BlurredField({
  children,
  label,
  className = "",
}: {
  children: ReactNode;
  /** ⚠ What a screen reader hears instead — the TRUTH, not the placeholder. */
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
