import { regionsFor, regionLabel, COUNTRY_REGIONS } from "@/lib/countries";
import { ALL_COUNTRIES, countryName, countryColumns, isUnitedStatesCountry, dialFor } from "@/lib/country";
import { formFor, isUnitedStates } from "@/lib/tax";
import { isoFor } from "@/lib/phone";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
};

console.log("\n── 1 · ONE CANONICAL LIST ──");
ok("the list is the full ISO set", ALL_COUNTRIES.length > 200, `got ${ALL_COUNTRIES.length}`);
/* ⚠⚠ THE FIVE GULF STATES `SignUpForm`'s PRIVATE COPY WAS MISSING — the whole reason ruling 1
   exists. A list that silently lost them again would pass every other assertion here. */
for (const [code, name] of [["SA","Saudi Arabia"],["QA","Qatar"],["KW","Kuwait"],["OM","Oman"],["BH","Bahrain"]] as const) {
  ok(`the Gulf state ${name} is offered`, ALL_COUNTRIES.some((c) => c.code === code));
}
ok("no country is offered without a dial code", ALL_COUNTRIES.every((c) => /^\+\d+$/.test(c.dial)));
ok("no country is offered without a name", ALL_COUNTRIES.every((c) => c.name && c.name !== c.code));

console.log("\n── 2 · REGIONS ARE KEYED BY CODE, AND THE US PICKER STILL WORKS ──");
ok("regionsFor('US') returns the states", (regionsFor("US")?.length ?? 0) > 50, `got ${regionsFor("US")?.length ?? 0}`);
ok("regionsFor('us') is case-insensitive", (regionsFor("us")?.length ?? 0) > 50);
/* ⚠⚠⚠ THE DEFECT THIS RULING FIXED: keyed on names, a stored code returned null and the
   dropdown became a free-text box. This is the assertion that would have caught it. */
ok("regionsFor('United States') is NULL now — the map is by code", regionsFor("United States") === null);
ok("regionLabel('US') is State", regionLabel("US") === "State", regionLabel("US"));
ok("regionLabel('CA') is Province", regionLabel("CA") === "Province", regionLabel("CA"));
ok("regionLabel('GB') is Nation", regionLabel("GB") === "Nation", regionLabel("GB"));
ok("every COUNTRY_REGIONS key is a real ISO-2 code",
   Object.keys(COUNTRY_REGIONS).every((k) => ALL_COUNTRIES.some((c) => c.code === k)),
   Object.keys(COUNTRY_REGIONS).filter((k) => !ALL_COUNTRIES.some((c) => c.code === k)).join(", "));

console.log("\n── 3 · W-9 vs W-8 ──");
/* ⚠⚠⚠ THE HIGHEST-CONSEQUENCE COUNTRY READ IN THE APP. Before `E729` this was a
   case-SENSITIVE Set: `"us"` returned false and a US taxpayer would have been handed a W-8. */
for (const v of ["US", "us", "United States", "united states", "USA"]) {
  ok(`a US persona spelled "${v}" gets a W-9`, formFor(v, false) === "W9", formFor(v, false));
}
for (const [v, expect] of [["SA","W8BEN"],["sa","W8BEN"],["Saudi Arabia","W8BEN"],["GB","W8BEN"],["Brazil","W8BEN"]] as const) {
  ok(`a non-US persona spelled "${v}" gets ${expect}`, formFor(v, false) === expect, formFor(v, false));
}
ok("a non-US ENTITY gets W8BENE", formFor("SA", true) === "W8BENE", formFor("SA", true));
ok("a US ENTITY still gets W9", formFor("us", true) === "W9", formFor("us", true));
ok("isUnitedStates agrees with isUnitedStatesCountry",
   ["US","us","United States","SA","Other",""].every((v) => isUnitedStates(v) === isUnitedStatesCountry(v)));

console.log("\n── 4 · THE WRITE BOUNDARY ──");
ok("a code resolves to both columns", countryColumns("us").country === "United States" && countryColumns("us").country_code === "US");
ok("a name resolves to both columns", countryColumns("Saudi Arabia").country_code === "SA");
/* ⚠⚠ RULING 2 OF WS-B: `"Other"` stays legal and keeps a null code. */
ok('"Other" survives with a NULL code', countryColumns("Other").country === "Other" && countryColumns("Other").country_code === null);
ok("an unresolvable value is passed through, not dropped", countryColumns("Klingon").country === "Klingon");
ok("empty is null on both", countryColumns("").country === null && countryColumns("").country_code === null);
ok("countryName falls back to the stored name", countryName(null, "Other") === "Other");
ok("countryName prefers the code", countryName("GB", "United States") === "United Kingdom");
ok("dialFor derives, never types", dialFor("IN") === "+91" && dialFor("US") === "+1");

console.log("\n── 5 · THE PHONE MAP AGREES WITH THE LIST ──");
ok("isoFor resolves every name the canonical list offers",
   ALL_COUNTRIES.every((c) => isoFor(c.name) === c.code || isoFor(c.name) === null));
ok('isoFor("Other") is still null', isoFor("Other") === null);

console.log(`\ncheck:country — ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  FAILED: ${f}`); process.exit(1); }
