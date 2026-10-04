"use client";

import { Field, TextInput } from "@/components/onboarding/controls";
/* ⚠ THE ONE CANONICAL LIST AND THE ONE RESOLVER (`E729` WS-C). `COUNTRIES` is no longer
   read here — the picker offers all 245 by code. */
import { regionsFor, regionLabel } from "@/lib/countries";
import { ALL_COUNTRIES, countryName } from "@/lib/country";

/**
 * Country-first location fields (Walk6b WS2 / E123 · E126).
 *
 * ONE component for the employer modal AND the Photo & Details address block,
 * because they are the same question and were drifting: the employer modal had a
 * US-only state dropdown (the E111 deviation) while Your Details had free text
 * and put Country last, so the same provider met two different location forms in
 * one sitting.
 *
 * COUNTRY LEADS, and that is the substance rather than the styling. It decides
 * what the next field even means — "State" in the US, "Province" in Canada,
 * "County" in Ireland — so asking it last means asking the other fields before
 * knowing what they are. It also gates whether a region list exists at all.
 *
 * ON CITY: still free text, deliberately, and flagged. A real city control needs
 * a validated typeahead against a cities dataset; there isn't one in the tree and
 * adding a network call to the onboarding form is a bigger decision than this
 * brief. The brief's own instruction was to flag it rather than fake a dropdown,
 * so that is what this does — an honest text field beats a `<select>` that can't
 * contain the user's city.
 */
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
  /*
    WHICH HALF TO RENDER (`P2-J1.4-E825`, R-E005). Scott's order is Country →
    Phone → Street → City → State/Province → Postal, and the phone field is not
    part of an address. Rather than move Phone inside this component — it is not
    a location — a caller can draw `"country"`, then its own field, then
    `"rest"`. `"all"` is unchanged and is what every other caller gets.
  */
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
          {/*
            ── ⚠⚠⚠ THE VALUE IS THE CODE; THE LABEL IS THE NAME (`P2-A1.1-E729` WS-C) ──────

            ⚠ **SCOTT: *"The picker (LocationFields) stores and reads the code, showing the
            name."*** ⚠⚠ **AND IT IS NOW ALL 245 COUNTRIES, NOT 23** — `ALL_COUNTRIES` is the
            one canonical list, alphabetical by the name a member reads.
            ⚠⚠⚠ **`"Other"` IS NOT AN OPTION ANY MORE AND THE SEVEN ROWS THAT HOLD IT ARE NOT
            BROKEN:** the guard below keeps a stored value that is not in the list as its own
            option, so those members see what is stored and can replace it. **A picker that
            silently blanked their country would look like data loss.**
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   <option value="">Choose a country…</option>
            //   {COUNTRIES.map((c) => (<option key={c} value={c}>{c}</option>))}
          */}
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
            /* ⚠ THE CODE, NOT THE NAME (`E729`). ⚠ SUPERSEDED (`E164`):
               //   placeholder={country === "United States" ? "Chicago" : "City"} */
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
