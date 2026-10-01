"use client";

import Link from "next/link";
import { useMe } from "@/components/MeProvider";
import "@/components/notifications/triage.css";

/**
 * ── ⚠⚠⚠ "YOUR PROFILE IS HIDDEN FROM BUYERS" (`P2-A1.1-E737`, A3) ───────────────────────
 *
 * ⚠ **SCOTT: *"show the user when they are logged on and their profile is invisible."***
 * A thin banner at the top of every signed-in page, below the band, that stays until
 * visibility is on and cannot be dismissed. **The state is the reason it exists.**
 *
 * ── ⚠⚠⚠ ONE DEFINITION OF "VISIBLE", AND IT IS NOT RE-IMPLEMENTED HERE ──────────────────
 *
 * ⚠ **`me.providerProfile.visible` IS ALREADY `isMarketplaceVisible(...)` OVER
 * `providerMeetsRequired(...)`** — computed in `lib/me.ts`, from the same predicate the
 * visibility switch and the marketplace read. ⚠⚠ **THIS COMPONENT COMPUTES NOTHING.**
 * ⚠⚠⚠ `access.ts` records what a second shape costs: *"MEASURED 2026-09-20: the two
 * disagreed on 6 real profiles — visible on five surfaces, invisible on three, at the same
 * moment."* A banner with its own rule would have been the seventh surface.
 *
 * ── ⚠⚠ WHO SEES IT ─────────────────────────────────────────────────────────────────────
 *
 * ⚠ **Only a member who HAS a provider profile** (Scott). A buyer has nothing to be hidden,
 * so `providerProfile == null` renders nothing — not an empty bar, not a zero-height div.
 * ⚠⚠ **AND IT IS DELIBERATELY NOT SHOWN WHILE ONBOARDING IS UNFINISHED.** A provider who
 * has not published yet is not *hidden*, they are **not finished** — telling them their
 * profile is hidden from buyers would name a problem they have not reached, and the wizard
 * is already telling them what is outstanding. ⚠⚠⚠ **"NOT YET STARTED" AND "SWITCHED OFF"
 * ARE DIFFERENT STATES AND MUST NOT READ THE SAME**, which is the counting rule's shape
 * applied to a sentence.
 *
 * ── ⚠⚠ WHERE THE LINK GOES, AND WHY IT IS NOT A SWITCH ─────────────────────────────────
 *
 * ⚠ **IT GOES TO THE SWITCH; IT DOES NOT FLIP IT IN PLACE.** ⚠⚠ **MEASURED: `paused_at` is
 * only ONE of the reasons a profile is invisible.** The predicate also requires a title, a
 * role, a skill, a rate, a photo, a phone and an address — so for most hidden providers
 * there is **nothing a toggle could switch on**, and a button labelled *"Turn Visibility
 * On"* that silently did nothing would be a door onto a wall (`E579`).
 * ⚠⚠⚠ **SO THE BANNER SENDS THEM WHERE THE REASON IS SHOWN**, and the label says `Fix This`
 * rather than promising an outcome this component cannot deliver.
 * ⚠ **REPORTED TO SCOTT:** his brief said *"turns visibility on in place, or goes to the
 * switch. Report which."* This is the answer and the measurement behind it.
 */
export function HiddenProfileBanner() {
  /* ⚠ `useMe()` returns the STATE, not the member — `{ me, loading, error, refresh }`. */
  const { me, loading } = useMe();
  /* ⚠⚠ NOTHING WHILE IT IS STILL LOADING. A banner that flashes "hidden from buyers" on
     every page load and then disappears would be alarming and wrong more often than right —
     `me` is null until the fetch lands, and null is not evidence of being hidden. */
  if (loading) return null;
  const p = me?.providerProfile;

  if (!p) return null;
  /* ⚠ Not finished is not hidden — see the docblock. */
  if (!p.published) return null;
  if (p.visible) return null;

  return (
    <div className="pm-hidden-banner" role="status">
      <p>
        <strong>Your profile is hidden from buyers.</strong>{" "}
        <span className="pm-hidden-banner-why">
          {/* ⚠⚠ THE TWO CASES READ DIFFERENTLY BECAUSE THEY ARE DIFFERENT. ⚠ `paused` is a
              choice the member made and can unmake; the other is a missing detail. Telling
              somebody to "turn it on" when the real reason is a missing phone number sends
              them to a switch that is already in the right position. */}
          {p.paused
            ? "You switched it off."
            : "Some required details are still missing."}
        </span>
      </p>
      <Link href="/profile" className="pm-hidden-banner-act">
        {p.paused ? "Turn Visibility On" : "Fix This"}
      </Link>
    </div>
  );
}
