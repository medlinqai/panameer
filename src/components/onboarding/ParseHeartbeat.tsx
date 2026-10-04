"use client";

import { useEffect, useState } from "react";

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
      {}
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
