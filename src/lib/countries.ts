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
 */
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
  "United Arab Emirates",
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
export const LANGUAGES = [
  "Spanish", "French", "German", "Portuguese", "Italian", "Dutch", "Polish",
  "Romanian", "Russian", "Ukrainian", "Arabic", "Hebrew", "Turkish",
  "Hindi", "Urdu", "Punjabi", "Bengali", "Tamil", "Telugu", "Marathi",
  "Gujarati", "Malayalam", "Kannada", "Mandarin", "Cantonese", "Japanese",
  "Korean", "Vietnamese", "Thai", "Tagalog", "Indonesian", "Malay",
  "Swedish", "Norwegian", "Danish", "Finnish", "Greek", "Czech", "Hungarian",
  "Afrikaans", "Zulu", "Swahili", "Other",
] as const;

/**
 * Subdivisions per country, for the dependent State/Region dropdown
 * (Walk6b WS2 / E123 · E126). Supersedes the US-only handling from E111.
 *
 * Only countries with a SETTLED, well-known list are here. A country absent
 * from this map gets a free-text field, which is the honest answer: a partial
 * or invented list of another country's regions is worse than an open box,
 * because the provider then can't enter the truth at all.
 */
export const COUNTRY_REGIONS: Record<string, readonly string[]> = {
  "United States": US_STATES,
  Canada: [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick",
    "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
    "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
    "Yukon",
  ],
  Australia: [
    "Australian Capital Territory", "New South Wales", "Northern Territory",
    "Queensland", "South Australia", "Tasmania", "Victoria",
    "Western Australia",
  ],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  Ireland: [
    "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway", "Kerry",
    "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford", "Louth",
    "Mayo", "Meath", "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary",
    "Waterford", "Westmeath", "Wexford", "Wicklow",
  ],
  India: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal",
  ],
  Germany: [
    "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen",
    "Hamburg", "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern",
    "North Rhine-Westphalia", "Rhineland-Palatinate", "Saarland", "Saxony",
    "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia",
  ],
  Mexico: [
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
    "Chiapas", "Chihuahua", "Coahuila", "Colima", "Durango", "Guanajuato",
    "Guerrero", "Hidalgo", "Jalisco", "México", "Mexico City", "Michoacán",
    "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
    "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco",
    "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
  ],
  Brazil: [
    "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal",
    "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul",
    "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí",
    "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia",
    "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins",
  ],
  "South Africa": [
    "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
    "Mpumalanga", "North West", "Northern Cape", "Western Cape",
  ],
};

/** Does this country have a settled subdivision list to pick from? */
export function regionsFor(country: string | null | undefined): readonly string[] | null {
  if (!country) return null;
  return COUNTRY_REGIONS[country] ?? null;
}

/** What to call the second line, per country. "State" is not universal. */
export function regionLabel(country: string | null | undefined): string {
  switch (country) {
    case "United States":
    case "Brazil":
    case "Mexico":
    case "India":
      return "State";
    case "Canada":
      return "Province";
    case "Australia":
    case "South Africa":
      return "State / Province";
    case "United Kingdom":
      return "Nation";
    case "Ireland":
      return "County";
    default:
      return "State / Region";
  }
}
