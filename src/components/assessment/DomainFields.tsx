"use client";

import { useState } from "react";
import { parseFieldValue, type DomainField } from "@/lib/assessment/domain-fields";

/**
 * THE DECK'S PER-DOMAIN EXTRA FIELDS, BENEATH THE MATURITY LADDER.
 *
 * ── ⚠ IT SITS UNDER THE LADDER AND IT LOOKS SUBORDINATE ON PURPOSE ───────────
 *
 * The maturity answer is what the score is built from. A step that reads as two
 * equal questions gets half-answered, so this block is separated by a rule, sits on
 * the soft background, and carries a small label rather than a second `subtitle`.
 *
 * ⚠ AND IT DOES NOT GET ITS OWN STEP. `P1-J0-E226` puts "in under an hour of your
 * time" on the marketing home and `AssessmentWizardShot` prints "about 20 minutes";
 * ten more screens would roughly double the walk and break both strings. `ALL_STEPS`
 * does not grow, and `check:assessment-volume` fails the build if it does.
 *
 * ── ⚠ RENDERS NOTHING FOR SLIDES 10 AND 11 ───────────────────────────────────
 *
 * `fields` is `[]` for Data Analytics & AI Governance and Change Management & AI
 * Adoption. Their absence is the deck's design, not an omission — no panel, no
 * heading, no "nothing to add here" placeholder.
 *
 * ── ⚠ ERRORS APPEAR ON TOUCH, NEVER ON ARRIVAL ───────────────────────────────
 *
 * Every one of these is required, so validating on mount would paint the screen red
 * before the visitor has done anything wrong. A field shows its error once it has
 * been blurred or typed into.
 */
export function DomainFields({
  domainKey,
  fields,
  value,
  onChange,
  groupTotal,
}: {
  domainKey: string;
  fields: DomainField[];
  value: (fieldId: string) => string;
  onChange: (fieldId: string, v: string) => void;
  /**
   * The percent group's running total, or `null` when this domain has no group or
   * one of its boxes is not yet a clean number. ⚠ NOT ZERO — a half-typed box must
   * not read as a contribution of nothing.
   */
  groupTotal: number | null;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  if (fields.length === 0) return null;

  const markTouched = (id: string) => setTouched((t) => ({ ...t, [id]: true }));

  return (
    <div className="mt-8 border-t border-line pt-6">
      <p className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-ink-2">
        A few numbers for this domain
      </p>

      <div className="mt-4 grid gap-4 min-[640px]:grid-cols-2">
        {fields.map((field) => {
          const raw = value(field.id);
          const parsed = parseFieldValue(field.type, raw);
          const showError = !parsed.ok && (touched[field.id] ?? false);

          return (
            <div
              key={field.id}
              data-field={`${domainKey}.${field.id}`}
              className={field.type === "boolean" ? "min-[640px]:col-span-2" : ""}
            >
              <span className="mb-1.5 block text-[14px] font-bold text-ink">
                {/* ⚠ VERBATIM FROM THE DECK — do not reword, retitle or add a period. */}
                {field.label}
              </span>

              {field.type === "boolean" ? (
                /*
                  ⚠ TWO EXPLICIT BUTTONS, NEVER A CHECKBOX. An unticked checkbox is
                  indistinguishable from an unanswered question, and this field is
                  required — so "not yet answered" has to be a visible third state.
                */
                <div className="flex gap-2.5">
                  {[
                    { v: "true", label: "Yes" },
                    { v: "false", label: "No" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      aria-pressed={raw === o.v}
                      onClick={() => {
                        onChange(field.id, o.v);
                        markTouched(field.id);
                      }}
                      className={
                        "rounded-[12px] border px-6 py-2.5 text-[15px] font-bold transition-colors " +
                        (raw === o.v
                          ? "border-magenta bg-magenta text-white"
                          : "border-line bg-white text-ink hover:border-magenta")
                      }
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  {field.type === "dollars" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-ink-2"
                    >
                      $
                    </span>
                  )}
                  <input
                    /*
                      ⚠ `type="text"`, NOT `type="number"`. A number input silently
                      drops a typed comma, refuses a leading `$`, and scroll-wheels a
                      figure without the visitor noticing. Scott asked for free text
                      with an edit on it, and that is what this is: the edit lives in
                      `parseFieldValue`, in one place, shared with the server.
                    */
                    type="text"
                    inputMode={field.type === "dollars" ? "decimal" : "numeric"}
                    value={raw}
                    onChange={(e) => onChange(field.id, e.target.value)}
                    onBlur={() => markTouched(field.id)}
                    aria-invalid={showError || undefined}
                    className={
                      "w-full rounded-[12px] border bg-white py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta " +
                      (field.type === "dollars" ? "pl-8 pr-4 " : "px-4 ") +
                      (field.type === "percent" ? "pr-9 " : "") +
                      (showError ? "border-magenta" : "border-line")
                    }
                  />
                  {field.type === "percent" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-ink-2"
                    >
                      %
                    </span>
                  )}
                </div>
              )}

              {showError && !parsed.ok && (
                <span className="mt-1 block text-[13px] font-semibold text-magenta">
                  {parsed.error}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {groupTotal !== null && (
        /*
          ⚠ THE RUNNING TOTAL, SHOWN — and Continue stays blocked until it is 100.

          ⚠ THE THIRD BOX IS NEVER AUTO-FILLED FROM THE OTHER TWO. A buyer who
          genuinely splits across four rails — cards, for instance — needs to SEE
          that the deck's three-rail model does not fit them. Silently balancing the
          last box would hide precisely the finding worth having, and it is the same
          rail split as the payment architecture in `decisions-01.md` § 2026-08-20.
        */
        <p
          role="status"
          className={
            "mt-4 text-[14px] font-bold " +
            (groupTotal === 100 ? "text-[#137a51]" : "text-magenta")
          }
        >
          {groupTotal === 100
            ? "Totals 100% ✓"
            : `These three need to total 100% — currently ${groupTotal}%.`}
        </p>
      )}
    </div>
  );
}
