import { validatePhone } from "@/lib/phone";
import { isUnitedStatesCountry } from "@/lib/country";

export type FormatCheck = {
  ok: boolean;
  /** Present only when `ok` is false. THE one string for this failure. */
  message?: string;
  /** What should be stored. Present when the value needed cleaning up. */
  normalised?: string | null;
};

const OK: FormatCheck = { ok: true };

export function isUnitedStates(country: string | null | undefined): boolean {
  return isUnitedStatesCountry(country);
}

export const US_ZIP_MESSAGE =
  "Enter a US ZIP code — 5 digits, or ZIP+4 as 12345-6789.";

const US_ZIP = /^\d{5}(-\d{4})?$/;

export function usZip(
  value: string | null | undefined,
  country: string | null | undefined
): FormatCheck {
  const zip = (value ?? "").trim();
  if (!zip) return OK;
  if (!isUnitedStates(country)) return OK;
  if (!US_ZIP.test(zip)) return { ok: false, message: US_ZIP_MESSAGE };
  return { ok: true, normalised: zip };
}

export const EIN_MESSAGE =
  "Enter an EIN as 9 digits — 12-3456789, or 123456789 without the hyphen.";

export function ein(
  value: string | null | undefined,
  country: string | null | undefined
): FormatCheck {
  const raw = (value ?? "").trim();
  if (!raw) return { ok: true, normalised: null };
  if (!isUnitedStates(country)) return OK;
  const digits = raw.replace(/[^\d]/g, "");
  if (!/^\d{2}-?\d{7}$/.test(raw) || digits.length !== 9) {
    return { ok: false, message: EIN_MESSAGE };
  }
  return { ok: true, normalised: `${digits.slice(0, 2)}-${digits.slice(2)}` };
}

/* ────────────────────────────────────────────────────────────────────────────
   PHONE — an adapter over lib/phone.ts, never a second implementation
   ──────────────────────────────────────────────────────────────────────────── */

/** THE LOGIC IS `lib/phone.ts`'s AND STAYS THERE. This exists only so a caller */
export function usPhone(
  value: string | null | undefined,
  country: string | null | undefined
): FormatCheck {
  const raw = (value ?? "").trim();
  if (!raw) return OK;
  const r = validatePhone(raw, country ?? null);
  return r.ok ? { ok: true } : { ok: false, message: r.reason };
}

/** Everything this module validates, for the harness to enumerate. */
export const FIELD_FORMATS = { usZip, ein, usPhone } as const;
