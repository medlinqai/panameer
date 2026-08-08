"use client";

import { useEffect } from "react";
import { FOCUS_AUDIENCE_COOKIE } from "@/lib/focus-strip";
import type { Audience } from "@/lib/audience";

/**
 * Records which side the visitor is on, so the strip can pre-highlight it next
 * time (E061).
 *
 * Renders nothing. Writes a cookie when the page has an audience — `/` never
 * writes, because arriving at the neutral page is not a choice.
 *
 * ⚠ IT ONLY EVER PRE-HIGHLIGHTS. Nothing reads this to redirect `/`: a visitor
 * who types panameer.com gets the neutral page every time, and `/` stays
 * statically prerendered because no request ever depends on a cookie.
 *
 * A COMPONENT because the pages are server components and this is the only
 * client-side thing the memory needs; an EFFECT because writing a cookie is a
 * side effect and render must stay pure — React may render this more than once
 * and a write in the body would fire on each. No setState is involved, so the
 * repo's set-state-in-effect rule does not apply: this is what effects are for.
 *
 * THIS FILE USED TO ALSO HOLD THE DISMISS BUTTON. E061 made the strip
 * permanent, so the button, its cookie and the CSS that hid the strip are all
 * gone — see lib/focus-strip.ts.
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
