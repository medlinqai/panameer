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
        `bg-magenta/8`, NOT `bg-magenta/[0.07]`. The arbitrary-decimal form
        compiles to no rule at all under Tailwind v4 here — the class lands in
        the markup, the CSS never appears, and the banner renders as untinted
        text on the page background. Verified in the built stylesheet; the
        slash-integer form is what generates.
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
          <span className="text-ink-2">
            {" "}
            — you&apos;re early. Look around, but accounts and data may be reset
            while we build.
          </span>
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
