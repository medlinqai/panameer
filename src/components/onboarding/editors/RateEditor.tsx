"use client";

import { Field, TextInput } from "@/components/onboarding/controls";
import { bpsToPercentLabel, formatCents } from "@/lib/display";

/**
 * ── ⚠⚠ THE RATE EDITOR, EXTRACTED (`P2-A2-E597` WS-B, editor 3 of 5) ─────
 *
 * ⚠ 82 lines, and the one helper that was LOCAL to the wizard — `Row` — moved
 * with it, as WS-A's order said it would. `Field` and `TextInput` were already
 * shared.
 *
 * ⚠⚠ PRESENTATION ONLY. No state, no `postStep`, no navigation. `saveAnd("rate",
 * { hourlyDollars })` stays with `rateEditing()` in the wizard — two save paths
 * for one field is how the two titles happened (`E595`).
 *
 * ── ⚠⚠⚠ CENTS IN, CENTS OUT. THE DOLLARS ARE A RENDERING ─────────────────
 *
 * ⚠ The column is `hourly_rate_cents` and this component speaks cents at its
 * edges, converting to dollars only for the input the human types into.
 * ⚠⚠ A COMPONENT THAT TOOK DOLLARS WOULD PUT A ROUNDING STEP ON A BOUNDARY,
 * and money that crosses a boundary in the wrong unit is the class of defect
 * nobody finds until it is in somebody's invoice. The caller stores cents.
 */

/**
 * ⚠⚠ MOVED WITH THE EDITOR (`P2-A2-E597` WS-B). It was `page.tsx`'s local
 * `Row` and had exactly one other caller inside the wizard — measured — so it
 * comes here rather than to a shared primitives file it would be alone in.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — it lived at `page.tsx:5705`:
 * //   function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
 */
function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={strong ? "font-bold" : "text-ink-2"}>{label}</span>
      <span className={strong ? "text-[18px] font-extrabold" : "font-semibold"}>
        {value}
      </span>
    </div>
  );
}

/** ⚠ A blank rate cannot be saved from the step or from the review modal. */
export function rateCanSave(hourlyRateCents: number | null): boolean {
  return Boolean(hourlyRateCents);
}

export function RateEditor({
  hourlyRateCents,
  onChange,
  serviceFeeBps,
  breakdown,
}: {
  hourlyRateCents: number | null;
  /** ⚠ CENTS, or `null` for "cleared". Never dollars. */
  onChange: (next: number | null) => void;
  /* ⚠ `number`, NOT nullable. Widening it here would have been a prop type
     that lies about the caller: `rateBreakdown` and `bpsToPercentLabel` both
     take a plain number, and the wizard's `profile.serviceFeeBps` is one. */
  serviceFeeBps: number;
  /**
   * ⚠⚠ COMPUTED BY THE CALLER, NOT HERE. `rateBreakdown` is `lib/display.ts`'s
   * and the fee maths has ONE home; re-deriving it in a component is how two
   * screens start quoting different take-home figures.
   */
  breakdown: { rate: number | null; fee: number | null; youGet: number | null };
}) {
  const { rate, fee, youGet } = breakdown;
  return (
    <div className="max-w-md space-y-5">
      <Field label="Hourly Rate" hint="Total amount the client will see.">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-bold text-ink-2">
            $
          </span>
          <TextInput
            type="number"
            min="0"
            step="0.01"
            className="pl-8"
            value={hourlyRateCents != null ? String(hourlyRateCents / 100) : ""}
            onChange={(e) =>
              onChange(
                e.target.value === "" ? null : Math.round(Number(e.target.value) * 100)
              )
            }
            placeholder="125.00"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-ink-2">
            /hr
          </span>
        </div>
      </Field>

      <div className="rounded-brand border border-line p-5">
        <Row
          label={`Service fee (${bpsToPercentLabel(serviceFeeBps)})`}
          value={fee != null ? `−${formatCents(fee)}` : "—"}
        />
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          This helps us run the platform and provide services like payment
          protection and customer support. Fees vary and are shown before
          contract acceptance.{" "}
          <span className="font-semibold text-magenta">Learn More</span>
        </p>
        <div className="mt-4 border-t border-line pt-4">
          <Row
            label="You'll Get"
            value={youGet != null ? `${formatCents(youGet)}/hr` : "—"}
            strong
          />
          <p className="mt-1 text-[13px] text-ink-2">
            The estimated amount you&apos;ll receive after service fees.
          </p>
        </div>
        {rate != null && (
          <p className="mt-3 text-[13px] text-ink-2">
            Clients see {formatCents(rate)}/hr.
          </p>
        )}
      </div>
    </div>
  );
}
