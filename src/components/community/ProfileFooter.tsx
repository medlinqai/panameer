"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * ── ⚠⚠ THE PROFILE FOOTER — `P2-A1.1-E743` (super run 2 B3, lane 5) ───────
 *
 * ⚠ Two different things under one roof, and they never both render: the OWNER
 * gets a share bar, a VISITOR who can buy gets two ways to start work.
 *
 * ⚠⚠⚠ **IT SHIPS AFTER LANE 4 ON PURPOSE** (the super run says so): the share
 * bar hands out `/in/<slug>`, and until `E738` that URL opened a sign-in screen.
 * ⚠ **A SHARE BAR THAT SHARES A LOGIN WALL IS WORSE THAN NO SHARE BAR** — the
 * person who clicks it learns only that they are not welcome.
 */

/** ⚠ Plain share URLs, no SDKs — the brief. See `ShareBar`. */
function shareLinks(url: string, text: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
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
 * ⚠ `url` is the member's `/in/<slug>` (`E738`), resolved on the SERVER. ⚠⚠ The
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
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* ⚠ Clipboard refused (insecure context, permissions). The URL is
                 visible beside this button, so there is always a way to get it —
                 a copy affordance that fails silently is worse than none. */
            }
          }}
          className="rounded-[4px] border border-ink px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-bg-soft"
        >
          {copied ? "Copied" : "Copy Link"}
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
            className="rounded-[4px] border border-line px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 hover:border-magenta hover:text-magenta"
          >
            {s.label}
          </a>
        ))}
      </div>
      {/* ⚠⚠ THE URL IS SHOWN, NOT HIDDEN BEHIND THE BUTTON — it is what the
          member pastes into an email signature, and they need to see it. */}
      <p className="mt-2 break-all text-[12px] text-ink-3">{url}</p>
    </section>
  );
}

/**
 * ── ⚠⚠⚠ THE VISITOR'S TWO PATHS — "How to work with <first name>" ─────────
 *
 * ⚠ **BUYERS ONLY** (`canHireTalent`), which the PAGE decides and passes in —
 * the same capability the Hire button and the API route both read.
 *
 * ⚠⚠ **NO CLAIMS ABOUT PAYMENT, TRIALS OR GUARANTEES** (the brief). Nothing
 * here says what anything costs, how fast money moves, or that anything is
 * refundable, because none of that is built.
 */
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
            {/* ⚠ `E719`'s flow, which exists. The sentence describes the SHAPE
                of the step, not a duration anybody guaranteed. */}
            Request {who} directly. You can be under contract in minutes.
          </p>
          <Link
            href={hireHref}
            className="mt-3 inline-block rounded-[4px] bg-white px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-white/90"
          >
            Hire {who}
          </Link>
        </div>

        {/* ── (b) ── */}
        <div className="rounded-brand border border-line bg-white p-4">
          <h3 className="text-[14.5px] font-bold">Describe what you need</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
            {/*
              ── ⚠⚠⚠ THE WORDING IS LANE 5'S CORRECTION, AND THE REASON IS A
                    MEASUREMENT ────────────────────────────────────────────────

              ⚠ Super run 2's B3 drafted *"Post your work and see **every**
              provider with matching skills."* ⚠⚠ **`_SUPER_RUN_2026-10-01b`
              CORRECTS IT TO THIS LINE BECAUSE "EVERY PROVIDER" IS NOT TRUE:
              only 3 of 60 profiles have skill weights today**, so a buyer told
              they will see every match would meet a handful and conclude the
              marketplace is empty.
              ⚠⚠⚠ **"WHOSE SKILLS MATCH" PROMISES THE FILTER, NOT THE
              COVERAGE** — which is exactly what the feature does.
            */}
            Post your work and see providers whose skills match.
          </p>
          <Link
            href={describeHref}
            className="mt-3 inline-block rounded-[4px] border border-ink px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-bg-soft"
          >
            Describe What You Need
          </Link>
        </div>
      </div>
      {/* ⚠⚠ THE TWO STEPS AFTER EITHER PATH, NAMED SO THE BUYER KNOWS WHAT
          HAPPENS NEXT. ⚠ No timing, no guarantee, no price. */}
      <p className="mt-3 text-[12.5px] text-ink-2">
        Then: review the proposal &rarr; start the work.
      </p>
    </section>
  );
}
