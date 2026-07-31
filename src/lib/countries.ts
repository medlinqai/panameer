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
