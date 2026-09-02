"use client";

import { useState } from "react";
import { ValidationAnswers } from "@/components/validate/ValidationAnswers";
import type { ValidationRequestView } from "@/lib/project-validation";

/**
 * The Confirm / Decline control for the public validation page.
 *
 * Shows the contact ONLY what they need to answer: who, what project, which
 * client, and when. No rate, no bio, no other projects — the token proves they
 * were asked about this one thing, and it entitles them to nothing else.
 */
export function ValidateActions({
  request,
  declineFirst = false,
}: {
  request: ValidationRequestView;
  /** Arrived via the email's "This Isn't Right" button. */
  declineFirst?: boolean;
}) {
  const [busy, setBusy] = useState<"confirm" | "decline" | null>(null);
  const [done, setDone] = useState<"confirm" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = async (decision: "confirm" | "decline") => {
    setBusy(decision);
    setError(null);
    try {
      const r = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: request.token, decision }),
      });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        setError(
          b.error === "used"
            ? "This request has already been answered."
            : b.error === "expired"
              ? "This link has expired."
              : "Something went wrong. Please try again."
        );
        return;
      }
      setDone(decision);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const dates =
    request.startDate || request.endDate
      ? `${request.startDate?.slice(0, 4) ?? "?"} – ${
          request.isCurrent ? "Present" : (request.endDate?.slice(0, 4) ?? "Present")
        }`
      : null;

  if (done) {
    /*
      ── ⚠⚠ THE CONFIRMATION IS ALREADY COMMITTED BEFORE THIS RENDERS ──────────
         (`P1-J2.1-E024`, 2026-09-01)

      `respond()` above awaits `POST /api/validate`, which runs
      `respondToValidation` — a `prisma.$transaction` that writes
      `status: CONFIRMED`, `responded_at`, and the project's `validation_status`.
      `setDone(decision)` only runs AFTER that request resolves, and this branch
      only renders once `done` is set. So by the time a single question is on
      screen the badge is earned, committed and irreversible.

      ⚠⚠ NOTHING BELOW CAN UNDO IT. `saveValidationAnswers` writes no `status`,
      and the Save button is not a submit for the validation — a client who
      confirms and closes the tab has validated the project completely. Every
      question is optional and there is no copy anywhere here implying otherwise.
      ⚠ GET THIS WRONG AND THE FEATURE LOSES VALIDATIONS, which is strictly worse
      than not shipping it.
    */
    return (
      <div className="space-y-5">
        <div className="rounded-brand border border-line bg-white p-8 text-center">
          <p className="text-[40px] leading-none" aria-hidden>
            {done === "confirm" ? "🎉" : "👍"}
          </p>
          <h1 className="mt-4 text-[24px]">
            {done === "confirm" ? "Thank you — that's confirmed" : "Thanks for letting us know"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-2">
            {done === "confirm"
              ? `${request.projectName} now carries a Validated ✓ badge on ${request.providerName}'s profile. We won't email you about it again.`
              : "We've recorded that. The project won't be shown as validated, and we won't email you about it again."}
          </p>
        </div>

        {/*
          ⚠ A DECLINING CLIENT IS NOT ASKED FIVE QUESTIONS. One optional line and
          nothing else — they have already told us the thing that mattered, and
          interrogating a "no" is how you never get an honest one again.
        */}
        <ValidationAnswers
          token={request.token}
          declined={done === "decline"}
          projectName={request.projectName}
          providerName={request.providerName}
        />

        <div className="rounded-brand border border-line bg-white p-6 text-center">
          <p className="text-[14px] font-bold">What Is Panameer?</p>
          <p className="mx-auto mt-1 max-w-md text-[14px] text-ink-2">
            Panameer is where organizations find and buy expert services —
            including straight from the ERP they already work in.
          </p>
          <a
            href="https://panameer.com"
            className="mt-3 inline-block text-[14px] font-bold text-magenta hover:text-magenta-dark"
          >
            Take A Look →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-brand border border-line bg-white p-8">
      <h1 className="text-[24px] leading-snug">
        Did {request.providerName} work on this project?
      </h1>
      <p className="mt-2 text-[15px] text-ink-2">
        {request.providerName} listed this as work delivered with your team. A
        quick confirmation is all we need — no account, nothing to fill in.
      </p>

      <div className="mt-6 rounded-brand border border-line bg-bg-soft p-5">
        <p className="text-[18px] font-bold">{request.projectName}</p>
        <p className="mt-1 text-[14px] text-ink-2">{request.clientName}</p>
        {dates && <p className="mt-0.5 text-[13px] text-ink-2">{dates}</p>}
      </div>

      {error && (
        <p className="mt-4 rounded-[10px] bg-amber-50 px-3 py-2 text-[14px] text-amber-800">
          {error}
        </p>
      )}

      <div
        className={
          "mt-6 flex flex-wrap items-center gap-3 " +
          (declineFirst ? "flex-row-reverse justify-end" : "")
        }
      >
        <button
          type="button"
          onClick={() => respond("confirm")}
          disabled={busy !== null}
          className="rounded-full bg-magenta px-7 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
        >
          {busy === "confirm" ? "Confirming…" : "Yes, They Worked On It"}
        </button>
        <button
          type="button"
          onClick={() => respond("decline")}
          disabled={busy !== null}
          className="rounded-full border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
        >
          {busy === "decline" ? "Sending…" : "This Isn't Right"}
        </button>
      </div>

      <p className="mt-5 text-[12.5px] text-ink-2">
        You were named as the contact for this project. Your answer is recorded
        once and this link then stops working.
      </p>
    </div>
  );
}
