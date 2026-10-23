"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INTERVIEW_GUIDELINES } from "@/lib/interview-guidelines";

// PJ-E002: Join · Add to Calendar · Cancel on the Interview section's own line.
const SM = "inline-flex min-h-8 items-center px-3 text-[12.5px] font-semibold";
export function InterviewQuickActions({ interviewId, hasRoom }: { interviewId: string; hasRoom: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    if (!window.confirm("Cancel this interview? The buyer is told and the time is freed.")) return;
    setBusy(true);
    await fetch("/api/interviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", as: "provider", interviewId }) }).catch(() => null);
    setBusy(false);
    router.refresh();
  };
  return (
    <>
      {hasRoom && <a href={`/api/interviews/${interviewId}/join`} target="_blank" rel="noreferrer" className={`${SM} bg-ink text-surface hover:bg-ink-hover`} data-join>Join</a>}
      <a href={`/api/interviews/${interviewId}/ics`} className={`${SM} border border-ink text-ink`}>Add to Calendar</a>
      <button type="button" disabled={busy} onClick={cancel} className={`${SM} text-state-declined underline`}>Cancel</button>
    </>
  );
}

/** PJ-E002: the interview guidelines behind a "Guidelines" link, opened inline. */
export function GuidelinesLink() {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-[12.5px]">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="font-semibold text-ink-2 underline underline-offset-4">Guidelines</button>
      {open && <p className="mt-1.5 rounded-[8px] border border-line bg-bg-soft px-3 py-2.5 leading-snug text-ink-2" data-interview-guidelines>{INTERVIEW_GUIDELINES}</p>}
    </div>
  );
}
