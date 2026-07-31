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
