"use client";

import { useEffect, useState } from "react";

/**
 * The "we are still reading your document" state (E200).
 *
 * WHY THE OLD COPY MADE THIS WORSE. Four surfaces promised "20–30 seconds",
 * which was honest about the median and a liability at the tail: a long CV, a
 * slow model call or a retry blows through thirty seconds, and at that point a
 * promise the page has already broken is more alarming than no promise at all.
 * The walk called it frozen. A number you can miss is a worse commitment than a
 * heartbeat that keeps talking.
 *
 * SO NOTHING HERE PREDICTS A DURATION. An indeterminate bar that is always
 * moving, and a line that CHANGES as the wait grows — the change is the signal.
 * Even at ninety seconds the page is visibly still working and still telling you
 * something new, which is the difference between slow and hung.
 *
 * The ticking is `setInterval`, not state written during an effect: the timer
 * fires a callback, which is the shape this codebase's lint rule allows and the
 * one that cannot cascade renders.
 */
const BEATS: { after: number; text: string }[] = [
  { after: 0, text: "Reading your document…" },
  { after: 12, text: "Still reading — we go through the whole document, not just the first page." },
  { after: 28, text: "Still working — larger documents take longer. Leave this open." },
  { after: 50, text: "Still working. Long or scanned documents can take a couple of minutes." },
  { after: 90, text: "Still going. If this doesn't finish, you can close this and fill things in by hand." },
];

export function ParseHeartbeat({ className = "" }: { className?: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const beat = [...BEATS].reverse().find((b) => seconds >= b.after) ?? BEATS[0];

  return (
    <div className={className} role="status" aria-live="polite">
      {/*
        AN INDETERMINATE BAR, NOT A PERCENTAGE. The upload's percentage is real
        and stays; this is the model call after it, and nothing in the response
        reports progress — so a bar that filled to 90% and sat there would be
        inventing a measurement. A looping sweep says "working" and claims
        nothing about how far along it is.
      */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/3 animate-parse-sweep rounded-full bg-magenta" />
      </div>
      <p className="mt-2 text-[13px] text-ink-2">
        {beat.text}
        {seconds >= 12 && (
          <span className="ml-1 tabular-nums text-ink-2/70">({seconds}s)</span>
        )}
      </p>
    </div>
  );
}
