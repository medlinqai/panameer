"use client";

import { useState } from "react";

/**
 * Bug report (MASTER WS10 element 6) — Medlinq's BugReportButton UI, TARGET
 * STUBBED.
 *
 * The brief scopes the ticketing backend out, so this does not pretend to file
 * anything. It captures the report, tells the truth about where it goes, and
 * gives the reporter their text back so a real description isn't lost to a
 * button that quietly did nothing. Wiring `POST /api/support/bug` is the only
 * change needed when the backend lands.
 */
export function BugReportForm() {
  const [what, setWhat] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-brand border-2 border-amber-400/50 bg-amber-50/60 p-6">
          <p className="text-[16px] font-bold">Not filed — there&apos;s no bug tracker yet.</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
            Ticketing isn&apos;t built, so nothing was submitted and it would be
            dishonest to say otherwise. Your description is below — copy it and
            send it to Scott, and it&apos;ll be filed properly once this is wired
            up.
          </p>
          <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-[10px] bg-white p-4 text-[13.5px]">
            {what}
          </pre>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-4 rounded-full border-[1.5px] border-line bg-white px-5 py-2 text-[14px] font-bold hover:border-magenta hover:text-magenta"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
        Report a bug
      </h1>
      <p className="mt-2 text-[15px] text-ink-2">
        What went wrong, and what were you doing when it happened?
      </p>

      <textarea
        value={what}
        onChange={(e) => setWhat(e.target.value)}
        rows={8}
        placeholder="I clicked Publish and…"
        className="mt-4 w-full rounded-[12px] border border-line bg-white p-4 text-[15px] outline-none focus:border-magenta"
      />

      <button
        type="button"
        disabled={!what.trim()}
        onClick={() => setSent(true)}
        className="mt-4 rounded-full bg-magenta px-7 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-40"
      >
        Submit
      </button>
      <p className="mt-2 text-[13px] text-ink-2">
        Heads up: the bug tracker isn&apos;t built yet — this won&apos;t file a
        ticket.
      </p>
    </div>
  );
}
