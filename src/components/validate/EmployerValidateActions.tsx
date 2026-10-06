"use client";

import { useState } from "react";
import type { EmployerValidationView } from "@/lib/employer-validation";

export function EmployerValidateActions({
  request,
  declineFirst = false,
}: {
  request: EmployerValidationView;
  declineFirst?: boolean;
}) {
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);
  const [done, setDone] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = async (answer: "yes" | "no") => {
    setBusy(answer);
    setError(null);
    try {
      const r = await fetch("/api/validate/employer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: request.token, answer }),
      });
      if (!r.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      setDone(answer);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  if (done) {
    return (
      <div className="rounded-brand border border-line bg-white p-8 text-center">
        <p className="text-[40px] leading-none" aria-hidden>
          {done === "yes" ? "✓" : "👍"}
        </p>
        <h1 className="mt-4 text-[24px]">Thank you</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-2">
          {done === "yes"
            ? `We've recorded that ${request.providerName} worked at ${request.employerName}. Their profile will show it as validated.`
            : /* ⚠ No blame, no follow-up question, and nothing is published. */
              "We've recorded that. Nothing will be shown as validated, and we won't email you about this again."}
        </p>
      </div>
    );
  }

  const facts = [request.roleTitle, request.dates].filter(Boolean).join(" · ");

  return (
    <div className="rounded-brand border border-line bg-white p-8">
      <h1 className="text-[24px] leading-snug">
        Did {request.providerName} work at {request.employerName}?
      </h1>
      {facts && <p className="mt-2 text-[15px] text-ink-2">{facts}</p>}
      <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
        {/* ⚠⚠ IT SAYS WHAT HAPPENS AND WHAT DOES NOT. A stranger answering a
            question about somebody's career needs to know their own name is not
            going anywhere. */}
        {request.providerName} listed this on their Panameer profile. One click is
        all we need — your name is never shown, only that someone at{" "}
        {request.employerName} confirmed it.
      </p>

      {error && <p className="mt-4 text-[14px] text-magenta-ink">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        {/* ⚠ `declineFirst` only reorders emphasis — both buttons are always
            present, because arriving via the wrong link must not trap anyone. */}
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => respond("yes")}
          className={
            declineFirst
              ? "inline-flex min-h-[44px] items-center border border-ink px-5 text-[14px] font-bold text-ink hover:bg-bg-soft disabled:opacity-60"
              : "inline-flex min-h-[44px] items-center bg-ink px-5 text-[14px] font-bold text-white hover:bg-ink/90 disabled:opacity-60"
          }
        >
          {busy === "yes" ? "Recording…" : "Yes, They Did"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => respond("no")}
          className={
            declineFirst
              ? "inline-flex min-h-[44px] items-center bg-ink px-5 text-[14px] font-bold text-white hover:bg-ink/90 disabled:opacity-60"
              : "inline-flex min-h-[44px] items-center border border-ink px-5 text-[14px] font-bold text-ink hover:bg-bg-soft disabled:opacity-60"
          }
        >
          {busy === "no" ? "Recording…" : "No, That Isn't Right"}
        </button>
      </div>
    </div>
  );
}
