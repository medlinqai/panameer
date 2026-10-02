"use client";

import { useState } from "react";
import { IS_PRELAUNCH } from "@/lib/site-status";

/**
 * "You're early" — the pre-launch notice
 * (brief_catalog_renames_and_dev_banner WS-B).
 *
 * Real visitors are reaching sign-up on a site that still gets reseeded, so the
 * honest thing is to say so before they invest anything in an account. The tone
 * is the point: this is an invitation with a caveat, not an outage notice. No
 * warning triangle, no amber, no full-bleed alarm bar — a thin tinted strip that
 * reads as part of the brand.
 *
 * IN THE DOCUMENT FLOW, ABOVE EVERYTHING. It sits at the top of <body>, so it
 * pushes both shells down instead of overlaying either. That matters for the
 * marketing header, which is `sticky top-0 z-50`: the banner scrolls away, the
 * header then sticks to the top of the viewport as it always did, and at no
 * point does either cover the nav.
 *
 * DISMISSAL IS IN-MEMORY, which is the brief's own call. The root layout is not
 * remounted on client-side navigation, so this state survives every in-app link
 * — but a full page load brings the banner back. That is the trade for NOT
 * reading a cookie in the root layout, which would opt all 206 statically
 * rendered pages into dynamic rendering to remember one boolean.
 */
export function DevBanner() {
  const [dismissed, setDismissed] = useState(false);

  // Read at module scope from NEXT_PUBLIC_SITE_STATUS, so the whole component
  // tree-shakes out of a launched build rather than rendering hidden.
  if (!IS_PRELAUNCH || dismissed) return null;

  return (
    <div
      data-dev-banner
      /*
        ⚠ CORRECTION (E017). An earlier version of this comment claimed
        `bg-magenta/[0.07]` compiles to no rule under Tailwind v4. THAT WAS
        WRONG. It compiles fine — the "evidence" was a grep whose pattern could
        not match the escaped selector Tailwind emits (`.bg-magenta\/\[0\.07\]`,
        where the decimal point is backslash-escaped too), so a present rule
        read as an absent one.

        `/8` is kept only because it is the shorter way to write the same thing.
        Nothing here was broken and nothing needed fixing.
      */
      className="border-b border-magenta/20 bg-magenta/8 px-4 py-2 text-ink sm:px-6"
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-3">
        <span
          aria-hidden="true"
          className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-magenta sm:block"
        />
        <p className="min-w-0 flex-1 text-[13px] leading-snug">
          <span className="font-bold">Panameer is in active development</span>
          {/*
            ── ⚠⚠⚠ THE RESET PROMISE IS GONE (`P2-A4-E606` R5) ────────────────

            ⚠ IT READ: *"accounts and data may be reset while we build."*
            ⚠⚠ A REAL EXTERNAL TESTER STARTS TODAY AND HAS BEEN TOLD HIS DATA
            WILL NOT BE WIPED. The banner contradicted that promise on every
            page he would open, and **the promise to the person governs.**
            ⚠⚠⚠ THE REPLACEMENT PROMISES NOTHING ABOUT DATA IN EITHER
            DIRECTION — not "may be reset", and not "your data is safe" either.
            Scott: *"no absolutes and no promise about data either way."* The
            honest thing to say is that the product is early.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   — you&apos;re early. Look around, but accounts and data may be reset
            //   while we build.
          */}
          <span className="text-ink-2">
            {" "}
            — you&apos;re early, so expect rough edges.
          </span>
          {/*
            ── ⚠⚠ FOLLOW THE BUILD (`P2-ALL-E754`) ──────────────────────────────

            ⚠ Scott, 2026-10-02: *"yes to the link."* It points at
            `status.panameer.com`, the public Work Tracker — the page whose whole
            job is to give a tester somewhere to come back to daily.

            ⚠⚠ **THE COPY IS EXACTLY `Follow the build →` AND THE ARROW IS PART OF
            IT.** Not a separate glyph, not an icon: one string, so it cannot
            drift apart from its own punctuation across a wrap.

            ⚠ **MAGENTA AND UNDERLINED** — the one place magenta is correct is a
            LINK (`E433`), which is what this is. ⚠ It is NOT a button, so Title
            Case does not apply (load-bearing rule 11 governs button labels; link
            text has its own casing).

            ⚠⚠ **AN ABSOLUTE URL, NOT A ROUTE.** `/status` would keep the visitor
            on whichever host they are already on; the point is to send them to
            the status domain. ⚠ `target="_blank"` with `rel="noreferrer"` so the
            tester does not lose the page they were testing.

            ⚠ `DevBanner` renders from the ROOT layout, so this one edit covers the
            public site and the app, as the brief requires. Dismiss is unchanged.
          */}
          <a
            href="https://status.panameer.com"
            target="_blank"
            rel="noreferrer"
            className="ml-2 whitespace-nowrap font-semibold text-magenta underline underline-offset-4"
          >
            Follow the build →
          </a>
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          /*
            A dismiss control has to be reachable and readable at 13px, so it is
            a labelled text button rather than a bare ×. `whitespace-nowrap`
            keeps it on one line when the copy wraps on a narrow phone.
          */
          className="shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[12.5px] font-semibold text-ink-2 underline underline-offset-4 transition-colors hover:text-magenta"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
