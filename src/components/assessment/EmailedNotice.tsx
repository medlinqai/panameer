"use client";

import { useState } from "react";

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
        aria-label="Dismiss the email notice"
        className="-my-1 shrink-0 rounded-full px-2 py-1 text-[18px] leading-none text-ink-2 transition-colors hover:text-ink"
      >
        &times;
      </button>
    </div>
  );
}
