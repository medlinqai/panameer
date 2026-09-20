"use client";

import { useState } from "react";
/* ⚠⚠ IMPORTED FROM `service-product-categories.ts`, NOT
   `experience-attestation.ts`. That module imports `prisma`, and reaching it
   from this CLIENT component pulled `@prisma/adapter-pg` and `pg` into the
   browser bundle and failed the build (measured 2026-09-19, `E563` WS-B). */
import {
  ATTESTATION_CATEGORIES,
  ATTESTATION_THRESHOLD_YEARS,
  MAX_ATTESTED_YEARS,
  meetsThreshold,
} from "@/lib/service-product-categories";

/**
 * ── ⚠⚠ `Confirm Your Experience` (`P2-J2-E563` WS-B item 8) ────────────────
 *
 * ⚠ Scott, 2026-09-17: *"TWO — check their 'have you done this for > 3 years'
 * related to auto-service product creation."*
 *
 * ⚠⚠⚠ THIS IS THE ENTRY POINT AND THE CAPTURE. IT DOES NOT BUILD
 * AUTO-CREATION, and the copy below is careful to state the payoff as an
 * intention rather than a promise that something happened.
 *
 * ── ⚠⚠ WHY A NUMBER AND NOT A TICK ────────────────────────────────────────
 *
 * ⚠ The brief: *"The attestation must be a SPECIFIC claim, not a bare
 * checkbox — '3+ years of Testing' can later be cross-checked against the
 * résumé; a tick everyone ticks is worthless."*
 * ⚠⚠ A WHOLE NUMBER OF YEARS PER CATEGORY is the smallest thing that can be
 * checked against `Employer`/`Project` dates later. The threshold is DERIVED
 * (`years >= 3`), never a second stored field.
 *
 * ── ⚠ THE FOUR CATEGORIES ARE IMPORTED, NOT RETYPED ───────────────────────
 *
 * ⚠⚠ The list is Scott's and CLOSED. It comes from
 * `lib/service-product-categories.ts`, which mirrors the schema enum — so this
 * component cannot add a fifth, and a fifth cannot be added without a `db
 * push`.
 */
export function ConfirmExperience({
  initial,
}: {
  /** category → years already claimed. Absent means never answered. */
  initial: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [years, setYears] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const c of ATTESTATION_CATEGORIES) {
      /*
        ⚠⚠ AN UNANSWERED CATEGORY STARTS EMPTY, NOT `0`. A pre-filled zero is a
        claim the provider never made — the same class of fabrication as a `0`
        on an untracked stat tile.
      */
      seed[c.value] = c.value in initial ? String(initial[c.value]) : "";
    }
    return seed;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const answered = ATTESTATION_CATEGORIES.filter((c) => c.value in initial);
  const qualifying = answered.filter((c) => meetsThreshold(initial[c.value]));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      /* ⚠ ONLY WHAT WAS FILLED IN IS SENT. An empty box is "not answered", and
         the server leaves an unmentioned category alone — a save must not
         delete data it did not create. */
      const claims = ATTESTATION_CATEGORIES.flatMap((c) => {
        const raw = years[c.value]?.trim();
        if (!raw) return [];
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0 || n > MAX_ATTESTED_YEARS) return [];
        return [{ category: c.value, years: n }];
      });
      if (claims.length === 0) {
        setError("Enter the number of years for at least one category.");
        return;
      }
      const r = await fetch("/api/settings/experience-attestation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claims }),
      });
      if (!r.ok) {
        const b = (await r.json().catch(() => ({}))) as { error?: string };
        setError(b.error ?? "Could not save that.");
        return;
      }
      setSaved(true);
      setOpen(false);
      /* ⚠ NO `router.refresh()` HERE, DELIBERATELY. The panel already holds what
         was just saved; a refresh would re-mount it and discard the
         confirmation the person is reading. The next page load reads the rows. */
    } catch {
      /* ⚠ `E516` — a thrown fetch must not produce silence. */
      setError("Could not save that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-brand border border-line bg-white p-5">
      <h2 className="font-display text-[16px] font-bold">Confirm Your Experience</h2>

      {/*
        ⚠⚠ THE PAYOFF, STATED AS AN INTENTION. It must not claim a service
        product was created — nothing is created by this brief, and a sentence
        promising otherwise would be a fabricated fact the moment it shipped.
      */}
      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
        Tell us how long you&rsquo;ve worked in each of these, and we&rsquo;ll
        build the matching service products for you &mdash; you don&rsquo;t write
        them. {ATTESTATION_THRESHOLD_YEARS}+ years is what qualifies a category.
      </p>

      {answered.length > 0 && !open && (
        <p className="mt-3 text-[13.5px] text-ink-2">
          {/* ⚠ `E433` — counts are facts, so ink. */}
          You&rsquo;ve answered {answered.length} of{" "}
          {ATTESTATION_CATEGORIES.length}
          {qualifying.length > 0 && (
            <>
              {" "}
              &middot; {qualifying.length} at {ATTESTATION_THRESHOLD_YEARS}+ years
            </>
          )}
          .
        </p>
      )}

      {saved && !open && (
        <p className="mt-3 text-[13.5px] font-bold text-ink">
          Saved. We&rsquo;ll be in touch as those service products are built.
        </p>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setSaved(false);
          }}
          className="mt-4 inline-block rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          {/* ⚠ Title Case (rule 11). */}
          {answered.length > 0 ? "Update Your Experience" : "Confirm Your Experience"}
        </button>
      ) : (
        <div className="mt-4">
          <ul className="space-y-2.5">
            {ATTESTATION_CATEGORIES.map((c) => (
              <li key={c.value} className="flex items-center justify-between gap-4">
                <label
                  htmlFor={`att-${c.value}`}
                  className="text-[14px] font-semibold"
                >
                  {c.label}
                </label>
                <span className="flex shrink-0 items-baseline gap-2">
                  <input
                    id={`att-${c.value}`}
                    type="number"
                    min={0}
                    max={MAX_ATTESTED_YEARS}
                    step={1}
                    inputMode="numeric"
                    value={years[c.value]}
                    onChange={(e) =>
                      setYears((y) => ({ ...y, [c.value]: e.target.value }))
                    }
                    className="w-20 rounded-brand border border-line px-2.5 py-1.5 text-right text-[14px]"
                  />
                  <span className="text-[13px] text-ink-2">years</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
            Leave a category blank if it isn&rsquo;t something you do. We may
            check these against your work history.
          </p>

          {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-60"
            >
              {/* ⚠ A STATUS SENTENCE INSIDE A BUTTON IS NOT A LABEL and stays a
                  sentence; the other branch names the action and takes Title
                  Case (rule 11). */}
              {busy ? "Saving your answers…" : "Save Your Experience"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="text-[13.5px] font-bold text-ink-2 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
