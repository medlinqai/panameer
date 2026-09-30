/**
 * The country list, shared (Walk6 WS3 / E111).
 *
 * It lived inside `SignUpForm`, so the employer-location field had nothing to
 * validate against and took free text — which is how "Miami, FL" ends up in a
 * column that is supposed to be a country. One list, both places.
 *
 * Deliberately a curated list rather than all ~195: these are the markets
 * Panameer operates in, and "Other" catches the rest without pretending the
 * dropdown is exhaustive.
 * ⚠ THAT DECISION STANDS. `P1-ALL-E417` EXTENDS the list; it does not replace it
 * with ~195 entries, which would reverse a written decision and drag in postal
 * validation, `tax.ts` and the US-only entity lookup.
 *
 * ── ⚠⚠ THE ORDERING RULE, AND IT IS NOT ALPHABETICAL ────────────────────────
 *
 * The list is grouped into MARKET CLUSTERS, in rough priority order, and within
 * a cluster the larger market comes first:
 *
 *   North America (US · Canada) → UK & Ireland → Oceania (Australia · New
 *   Zealand) → India → Western/Central Europe (Germany · France · Netherlands ·
 *   Spain · Poland) → Latin America (Brazil · Mexico) → Singapore → THE GULF →
 *   South Africa → "Other", pinned last.
 *
 * ⚠ `E417` ADDED THE FIVE MISSING GCC STATES INSIDE THE GULF CLUSTER, beside the
 * United Arab Emirates, which was already here — so the rule is kept rather than
 * broken by appending them to the end. ⚠ NO EXISTING ENTRY MOVED: the UAE keeps
 * its position and the five follow it largest-first, the same within-cluster
 * ordering "United States · Canada" and "Germany · France · Netherlands" use.
 * ⚠ "Other" MUST STAY LAST — it is the escape hatch, not a country.
 */
/* ⚠ THE ONE LANGUAGE LIST (`E723`, `E585`). */
import { WORLD_LANGUAGES } from "@/lib/languages";

export const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Ireland",
  "Australia",
  "New Zealand",
  "India",
  "Germany",
  "France",
  "Netherlands",
  "Spain",
  "Poland",
  "Brazil",
  "Mexico",
  "Singapore",
  /*
    ⚠⚠ THE GULF CLUSTER (`P1-ALL-E417`). Scott's stated day-one markets are India
    and the Gulf, and five of the six GCC states were missing — so a person in
    Riyadh, Doha, Kuwait City, Muscat or Manama could not name their own country
    at the front door. ⚠ NONE OF THEM GETS A `COUNTRY_REGIONS` ENTRY, deliberately:
    absence renders an OPTIONAL free-text region field, which is the honest
    default for a subdivision set Panameer has not settled.
  */
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Oman",
  "Bahrain",
  "South Africa",
  "Other",
] as const;

/**
 * US states — the one subdivision set worth validating today, because most of
 * the catalog's work history is American. Everywhere else takes free text
 * rather than a dropdown that is wrong for the country selected.
 */
export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
] as const;

/**
 * Languages offered on the Languages step (Walk6 WS5 / E106).
 *
 * Was a free-text box, which collected "spanish", "Spanish (fluent)" and
 * "Espanol" as three different languages and made the field useless for
 * matching. Ordered by how often they turn up in this marketplace rather than
 * alphabetically — English is row zero and always present, so it is not here.
 */
/*
  ── ⚠⚠⚠ SUPERSEDED — THE LANGUAGE LIST MOVED TO `lib/languages.ts` (`P2-A2-E723`) ────────

  ⚠ **SCOTT: *"Language: a searchable list of world languages (ISO 639-1 names), one
  definition."*** ⚠⚠ This list was **43 languages plus `"Other"`**, and it lived in the
  COUNTRIES file — so the sign-up step read languages from a module about countries while the
  profile editor read free text from nowhere at all.
  ⚠⚠⚠ **`"Other"` IS GONE AND THAT IS DELIBERATE: it is the value that produces the rows this
  brief exists to stop.** A picklist whose escape hatch is `Other` records nothing a buyer can
  match on.
  ⚠ **RE-EXPORTED, NOT DELETED**, so the sign-up step's import keeps working and there is
  exactly one list (`E585`).
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   export const LANGUAGES = [
  //     "Spanish", "French", "German", "Portuguese", "Italian", "Dutch", "Polish",
  //     "Romanian", "Russian", "Ukrainian", "Arabic", "Hebrew", "Turkish",
  //     "Hindi", "Urdu", "Punjabi", "Bengali", "Tamil", "Telugu", "Marathi",
  //     "Gujarati", "Malayalam", "Kannada", "Mandarin", "Cantonese", "Japanese",
  //     "Korean", "Vietnamese", "Thai", "Tagalog", "Indonesian", "Malay",
  //     "Swedish", "Norwegian", "Danish", "Finnish", "Greek", "Czech", "Hungarian",
  //     "Afrikaans", "Zulu", "Swahili", "Other",
  //   ] as const;
  ⚠⚠ **TWO NAMES THE OLD LIST HAD THAT ISO 639-1 DOES NOT: `Mandarin` and `Cantonese`.**
  639-1 has `zh` = **Chinese** only; the two are 639-3 (`cmn`, `yue`). **REPORTED, NOT
  SILENTLY MAPPED** — nobody has either stored today (the live names are English ×3, German,
  and three malformed rows), so nothing is lost, but a provider who wants to say Cantonese
  now cannot. That is Scott's call, not mine to invent a 639-3 exception for.
*/
export const LANGUAGES = WORLD_LANGUAGES.map((l) => l.name);

