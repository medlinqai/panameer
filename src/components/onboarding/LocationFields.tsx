"use client";

import { Field, TextInput } from "@/components/onboarding/controls";
import { regionsFor, regionLabel } from "@/lib/countries";
import { ALL_COUNTRIES, countryName } from "@/lib/country";

export type LocationValue = {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  line1?: string | null;
  postalCode?: string | null;
};

const SELECT =
  "w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta";

export function LocationFields({
  value,
  onChange,
  /** The address block also collects a street line and a postcode. */
  withStreet = false,
  part = "all",
  countryHint,
}: {
  value: LocationValue;
  onChange: (patch: LocationValue) => void;
  withStreet?: boolean;
  part?: "all" | "country" | "rest";
  countryHint?: string;
}) {
  const country = value.country ?? "";
  const regions = regionsFor(country);

  const country_field = (
      <Field label="Country *" hint={countryHint}>
        <select
          value={country}
          onChange={(e) => {
            // Changing country invalidates a region picked from the old
            // country's list — leaving "Ontario" under "Germany" would be worse
            // than an empty field, and the provider is right here to re-pick.
            const next = e.target.value;
            onChange(
              regionsFor(next) === regions && next === country
                ? { country: next }
                : { country: next, state: "" }
            );
          }}
          className={SELECT}
        >
          {}
          <option value="">Choose a country…</option>
          {country && !ALL_COUNTRIES.some((c) => c.code === country) && (
            <option value={country}>{countryName(country, country)}</option>
          )}
          {ALL_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
  );

  return (
    <>
      {part !== "rest" && country_field}
      {part === "country" ? null : (
        <>
      {withStreet && (
        <Field label="Street Address">
          <TextInput
            value={value.line1 ?? ""}
            onChange={(e) => onChange({ line1: e.target.value })}
          />
        </Field>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="City">
          <TextInput
            value={value.city ?? ""}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder={country.toUpperCase() === "US" ? "Chicago" : "City"}
          />
        </Field>

        <Field label={regions ? `${regionLabel(country)} *` : regionLabel(country)}>
          {regions ? (
            <select
              value={value.state ?? ""}
              onChange={(e) => onChange({ state: e.target.value })}
              className={SELECT}
            >
              <option value="">
                Choose a {regionLabel(country).toLowerCase()}…
              </option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          ) : (
            // No settled list for this country — an open field, not a wrong one.
            <TextInput
              value={value.state ?? ""}
              onChange={(e) => onChange({ state: e.target.value })}
              placeholder={country ? regionLabel(country) : "Choose a country first"}
              disabled={!country}
            />
          )}
        </Field>
      </div>

      {withStreet && (
        <Field label="ZIP / Postal Code">
          <TextInput
            value={value.postalCode ?? ""}
            onChange={(e) => onChange({ postalCode: e.target.value })}
          />
        </Field>
      )}
        </>
      )}
    </>
  );
}
