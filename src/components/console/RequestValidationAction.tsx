"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * ── ⚠⚠ THE VALIDATION DOOR (`P2-J2-E563` WS-B, Scott's ruling 2026-09-19) ───
 *
 * ⚠⚠⚠ SCOTT, 2026-09-19: *"Panameer is the ONLY one that can validate profiles.
 * AND, there is a subscription level for the buyers that allows them to ONLY see
 * validated profiles."*
 *
 * ⚠⚠ SO VALIDATION IS A REVENUE MECHANISM, NOT A BADGE. That is why it earns a
 * door rather than a note.
 *
 * ── ⚠⚠ WHAT THIS FIXES — A ROUTE WITH NO CALLER ────────────────────────────
 *
 * ⚠ Measured at `E563`'s WS-A gate, 2026-09-19: `POST
 * /api/settings/request-validation` EXISTED, was owner-scoped, worked — and
 * **NOTHING IN THE APPLICATION CALLED IT.** A provider could not move
 * themselves to `REQUESTED` by any path.
 * ⚠⚠ `/account-health` was worse than silent about it, instructing providers to
 * *"Ask for it from your profile"* — pointing at a button that had never
 * existed. ⚠ This is that button.
 *
 * ⚠⚠ THE ROUTE IS REUSED, NOT REPLACED. Scott: *"Do not write a new route."*
 *
 * ── ⚠⚠⚠ WHAT VALIDATION MUST NEVER DO — THE `brief_K` INVARIANT ────────────
 *
 * ⚠⚠ **VALIDATION GATES WHICH BUYERS SEE A PROVIDER, NEVER WHETHER THE PROVIDER
 * IS VISIBLE.** `requestValidation` in `profile-settings.ts` changes
 * `validation_status` and nothing else — base marketplace visibility is
 * `isMarketplaceVisible`, which does not read it. ⚠ **DO NOT WIRE THE TWO
 * TOGETHER.** A provider who asks for validation and is refused must be exactly
 * as visible afterwards as before.
 */
export function RequestValidationAction({ status }: { status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
    ⚠ THE REQUEST IS ONLY OFFERED FROM THE TWO STATES THAT CAN USE IT, and that
    mirrors `requestValidation`'s own guard rather than restating it loosely:
    `NOT_REQUESTED` or `REJECTED`. ⚠⚠ A button that posts a no-op is a button
    that lies about what it did.
  */
  const canAsk = status === "NOT_REQUESTED" || status === "REJECTED";

  const ask = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/settings/request-validation", { method: "POST" });
      if (!r.ok) {
        const b = (await r.json().catch(() => ({}))) as { error?: string };
        setError(b.error ?? "Could not send that request.");
        return;
      }
      /*
        ⚠⚠ THE ROW RE-READS FROM THE SERVER RATHER THAN FLIPPING LOCALLY.
        `validation_status` is the server's fact, and a local optimistic flip
        would show "Under review" for a request the database refused. ⚠ The
        page is a server component, so `refresh()` re-runs its query.
      */
      router.refresh();
    } catch {
      /* ⚠ A THROWN FETCH MUST NOT PRODUCE SILENCE — that is `E516`'s whole
         finding, five `try`/`finally` blocks with no `catch`. */
      setError("Could not send that request.");
    } finally {
      setBusy(false);
    }
  };

  if (!canAsk) return null;

  return (
    <span className="mt-1.5 block">
      <button
        type="button"
        onClick={ask}
        disabled={busy}
        /* ⚠ `E433` — MAGENTA MARKS AN INTERACTIVE THING, which this is. */
        className="text-[13.5px] font-bold text-magenta hover:underline disabled:opacity-60"
      >
        {/* ⚠⚠ TITLE CASE, AND THE WORDS ARE SCOTT'S, VERBATIM (rule 11).
            ⚠ The busy string is a STATUS SENTENCE, not a label, so it stays a
            sentence — the distinction Scott drew on 2026-09-16. */}
        {busy ? "Sending your request…" : "Request Validation"}
      </button>
      {error && (
        <span className="mt-1 block text-[12.5px] text-red-600">{error}</span>
      )}
    </span>
  );
}
