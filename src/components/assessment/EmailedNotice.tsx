"use client";

import { useState } from "react";

/**
 * "WE'VE ALSO EMAILED YOU THIS LINK" — the receipt bar on a fresh report.
 *
 * ── IT ONLY EVER CLAIMS A SEND THAT HAPPENED ─────────────────────────────────
 *
 * The report page renders this ONLY when the submit redirect carried
 * `?emailed=1`, and `/api/assessment` sets that flag only after Resend accepted
 * the message. With no `RESEND_API_KEY` configured — the state of every dev
 * machine today — no flag, no bar, and the page makes no promise about an inbox
 * (E031). That is the whole point: the old flow asserted the email
 * unconditionally on a separate screen, and the assertion was false every time.
 *
 * ── AND ONLY ON FIRST ARRIVAL ────────────────────────────────────────────────
 *
 * The flag lives in the query string rather than in the row, so re-opening the
 * share link later — or forwarding it to a colleague — shows the report with no
 * bar. A colleague was not emailed anything, and telling them they were would
 * be both wrong and a small leak of someone else's address.
 *
 * Dismissible, and dismissal is deliberately NOT persisted: it costs one click
 * and lasts for the page view, which is as long as the sentence is relevant.
 * Persisting it would mean a cookie or a write, to remember something the
 * reader stops caring about the moment they scroll.
 */
export function EmailedNotice({ to }: { to: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-brand border border-line bg-bg-soft px-4 py-3 text-[14.5px] text-ink-2">
      <p className="flex-1">
        We&rsquo;ve also emailed this link to{" "}
        <span className="font-bold text-ink">{to}</span> so you can come back to it.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        /* NAMED, not a bare "Dismiss" — the page already carries another
           Dismiss control, and two identically-named buttons are ambiguous to a
           screen reader listing them and to any test that goes by role+name. */
        aria-label="Dismiss the email notice"
        className="-my-1 shrink-0 rounded-full px-2 py-1 text-[18px] leading-none text-ink-2 transition-colors hover:text-ink"
      >
        &times;
      </button>
    </div>
  );
}
