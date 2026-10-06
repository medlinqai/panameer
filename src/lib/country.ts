import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { isoFor } from "@/lib/phone";

const DISPLAY = new Intl.DisplayNames(["en"], { type: "region" });

export type Country = { code: CountryCode; name: string; dial: string };

/** All 245, alphabetical by the name a member actually reads — not by code. */
export const ALL_COUNTRIES: readonly Country[] = getCountries()
  .map((code) => ({
    code,
    name: DISPLAY.of(code) ?? code,
    dial: `+${getCountryCallingCode(code)}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const BY_CODE = new Map(ALL_COUNTRIES.map((c) => [c.code as string, c]));

/** THE ONE FUNCTION EVERY READER SWITCHES TO */
export function countryName(
  code: string | null | undefined,
  storedName?: string | null
): string | null {
  if (code) {
    const hit = BY_CODE.get(code.toUpperCase());
    if (hit) return hit.name;
  }
  return storedName ?? null;
}

/** The dial code for a stored ISO-2 code, or null. Derived, never typed. */
export function dialFor(code: string | null | undefined): string | null {
  if (!code) return null;
  return BY_CODE.get(code.toUpperCase())?.dial ?? null;
}

export function codeForName(name: string | null | undefined): CountryCode | null {
  if (!name) return null;
  const t = name.trim();
  const exact = ALL_COUNTRIES.find((c) => c.name === t);
  if (exact) return exact.code;
  const lower = t.toLowerCase();
  return ALL_COUNTRIES.find((c) => c.name.toLowerCase() === lower)?.code ?? null;
}

/** THE ONE WRITE BOUNDARY WS-C) */
export function countryColumns(
  input: string | null | undefined
): { country: string | null; country_code: string | null } {
  const raw = input?.trim();
  if (!raw) return { country: null, country_code: null };
  /* A code first — the picker is the common caller and sends two characters. */
  const asCode = BY_CODE.get(raw.toUpperCase());
  if (asCode) return { country: asCode.name, country_code: asCode.code };
  /* THEN A NAME, so an older client or an API caller still resolves. */
  const asName = codeForName(raw);
  if (asName) return { country: BY_CODE.get(asName)!.name, country_code: asName };
  // THEN THE ALIASES, AND THIS ONE WAS CAUGHT BY A GATE
  const viaAlias = isoFor(raw);
  if (viaAlias) {
    const hit = BY_CODE.get(viaAlias);
    if (hit) return { country: hit.name, country_code: hit.code };
  }
  return { country: raw, country_code: null };
}

export function isUnitedStatesCountry(value: string | null | undefined): boolean {
  return countryColumns(value).country_code === "US";
}
