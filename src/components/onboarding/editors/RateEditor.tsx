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

/**
 * ── ⚠⚠⚠ ONE MONEY INPUT, SO THE THREE CANNOT DRIFT APART (brief 10 WS-B) ──
 *
 * ⚠ The dollar sign, the `/hr` suffix, the cents conversion and the
 * empty-string-means-null rule were written once for the hourly field. ⚠⚠
 * Copying them twice for the two engagement rates would be `E585` in a
 * component — **three inputs kept in step by hand, where a change to the
 * conversion fixes one and leaves two.**
 */
function MoneyField({
  label,
  hint,
  cents,
  onChange,
  placeholder,
}: {
  label: string;
  hint: string;
  cents: number | null;
  onChange: (next: number | null) => void;
  placeholder: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-bold text-ink-2">
          $
        </span>
        <TextInput
          type="number"
          min="0"
          step="0.01"
          className="pl-8"
          value={cents != null ? String(cents / 100) : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Math.round(Number(e.target.value) * 100))
          }
          placeholder={placeholder}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-ink-2">
          /hr
        </span>
      </div>
    </Field>
  );
}

/**
 * ── ⚠⚠⚠ THREE RATES ARE EDITABLE, NOT ONE (brief 10 WS-B, ruling 64) ─────
 *
 * ⚠ SCOTT: **"only one rate is editable and visible (Hourly); that is a
 * defect."** ⚠⚠ The VISIBLE half was fixed at `E596` WS-G — the card renders
 * every column that is set. **THE EDITABLE HALF WAS NOT**, so a provider could
 * see an onsite rate on their own profile with no way to change it.
 *
 * ⚠⚠⚠ **NOTHING IS RELABELLED HERE, AND THAT IS RULING 64.** Scott, 2026-09-25:
 * *"Three rates — remote, hybrid, onsite"*, and **the stored shapes keep the
 * names they were entered under until the three-rate model lands with a
 * migration.** ⚠ So these are `Hourly`, `Onsite` and `Fully Remote` — **the
 * names the 18 populated profiles were filled in under** — and `Hybrid` does
 * not appear, because no column means it. **Relabelling would re-describe 16
 * hourly rates as onsite and 2 onsite rates as hybrid.**
 *
 * ⚠⚠ **NO NEW WRITER IS INVENTED.** The `rate` step has always accepted
 * `onsiteDollars`/`remoteDollars` — *"Settings (brief_H) still posts the
 * onsite/remote pair, so accept either shape"* — and the status endpoint has
 * always returned both. **Only the draft and this editor were missing.**
 */
export function RateEditor({
  hourlyRateCents,
  onsiteRateCents,
  remoteRateCents,
  onChange,
  onOnsiteChange,
  onRemoteChange,
  serviceFeeBps,
  breakdown,
}: {
  hourlyRateCents: number | null;
  /**
   * ── ⚠⚠⚠ THE TWO ENGAGEMENT RATES ARE OPT-IN, AND `tsc` IS WHY ───────────
   *
   * ⚠ Making them REQUIRED compiled everywhere except one place, and that place
   * was the right one to be told about: **the onboarding wizard**, which asks
   * for **a single required hourly rate on purpose** (`E018`).
   * ⚠⚠ **SO ABSENCE MEANS "THE WIZARD'S SHAPE" AND THE TWO FIELDS DO NOT
   * RENDER** — signup does not grow two questions because the profile grew two
   * controls. ⚠⚠⚠ **THAT IS THE PATTERN SCOTT ASKED FOR REPEATED:** *"A
   * forgetful sender being a compile error rather than a silent gap is worth
   * more than any check we could write after the fact."* The required type
   * found the one caller that had to be considered, and then it was made
   * optional **deliberately** rather than by default.
   */
  onsiteRateCents?: number | null;
  remoteRateCents?: number | null;
  /** ⚠ CENTS, or `null` for "cleared". Never dollars. */
  onChange: (next: number | null) => void;
  onOnsiteChange?: (next: number | null) => void;
  onRemoteChange?: (next: number | null) => void;
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
      <MoneyField
        label="Hourly Rate"
        hint="Total amount the client will see."
        cents={hourlyRateCents}
        onChange={onChange}
        placeholder="125.00"
      />
      {/*
        ⚠⚠ THE TWO ENGAGEMENT RATES. ⚠ Both are OPTIONAL — `rateCanSave` still
        requires only the hourly rate, so adding these cannot block a save that
        used to work. ⚠⚠⚠ AND THE HINTS SAY WHAT EACH ONE IS FOR RATHER THAN
        REPEATING THE LABEL, because a member who has only ever set one rate has
        no way to know what the other two are asking.
      */}
      {onOnsiteChange && (
        <MoneyField
          label="Onsite Rate"
          hint="Optional. What you charge when the work is at the client's site."
          cents={onsiteRateCents ?? null}
          onChange={onOnsiteChange}
          placeholder="150.00"
        />
      )}
      {onRemoteChange && (
        <MoneyField
          label="Fully Remote Rate"
          hint="Optional. What you charge when the work is entirely remote."
          cents={remoteRateCents ?? null}
          onChange={onRemoteChange}
          placeholder="110.00"
        />
      )}

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
