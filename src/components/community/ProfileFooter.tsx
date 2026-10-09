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
      // SINGLE-COLOUR GLYPH PATHS, DRAWN IN `currentColor` — Scott
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

/** THE OWNER'S SHARE BAR. */
export function ShareBar({ url, name }: { url: string | null; name: string }) {
  const [copied, setCopied] = useState(false);
  if (!url) return null;
  const text = `${name} on Panameer`;

  return (
    <section className="mt-8 border-t border-line pt-5">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        Share Your Profile
      </h2>

      {/* ONE LINE THAT SAYS WHY, VERBATIM FROM SCOTT . The bar */}
      <p className="mt-1.5 text-[14px] text-ink">Share your profile where clients look for you.</p>

      {/* M-E012: one row of four equal buttons — icon + short label, icon only under 360px. */}
      <div data-share-row className="mt-3 grid grid-cols-4 gap-2">
        {/* COPY LINK IS THE PRIMARY AND IT IS FILLED (`squareActions` */}
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // CLIPBOARD REFUSED (insecure context, permissions) — SELECT THE
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
            "inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 px-2 text-[13.5px] font-bold transition-opacity " +
            // MAGENTA ONLY ON THE CONFIRMATION, and it is a STATUS, not a
            // WAS WRONG. `--color-ink` INVERTS (`#272334` light → `#f2f0f7`
            (copied ? "bg-ink text-magenta" : "bg-ink text-surface hover:opacity-85")
          }
        >
          <svg viewBox="0 0 24 24" aria-hidden className="h-[17px] w-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1.2-1.2" /></svg>
          <span className="truncate max-[359px]:sr-only">{copied ? "Copied ✓" : "Copy"}</span>
        </button>

        {shareLinks(url, text).map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            // half; a `target="_blank"` without them hands the opened page a
            rel="noopener noreferrer"
            aria-label={`Share on ${s.label}`}
            className="inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 border border-ink bg-surface px-2 text-[13.5px] font-bold text-ink transition-colors hover:bg-ink/5"
          >
            {/* follow dark mode — a hard-coded brand hex would not. */}
            <svg viewBox="0 0 24 24" aria-hidden className="h-[17px] w-[17px] shrink-0" fill="currentColor">
              <path d={s.path} />
            </svg>
            <span className="truncate max-[359px]:sr-only">{s.label}</span>
          </a>
        ))}
      </div>

      {/* THE URL IS SHOWN, NOT HIDDEN BEHIND THE BUTTON — it is what the member */}
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
