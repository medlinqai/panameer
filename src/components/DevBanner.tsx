"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { IS_PRELAUNCH } from "@/lib/site-status";
import { isStatusHost } from "@/lib/host";

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

  /**
   * ── ⚠⚠⚠ THE BAND IS CONTEXT-AWARE (Scott, 2026-10-03, `P2-ALL-E787`) ───────
   *
   * ⚠ **ON THE TRACKER:** pitch line · `Join free` (signed-out only) ·
   * `See the full site →`.
   * ⚠ **EVERYWHERE ELSE, INCLUDING INSIDE THE SIGNED-IN APP:** pitch line ·
   * `Follow the build →`.
   * ⚠⚠ **`Join free` IS NEVER SHOWN TO A SIGNED-IN MEMBER** — the same rule, and
   * the same signal, that `MarketingHeader` uses to drop `Sign Up` (`E045`).
   *
   * ⚠⚠⚠ **WHY THIS IS RESOLVED ON THE CLIENT AND NOT PASSED DOWN FROM THE
   * LAYOUT:** reading `headers()` in the root layout to learn the host would opt
   * **every statically rendered page** into dynamic rendering — this component's
   * own header already rules that out for one boolean, and it is more true now
   * that the answer is needed on every page rather than one.
   */
  const pathname = usePathname();

  /**
   * ⚠⚠ ONLY `/` IS AMBIGUOUS, AND NARROWING IT TO THAT IS WHAT AVOIDS A FLASH.
   *
   * · `/status` → the tracker, known during SSR on every host.
   * · anything else → not the tracker, known during SSR.
   * · `/` → could be the marketing home OR the status host's root, because the
   *   proxy REWRITES `/` to `/status` there, so the browser's path stays `/`.
   *
   * ⚠⚠⚠ **IN THAT ONE CASE THE LINKS WAIT A TICK RATHER THAN GUESSING.** Showing
   * `Follow the build →` on the tracker — a link to the page you are on — then
   * swapping it, is worse than showing the pitch line alone for one frame.
   * ⚠ `window.location` cannot be read during render without a hydration
   * mismatch, so it is read in an effect.
   */
  const [hostKnown, setHostKnown] = useState<string | null>(null);
  useEffect(() => {
    /** ⚠ `queueMicrotask` defers the write off the effect body — a bare
     *  `setState` here is the `react-hooks/set-state-in-effect` error this repo
     *  carries eleven of already and adds none to. */
    queueMicrotask(() => setHostKnown(window.location.host));
  }, []);

  const onTracker: boolean | null =
    pathname === "/status"
      ? true
      : pathname !== "/"
        ? false
        : hostKnown === null
          ? null
          : isStatusHost(hostKnown);



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
          {/*
            ── ⚠⚠⚠ THE BAND SAYS WHAT PANAMEER *IS* (`P2-ALL-E787`, Scott 2026-10-03) ──

            ⚠ **IT HAD TO CHANGE BECAUSE THE FRONT DOOR CHANGED.** Until R1,
            `panameer.com/` 307s to the tracker, so for most arrivals this band is
            the only sentence on screen that says what the product is. *"Panameer
            is in active development"* told a stranger the state of the thing
            without ever telling them what the thing was.
            ⚠⚠ **IT STILL SAYS THE SITE IS EARLY — VIA THE BETA DATE, WHICH IS A
            FACT RATHER THAN A HEDGE.** No absolutes and no promise about data in
            either direction (`E606` R5's standing rule).
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   <span className="font-bold">Panameer is in active development</span>
            //   <span className="text-ink-2"> - you&apos;re early, so expect rough edges.</span>
          */}
          <span className="font-bold">Panameer is the Oracle Cloud marketplace</span>
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
            — hire providers, buy service products and settle the work in one place. Public beta
            opens November&nbsp;15.
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
          {/*
            ── ⚠⚠ THE LINKS DEPEND ON WHERE THE BAND IS (Scott, 2026-10-03) ─────

            ⚠⚠⚠ **`See the full site →` IS THE ONLY WAY OFF THE TRACKER TO THE
            MARKETING SITE once `/` redirects.** Without it the switch hides
            twenty sections of work behind a URL nobody has been told. It points
            at `/home`, the SAME component `/` renders, registered public in
            `route-access` because the default is DENY.

            ⚠⚠ **`Follow the build →` IS BACK, AND ON THE TRACKER IT IS CORRECTLY
            ABSENT.** An earlier `E787` draft replaced it everywhere; Scott ruled
            that it belongs on every page EXCEPT the tracker — on the tracker it
            is a link to the current page, and in the app it is still the one
            door to the build.
            ⚠ SUPERSEDED, quoted not deleted (`E164`) — the draft that dropped it
            from every surface:
            //   <a href="/join" …>Join free</a>
            //   <span aria-hidden …>·</span>
            //   <a href="/home" …>See the full site -&gt;</a>

            ⚠ **MAGENTA AND UNDERLINED** — a link is the one place magenta is
            correct (`E433`). ⚠ They are LINKS, not buttons, so load-bearing rule
            11's Title Case does not apply.
            ⚠⚠ `Follow the build →` KEEPS ITS ABSOLUTE URL AND `target="_blank"`:
            it crosses to another host and must not cost a tester the page they
            were testing. The two tracker links are relative and same-tab,
            because they go to the site the visitor is already on.
          */}
          {onTracker === true ? (
            <TrackerLinks />
          ) : onTracker === false ? (
            <a
              href="https://status.panameer.com"
              target="_blank"
              rel="noreferrer"
              className="ml-2 whitespace-nowrap font-semibold text-magenta underline underline-offset-4"
            >
              Follow the build →
            </a>
          ) : null}
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

/**
 * ── THE TRACKER'S TWO LINKS (`P2-ALL-E787`) ─────────────────────────────────
 *
 * ⚠⚠⚠ **IT IS A SEPARATE COMPONENT SO THE SESSION READ IS CONFINED TO THE
 * TRACKER.** `useSession()` fetches `/api/auth/session`; calling it in
 * `DevBanner` would add that request to **every page on the site**, including
 * the statically rendered marketing pages that read no session today. ⚠ A
 * component that is not rendered does not call the hook, so only the tracker
 * pays for it.
 *
 * ⚠⚠ **`Join free` IS NEVER SHOWN TO A SIGNED-IN MEMBER** (Scott, 2026-10-03) —
 * and `loading` counts as NOT KNOWN, so the default is to show nothing rather
 * than offer an account to somebody who already has one. ⚠ Same rule and same
 * signal as `MarketingHeader` dropping `Sign Up` (`E045`).
 */
function TrackerLinks() {
  const { status } = useSession();
  const offerJoin = status === "unauthenticated";

  return (
    <>
      {offerJoin && (
        <>
          <a
            href="/join"
            className="ml-2 whitespace-nowrap font-semibold text-magenta underline underline-offset-4"
          >
            Join free
          </a>
          <span aria-hidden className="mx-1.5 text-ink-3">
            ·
          </span>
        </>
      )}
      <a
        href="/home"
        className={
          "whitespace-nowrap font-semibold text-magenta underline underline-offset-4" +
          (offerJoin ? "" : " ml-2")
        }
      >
        See the full site →
      </a>
    </>
  );
}
