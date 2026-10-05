"use client";

import { Field, TextInput } from "@/components/onboarding/controls";
import { MAX_PROVIDER_FEE_BPS, bpsToPercentLabel, formatCents } from "@/lib/display";

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

// R-E002b: two rates only. Saveable when at least one is above $0.
export function rateCanSave(onsiteCents: number | null | undefined, remoteCents: number | null | undefined): boolean {
  return Boolean(onsiteCents) || Boolean(remoteCents);
}

/** The single hourly figure older readers still use: onsite first, else offsite. */
export function syncedHourly(onsiteCents: number | null | undefined, remoteCents: number | null | undefined): number | null {
  return onsiteCents || remoteCents || null;
}

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

export function RateEditor({
  onsiteRateCents,
  remoteRateCents,
  onOnsiteChange,
  onRemoteChange,
}: {
  onsiteRateCents: number | null;
  remoteRateCents: number | null;
  onOnsiteChange: (next: number | null) => void;
  onRemoteChange: (next: number | null) => void;
}) {
  return (
    <div className="max-w-md space-y-6">
      <RateBlock
        label="Onsite rate"
        hint="What you charge when the work is at the client's site."
        cents={onsiteRateCents}
        onChange={onOnsiteChange}
        placeholder="150.00"
      />
      <RateBlock
        label="Offsite rate"
        hint="What you charge when the work is away from the client's site."
        cents={remoteRateCents}
        onChange={onRemoteChange}
        placeholder="125.00"
      />
      <p className="text-[13px] leading-relaxed text-ink-2">
        Set one or both. The service fee helps us run the platform and provide payment protection and support. Fees
        vary and are shown before contract acceptance.
      </p>
    </div>
  );
}

function RateBlock({
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
  // Fees are tiered by how the work was found; show the net at the top tier.
  const fee = cents != null ? Math.round((cents * MAX_PROVIDER_FEE_BPS) / 10_000) : null;
  const youGet = cents != null && fee != null ? cents - fee : null;
  return (
    <div className="border-t border-line pt-4">
      <MoneyField label={label} hint={hint} cents={cents} onChange={onChange} placeholder={placeholder} />
      <div className="mt-2 space-y-1 text-[14px]">
        <Row label={`Service fee (up to ${bpsToPercentLabel(MAX_PROVIDER_FEE_BPS)})`} value={fee != null ? `−${formatCents(fee)}` : "—"} />
        <Row label="You'll get at least" value={youGet != null ? `${formatCents(youGet)}/hr` : "—"} strong />
      </div>
    </div>
  );
}
