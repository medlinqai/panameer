"use client";

import Link from "next/link";
import { useState } from "react";

function shareLinks(url: string, text: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return [
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      /* ⚠⚠ SINGLE-COLOUR GLYPH PATHS, DRAWN IN `currentColor` — Scott,
         2026-10-02: Panameer style, NOT network brand colours. A brand-blue
         LinkedIn tile next to a square black button is three design systems on
         one row. ⚠ These are the networks' own marks in OUR ink. */
      path: "M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.6c0-1.34-.03-3.06-1.9-3.06-1.9 0-2.2 1.45-2.2 2.96V21H9z",
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      path: "M17.53 3H20.5l-6.49 7.42L21.64 21h-5.97l-4.68-6.1L5.6 21H2.63l6.94-7.93L2.36 3h6.12l4.23 5.6L17.53 3zm-1.04 16.2h1.65L7.6 4.72H5.83l10.66 14.48z",
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      path: "M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0022 12z",
    },
  ];
}

/**
 * ⚠⚠ THE OWNER'S SHARE BAR.
 *
 * ⚠⚠⚠ **PLAIN SHARE URLs, NO SDKs** — the brief says so and the reason is worth
 * keeping: a social SDK is third-party JavaScript that loads on a signed-in page
 * and can see it. ⚠ These are ordinary links; nothing is loaded and nothing is
 * told that a member opened their own profile.
 *
 * ⚠ `url` is the member's `/pro/<slug>` (`E738`, renamed `E756`), resolved on the SERVER. ⚠⚠ The
 * bar does not render without one — a Copy button with nothing behind it is the
 * defect, not a graceful degradation.
 */
export function ShareBar({ url, name }: { url: string | null; name: string }) {
  const [copied, setCopied] = useState(false);
  if (!url) return null;
  const text = `${name} on Panameer`;

  return (
    <section className="mt-8 border-t border-line pt-5">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        Share Your Profile
      </h2>

      {/* ⚠⚠ ONE LINE THAT SAYS WHY, VERBATIM FROM SCOTT (`P2-A1.1-E755`). The bar
          did not stand out partly because nothing told the member what it was
          FOR — three bare buttons under a grey eyebrow read as chrome. */}
      <p className="mt-1.5 text-[14px] text-ink">Share your profile where clients look for you.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/*
          ⚠⚠⚠ COPY LINK IS THE PRIMARY AND IT IS FILLED (`squareActions`,
          `phase_3_ui.md` rule 5): solid ink, white label, 4px radius. It was an
          OUTLINED button, which made it one of four identical tiles — Scott:
          *"should we color this? Just does not stand out."*
          ⚠ `min-h-[44px]` is the tap target, not decoration.
        */}
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* ⚠⚠ CLIPBOARD REFUSED (insecure context, permissions) — SELECT THE
                 URL INSTEAD, which is the brief's instruction and is a real
                 fallback: the member can still press ⌘C. ⚠ A copy affordance that
                 fails silently is worse than none. */
              const el = document.getElementById("share-url");
              if (el) {
                const r = document.createRange();
                r.selectNodeContents(el);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(r);
              }
            }
          }}
          className={
            "inline-flex min-h-[44px] items-center px-4 text-[13.5px] font-bold transition-opacity " +
            /* ⚠⚠ MAGENTA ONLY ON THE CONFIRMATION, and it is a STATUS, not a
               label — `Copied ✓` reports what just happened, so it is not Title
               Case under load-bearing rule 11. `Copy Link` names an action and
               is. */
            /* ⚠⚠⚠ `text-surface`, NOT `text-white` — MEASURED IN DARK MODE AND IT
               WAS WRONG. `--color-ink` INVERTS (`#272334` light → `#f2f0f7`
               dark) while `text-white` does not, so the first version rendered a
               near-white label on a near-white fill: sampled `rgb(242,240,247)`
               background with white text, effectively unreadable.
               ⚠ `bg-ink text-surface` is the pair that inverts TOGETHER —
               `#272334` on `#fff` in light, `#f2f0f7` on `#171128` in dark.
               ⚠⚠ **FIVE OTHER `bg-ink text-white` SITES EXIST AND HAVE THE SAME
               LATENT DEFECT.** They are REPORTED, not swept — Scott's rule is
               page by page, and this brief is the share bar. */
            (copied ? "bg-ink text-magenta" : "bg-ink text-surface hover:opacity-85")
          }
        >
          {copied ? "Copied ✓" : "Copy Link"}
        </button>

        {shareLinks(url, text).map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            /* ⚠ `noopener` is the security half and `noreferrer` the privacy
               half; a `target="_blank"` without them hands the opened page a
               handle on this one. */
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 border border-ink bg-surface px-3.5 text-[13.5px] font-bold text-ink transition-colors hover:bg-ink/5"
          >
            {/* ⚠ `fill="currentColor"` is what keeps the mark in INK and makes it
                follow dark mode — a hard-coded brand hex would not. */}
            <svg viewBox="0 0 24 24" aria-hidden className="h-[17px] w-[17px] shrink-0" fill="currentColor">
              <path d={s.path} />
            </svg>
            {s.label}
          </a>
        ))}
      </div>

      {/*
        ⚠⚠ THE URL IS SHOWN, NOT HIDDEN BEHIND THE BUTTON — it is what the member
        pastes into an email signature, and they need to see it.
        ⚠⚠⚠ **IN INK AT BODY SIZE** (`E755`): it was `text-[12px] text-ink-3`, a
        faint grey that read as a disabled caption. ⚠ `https://` is stripped for
        display only — `panameer.com/pro/scott-walls` is what a person says out
        loud — while the BUTTON still copies the full absolute URL, because a
        pasted link without a scheme is not a link.
      */}
      <p id="share-url" className="mt-3 break-all text-[14px] text-ink">
        {url.replace(/^https?:\/\//, "")}
      </p>
    </section>
  );
}

export function HowToWorkWith({
  firstName,
  hireHref,
  describeHref,
}: {
  firstName: string;
  hireHref: string;
  describeHref: string;
}) {
  const who = firstName.trim() || "this provider";
  return (
    <section className="mt-8 border-t border-line pt-5">
      <h2 className="font-display text-[17px] font-bold">How to work with {who}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {/* ── (a) ── */}
        <div className="rounded-brand border border-ink bg-ink p-4 text-white">
          <h3 className="text-[14.5px] font-bold">Hire {who} now</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-white/80">
            {}
            Request {who} directly. You can be under contract in minutes.
          </p>
          <Link
            href={hireHref}
            className="mt-3 inline-block bg-white px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-white/90"
          >
            Hire {who}
          </Link>
        </div>

        {/* ── (b) ── */}
        <div className="rounded-brand border border-line bg-white p-4">
          <h3 className="text-[14.5px] font-bold">Describe what you need</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
            {}
            Post your work and see providers whose skills match.
          </p>
          <Link
            href={describeHref}
            className="mt-3 inline-block border border-ink px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-bg-soft"
          >
            Describe What You Need
          </Link>
        </div>
      </div>
      {}
      <p className="mt-3 text-[12.5px] text-ink-2">
        Then: review the proposal &rarr; start the work.
      </p>
    </section>
  );
}