/**
 * Subdivisions per country, for the dependent State/Region dropdown
 * (Walk6b WS2 / E123 · E126). Supersedes the US-only handling from E111.
 *
 * Only countries with a SETTLED, well-known list are here. A country absent
 * from this map gets a free-text field, which is the honest answer: a partial
 * or invented list of another country's regions is worse than an open box,
 * because the provider then can't enter the truth at all.
 */
/*
  ── ⚠⚠⚠ KEYED BY ISO-2 CODE NOW (`P2-A1.1-E729` WS-C, ruling 2) ──────────────────────────

  ⚠ **SCOTT: *"`COUNTRY_REGIONS` / `regionsFor` / `regionLabel` are keyed by code, and the US
  state picker still works."***
  ⚠⚠⚠ **THIS WAS THE WORST OF THE `"US"` BREAKS AND IT WAS SILENT.** `E728`'s inventory found
  it: the map was keyed on full names, so `regionsFor("US")` returned `null` and the US state
  DROPDOWN QUIETLY BECAME A FREE-TEXT BOX. ⚠ The seeds already write `"US"`, so that defect
  was live on seeded rows before any migration — the code column did not cause it, it exposed
  it.
  ⚠ SUPERSEDED, quoted not deleted (`E164`) — the ten keys were the display names:
  //   "United States" · Canada · Australia · "United Kingdom" · Ireland
  //   India · Germany · Mexico · Brazil · "South Africa"
*/
export const COUNTRY_REGIONS: Record<string, readonly string[]> = {
  US: US_STATES,
  CA: [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick",
    "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
    "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
    "Yukon",
  ],
  AU: [
    "Australian Capital Territory", "New South Wales", "Northern Territory",
    "Queensland", "South Australia", "Tasmania", "Victoria",
    "Western Australia",
  ],
  GB: ["England", "Scotland", "Wales", "Northern Ireland"],
  IE: [
    "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway", "Kerry",
    "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford", "Louth",
    "Mayo", "Meath", "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary",
    "Waterford", "Westmeath", "Wexford", "Wicklow",
  ],
  /*
    ── ⚠⚠ ALL 36 SUBDIVISIONS: 28 STATES + 8 UNION TERRITORIES (`P1-ALL-E417`) ─

    ⚠ SUPERSEDED, quoted not deleted — this list held 29 entries, the 28 states
    plus Delhi, and omitted the other seven union territories:
      "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
      "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
      "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
      "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
      "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
      "Uttarakhand", "West Bengal",

    ⚠⚠ THE OMISSION WAS A HARD BLOCK, NOT A COSMETIC GAP. Because India HAS a
    region list, `LocationFields.tsx` renders the field as REQUIRED — so a
    provider in Chandigarh, Puducherry, Srinagar, Leh, Port Blair, Kavaratti,
    Silvassa or Daman could not complete the step at all. They had no truthful
    value to select and no free-text field to fall back to.

    ── ⚠ SOURCE, NAMED AND MACHINE-CHECKED ─────────────────────────────────────

    ISO 3166-2:IN, via Unicode CLDR's machine-readable copy — the union of
    `common/validity/subdivision.xml` (which codes are CURRENT) and
    `common/subdivisions/en.xml` (their English names). Fetched 2026-09-12:
    36 codes marked `regular`, and 6 marked `deprecated` which are deliberately
    NOT here — IN-CT superseded by IN-CG (Chhattisgarh), IN-OR by IN-OD
    (Odisha), IN-TG by IN-TS (Telangana), IN-UT by IN-UK (Uttarakhand), and
    IN-DD (Daman and Diu) + IN-DN (Dadra and Nagar Haveli) MERGED into IN-DH,
    the single territory created in 2020. ⚠ A list carrying the pre-2020 pair
    would be two wrong answers, not one extra.
    Corroborated for the 28 + 8 split and the UT names by the Government of
    India's National Portal (india.gov.in / knowindia "States and UTs") and the
    Ministry of Home Affairs, which record 8 union territories — three with
    legislatures (NCT of Delhi, Jammu and Kashmir, Puducherry) and five without.

    ⚠ SPELLINGS ARE ASCII, matching the entries already here and the other
    countries in this map. CLDR carries diacritics on three of these names
    (Chhattīsgarh, Telangāna, Uttarākhand); adopting them would have silently
    changed the stored value for every existing Indian provider.
    ⚠ ALPHABETICAL, like every other list in this map — states and union
    territories interleaved rather than in two blocks, because the field is one
    dropdown a person scans for their own subdivision, not a civics lesson.
    ⚠ UNION TERRITORIES ARE MARKED IN COMMENTS ONLY. `regionLabel()` still
    returns "State" for India — see the note there; changing the LABEL is a
    copy decision, reported and not taken here.
  */
  IN: [
    "Andaman and Nicobar Islands", // UT
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chandigarh", // UT
    "Chhattisgarh",
    "Dadra and Nagar Haveli and Daman and Diu", // UT (IN-DH, merged 2020)
    "Delhi", // UT (NCT)
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jammu and Kashmir", // UT
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Ladakh", // UT
    "Lakshadweep", // UT
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Puducherry", // UT
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
  ],
  DE: [
    "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen",
    "Hamburg", "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern",
    "North Rhine-Westphalia", "Rhineland-Palatinate", "Saarland", "Saxony",
    "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia",
  ],
  MX: [
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
    "Chiapas", "Chihuahua", "Coahuila", "Colima", "Durango", "Guanajuato",
    "Guerrero", "Hidalgo", "Jalisco", "México", "Mexico City", "Michoacán",
    "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
    "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco",
    "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
  ],
  BR: [
    "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal",
    "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul",
    "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí",
    "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia",
    "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins",
  ],
  ZA: [
    "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
    "Mpumalanga", "North West", "Northern Cape", "Western Cape",
  ],
};

