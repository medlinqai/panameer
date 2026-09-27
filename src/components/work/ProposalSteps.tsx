"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/casing/Button";

/**
 * ── ⚠⚠⚠ THE TWO OPTIONAL STEPS ON A PROPOSAL (`P2-A8-E683a` WS-E) ────────
 *
 * ⚠⚠⚠ **BOTH WRITERS EXISTED AND NEITHER HAD A DOOR.** `interviews.ts` (322
 * lines, five exports) and `work-tests.ts` (345 lines, four exports) had **zero
 * importers in `src/`** — only `scripts/check-interviews.ts`. This component
 * and its two routes are the door, and nothing about the writers changed.
 *
 * ── ⚠⚠ OPTIONAL MEANS OPTIONAL, AND THE GATE HOLDS IT ────────────────────
 *
 * ⚠ The brief: *"each optional… **neither may be made a precondition of
 * WS-F**."* ⚠⚠ Measured: `selection.ts` reads neither `InterviewRequest` nor
 * `TestRequest`, and `check:work-chain` fails if it ever does. **A buyer may
 * select a provider having interviewed nobody and tested nobody.**
 * ⚠⚠⚠ **SO THESE CONTROLS NEVER DISABLE ANYTHING AND NEVER GATE ANYTHING.**
 * They add two things a buyer MAY do, and removing them tomorrow would remove
 * no capability from selection.
 *
 * ── ⚠⚠ IT SHOWS THE STATE, BECAUSE A BUTTON WITH NO ANSWER IS A GUESS ────
 *
 * ⚠ `null` means *not asked* — a real and common state, so it reads **"Not
 * requested"** rather than a dash (ruling 18: a dash means *we cannot count
 * this*, which would be false here).
 * ⚠⚠ Both writers are IDEMPOTENT — an open interview or test returns the
 * existing row rather than a second — so a double click cannot produce two.
 */
export function ProposalSteps({
  workRequestId,
  providerPersonId,
  providerName,
  interviewStatus,
  testStatus,
  tests,
}: {
  workRequestId: string;
  providerPersonId: string;
  providerName: string;
  interviewStatus: string | null;
  testStatus: string | null;
  /**
   * ⚠⚠ The PUBLISHED path tests a buyer may send. ⚠⚠⚠ **IT IS A QUERY RESULT,
   * NEVER A LITERAL** — 2 published and 6 draft today, and the next catalog
   * changes both numbers (the constraint the whole Learn brief turns on).
   */
  tests: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "interview" | "test">(null);
  const [error, setError] = useState<string | null>(null);
  const [pickedTest, setPickedTest] = useState(tests[0]?.id ?? "");

  async function post(kind: "interview" | "test", body: Record<string, unknown>) {
    setBusy(kind);
    setError(null);
    try {
      const r = await fetch(`/api/work-requests/${workRequestId}/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerPersonId, ...body }),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(out.error ?? `Could not ${kind === "interview" ? "request that interview" : "send that test"}.`);
        return;
      }
      /* ⚠ The server component re-reads `proposalsOn`, so the status line below
         and the database cannot disagree after a click. */
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-2">
        {/*
          ⚠⚠ THE STATE FIRST, THE ACTION SECOND. A buyer reads what has already
          been asked before deciding whether to ask again — and both writers
          return the OPEN row rather than creating a second, so "Requested"
          means the button is now a no-op rather than a duplicate.
        */}
        <span>
          Interview:{" "}
          <span className="font-semibold text-ink">
            {interviewStatus ?? "Not requested"}
          </span>
        </span>
        <span>
          Test:{" "}
          <span className="font-semibold text-ink">{testStatus ?? "Not sent"}</span>
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <Button
          variant="quiet"
          disabled={busy !== null}
          onClick={() => post("interview", {})}
        >
          {busy === "interview"
            ? "Requesting an interview…"
            : interviewStatus
              ? "Request Another Interview"
              : "Request an Interview"}
        </Button>

        {/*
          ⚠⚠⚠ NO TESTS PUBLISHED MEANS NO CONTROL, NOT A DISABLED ONE. A button
          that cannot do anything is `E579`'s door onto a wall; the sentence
          says why instead, which is the honest form of the same information.
        */}
        {tests.length === 0 ? (
          <span className="text-[13px] text-ink-2">
            No published tests to send yet.
          </span>
        ) : (
          <>
            <select
              value={pickedTest}
              onChange={(e) => setPickedTest(e.target.value)}
              disabled={busy !== null}
              aria-label={`Test to send to ${providerName}`}
              className="rounded-[10px] border border-line bg-white px-3 py-2 text-[13.5px] outline-none focus:border-magenta"
            >
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <Button
              variant="quiet"
              disabled={busy !== null || !pickedTest}
              onClick={() => post("test", { learnAssessmentId: pickedTest })}
            >
              {busy === "test" ? "Sending the test…" : testStatus ? "Send Another Test" : "Send a Test"}
            </Button>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-brand border border-magenta/40 bg-magenta/[0.04] px-3 py-2 text-[13.5px]">
          {error}
        </p>
      )}
    </div>
  );
}
