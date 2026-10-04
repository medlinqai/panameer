"use client";

import { Field, TextInput } from "@/components/onboarding/controls";
import { bpsToPercentLabel, formatCents } from "@/lib/display";

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

export function rateCanSave(hourlyRateCents: number | null): boolean {
  return Boolean(hourlyRateCents);
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
  onsiteRateCents?: number | null;
  remoteRateCents?: number | null;
  onChange: (next: number | null) => void;
  onOnsiteChange?: (next: number | null) => void;
  onRemoteChange?: (next: number | null) => void;
  serviceFeeBps: number;
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
      {}
      {onOnsiteChange && (
        <MoneyField
          label="Onsite rate"
          hint="Optional. What you charge when the work is at the client's site."
          cents={onsiteRateCents ?? null}
          onChange={onOnsiteChange}
          placeholder="150.00"
        />
      )}
      {onRemoteChange && (
        <MoneyField
          label="Offsite rate"
          hint="Optional. What you charge when the work is away from the client's site."
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