/** Does this country have a settled subdivision list to pick from? */
export function regionsFor(code: string | null | undefined): readonly string[] | null {
  if (!code) return null;
  /* ⚠⚠ UPPER-CASED, BECAUSE A STORED CODE IS NOT GUARANTEED TO BE. `isUnitedStates` was
     case-SENSITIVE before `E729` and `"us"` slipped past it; the same trap, avoided here. */
  return COUNTRY_REGIONS[code.trim().toUpperCase()] ?? null;
}

/**
 * What to call the second line, per country. "State" is not universal.
 *
 * ── ⚠ INDIA STILL SAYS "State" AND `E417` DID NOT CHANGE IT ─────────────────
 *
 * The brief asked whether that is still right now that the eight union
 * territories are in the list. ⚠ IT IS NOT STRICTLY CORRECT — Chandigarh,
 * Puducherry and Delhi are not states, and a person in Leh reading "State *"
 * is being asked a question with no true answer in their own terms.
 *
 * ⚠ RECOMMENDED, NOT TAKEN: `"State / Union territory"`. It is exact, it matches
 * how this function already handles the same problem elsewhere ("State /
 * Province" for Australia and South Africa, "Nation" for the UK), and the field
 * label is the only thing that changes — no stored value moves.
 * ⚠ WHY IT IS A REPORT AND NOT A COMMIT: it is user-visible copy on the screen
 * Scott is walking, and `regionLabel` is shared by the employer modal, the
 * address block and the work-location step, so the wording turns up in three
 * places at once. Scott's call.
 */
export function regionLabel(code: string | null | undefined): string {
  /* ⚠ SUPERSEDED, quoted not deleted (`E164`) — it switched on the display name, so a stored
     code fell to the default and every US address read "State / Region":
     //   switch (country) { case "United States": case "Brazil": … } */
  switch (code?.trim().toUpperCase()) {
    case "US":
    case "BR":
    case "MX":
    case "IN":
      return "State";
    case "CA":
      return "Province";
    case "AU":
    case "ZA":
      return "State / Province";
    case "GB":
      return "Nation";
    case "IE":
      return "County";
    default:
      return "State / Region";
  }
}
