"use client";

import { useEffect } from "react";

import { FOCUS_AUDIENCE_COOKIE, FOCUS_DISMISSED_COOKIE } from "@/lib/focus-strip";
import type { Audience } from "@/lib/audience";

/**
 * The Focus strip's Dismiss button — the only part of the strip that needs JS.
 *
 * SPLIT OUT SO THE STRIP ITSELF STAYS A SERVER COMPONENT. The links are the
 * whole point of the strip and they must keep working without JavaScript, be
 * prefetched, and survive middle-click. Making the entire strip a client
 * component to get one button would give all of that up.
 *
 * NO REACT STATE. It writes the cookie and sets the same attribute on <html>
 * that the pre-paint script sets, and CSS does the hiding. That means the
 * dismissal takes effect identically on this click and on the next page load —
 * one mechanism, one appearance, nothing that can disagree with itself. State
 * here would have been a third source of truth for "is it hidden".
 *
 * A SESSION COOKIE, no max-age: dismissal is about this visit. There is no
 * "un-dismiss" control, and a strip that vanishes for a year could not be found
 * again by anyone who wanted it back.
 */
export function FocusStripControls() {
  const dismiss = () => {
    try {
      document.cookie = `${FOCUS_DISMISSED_COOKIE}=1; path=/; samesite=lax`;
    } catch {
      // A blocked cookie means it comes back next load. That is the correct
      // degradation for a notice — never a reason to fail the click.
    }
    document.documentElement.setAttribute("data-focus-dismissed", "1");
  };

  return (
    <button
      type="button"
      onClick={dismiss}
      className="ml-1 shrink-0 rounded-full px-2 py-1 text-[12.5px] font-semibold text-ink-2 underline underline-offset-4 transition-colors hover:text-magenta"
    >
      Dismiss
    </button>
  );
}

/**
 * Records which side the visitor is currently on, so the strip can
 * pre-highlight it next time (E061).
 *
 * Renders nothing. It writes a cookie on mount when the page has an audience —
 * `/` never writes, because arriving at the neutral page is not a choice.
 *
 * A COMPONENT because the pages are server components and this is the only
 * client-side thing the memory needs; an EFFECT because writing a cookie is a
 * side effect and render must stay pure — React may render this more than once
 * and a write in the body would fire on each. No setState is involved, so the
 * repo's set-state-in-effect rule does not apply: this is what effects are for.
 *
 * The cookie is read by the pre-paint script and by nothing in React, so there
 * is no state to keep in sync and nothing re-renders when it changes.
 *
 * ⚠ IT ONLY EVER PRE-HIGHLIGHTS. Nothing anywhere reads this to redirect `/`,
 * which is Scott's constraint: a visitor who types panameer.com must get the
 * neutral page every time.
 */
export function FocusRemember({ audience }: { audience: Audience }) {
  useEffect(() => {
    if (audience === "neutral") return;
    try {
      document.cookie = `${FOCUS_AUDIENCE_COOKIE}=${audience}; path=/; samesite=lax`;
    } catch {
      // Blocked cookies just mean no pre-highlight next time.
    }
  }, [audience]);

  return null;
}
