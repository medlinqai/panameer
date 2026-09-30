/**
 * ── ⚠⚠⚠ LANGUAGES AND PROFICIENCY — ONE DEFINITION (`P2-A2-E723` items 10–12) ────────────
 *
 * ⚠ **SCOTT: *"Languages: two picklists, not free text (`/profile/edit/languages` and the
 * onboarding languages step, one shared definition, `E585`)."***
 *
 * ⚠⚠ **BOTH SURFACES IMPORT FROM HERE AND NEITHER DECLARES A LIST OF ITS OWN.** The
 * onboarding step and the profile editor are the same component
 * (`EducationLanguagesEditor`), which is already `E585`-correct; what this file adds is that
 * the *vocabulary* is single too, so a language added here appears in both without a second
 * edit.
 *
 * ── ⚠⚠⚠ WHY A `<select>` AND NOT A FREE-TEXT BOX WITH A `<datalist>` ────────────────────
 *
 * ⚠ A `<datalist>` suggests but still accepts anything typed. ⚠⚠ **SCOTT'S WORDS ARE
 * *"picklists, not free text"*, and the live data shows exactly why:** stored names include
 * `"Spanish Native"`, `"English Advanced intermediate"` and `"German Basic"` — **the
 * proficiency got typed into the NAME field**, because both boxes were free text and nothing
 * stopped it. ⚠⚠⚠ **A `<select>` cannot record that.** Native type-ahead makes a 180-option
 * select searchable without a combobox component.
 */

/**
 * ISO 639-1 language names.
 *
 * ⚠ **THE NAME IS WHAT IS STORED**, not the code: `Language.name` is a `String` and already
 * holds names (`"English"`, `"German"`), and ruling 38 is additive-only — **changing what the
 * column means would be a migration of live rows.** ⚠⚠ The codes are carried anyway because
 * they are the stable identity if that ever changes, and because they make this list
 * checkable against the standard rather than against somebody's memory.
 */
export const WORLD_LANGUAGES: readonly { code: string; name: string }[] = [
  { code: "ab", name: "Abkhazian" }, { code: "aa", name: "Afar" }, { code: "af", name: "Afrikaans" },
  { code: "ak", name: "Akan" }, { code: "sq", name: "Albanian" }, { code: "am", name: "Amharic" },
  { code: "ar", name: "Arabic" }, { code: "an", name: "Aragonese" }, { code: "hy", name: "Armenian" },
  { code: "as", name: "Assamese" }, { code: "av", name: "Avaric" }, { code: "ae", name: "Avestan" },
  { code: "ay", name: "Aymara" }, { code: "az", name: "Azerbaijani" }, { code: "bm", name: "Bambara" },
  { code: "ba", name: "Bashkir" }, { code: "eu", name: "Basque" }, { code: "be", name: "Belarusian" },
  { code: "bn", name: "Bengali" }, { code: "bi", name: "Bislama" }, { code: "bs", name: "Bosnian" },
  { code: "br", name: "Breton" }, { code: "bg", name: "Bulgarian" }, { code: "my", name: "Burmese" },
  { code: "ca", name: "Catalan" }, { code: "ch", name: "Chamorro" }, { code: "ce", name: "Chechen" },
  { code: "ny", name: "Chichewa" }, { code: "zh", name: "Chinese" }, { code: "cu", name: "Church Slavonic" },
  { code: "cv", name: "Chuvash" }, { code: "kw", name: "Cornish" }, { code: "co", name: "Corsican" },
  { code: "cr", name: "Cree" }, { code: "hr", name: "Croatian" }, { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" }, { code: "dv", name: "Divehi" }, { code: "nl", name: "Dutch" },
  { code: "dz", name: "Dzongkha" }, { code: "en", name: "English" }, { code: "eo", name: "Esperanto" },
  { code: "et", name: "Estonian" }, { code: "ee", name: "Ewe" }, { code: "fo", name: "Faroese" },
  { code: "fj", name: "Fijian" }, { code: "fi", name: "Finnish" }, { code: "fr", name: "French" },
  { code: "fy", name: "Western Frisian" }, { code: "ff", name: "Fulah" }, { code: "gd", name: "Gaelic" },
  { code: "gl", name: "Galician" }, { code: "lg", name: "Ganda" }, { code: "ka", name: "Georgian" },
  { code: "de", name: "German" }, { code: "el", name: "Greek" }, { code: "kl", name: "Kalaallisut" },
  { code: "gn", name: "Guarani" }, { code: "gu", name: "Gujarati" }, { code: "ht", name: "Haitian" },
  { code: "ha", name: "Hausa" }, { code: "he", name: "Hebrew" }, { code: "hz", name: "Herero" },
  { code: "hi", name: "Hindi" }, { code: "ho", name: "Hiri Motu" }, { code: "hu", name: "Hungarian" },
  { code: "is", name: "Icelandic" }, { code: "io", name: "Ido" }, { code: "ig", name: "Igbo" },
  { code: "id", name: "Indonesian" }, { code: "ia", name: "Interlingua" }, { code: "ie", name: "Interlingue" },
  { code: "iu", name: "Inuktitut" }, { code: "ik", name: "Inupiaq" }, { code: "ga", name: "Irish" },
  { code: "it", name: "Italian" }, { code: "ja", name: "Japanese" }, { code: "jv", name: "Javanese" },
  { code: "kn", name: "Kannada" }, { code: "kr", name: "Kanuri" }, { code: "ks", name: "Kashmiri" },
  { code: "kk", name: "Kazakh" }, { code: "km", name: "Central Khmer" }, { code: "ki", name: "Kikuyu" },
  { code: "rw", name: "Kinyarwanda" }, { code: "ky", name: "Kyrgyz" }, { code: "kv", name: "Komi" },
  { code: "kg", name: "Kongo" }, { code: "ko", name: "Korean" }, { code: "kj", name: "Kuanyama" },
  { code: "ku", name: "Kurdish" }, { code: "lo", name: "Lao" }, { code: "la", name: "Latin" },
  { code: "lv", name: "Latvian" }, { code: "li", name: "Limburgan" }, { code: "ln", name: "Lingala" },
  { code: "lt", name: "Lithuanian" }, { code: "lu", name: "Luba-Katanga" }, { code: "lb", name: "Luxembourgish" },
  { code: "mk", name: "Macedonian" }, { code: "mg", name: "Malagasy" }, { code: "ms", name: "Malay" },
  { code: "ml", name: "Malayalam" }, { code: "mt", name: "Maltese" }, { code: "gv", name: "Manx" },
  { code: "mi", name: "Maori" }, { code: "mr", name: "Marathi" }, { code: "mh", name: "Marshallese" },
  { code: "mn", name: "Mongolian" }, { code: "na", name: "Nauru" }, { code: "nv", name: "Navajo" },
  { code: "nd", name: "North Ndebele" }, { code: "nr", name: "South Ndebele" }, { code: "ng", name: "Ndonga" },
  { code: "ne", name: "Nepali" }, { code: "no", name: "Norwegian" }, { code: "nb", name: "Norwegian Bokmål" },
  { code: "nn", name: "Norwegian Nynorsk" }, { code: "ii", name: "Sichuan Yi" }, { code: "oc", name: "Occitan" },
  { code: "oj", name: "Ojibwa" }, { code: "or", name: "Oriya" }, { code: "om", name: "Oromo" },
  { code: "os", name: "Ossetian" }, { code: "pi", name: "Pali" }, { code: "ps", name: "Pashto" },
  { code: "fa", name: "Persian" }, { code: "pl", name: "Polish" }, { code: "pt", name: "Portuguese" },
  { code: "pa", name: "Punjabi" }, { code: "qu", name: "Quechua" }, { code: "ro", name: "Romanian" },
  { code: "rm", name: "Romansh" }, { code: "rn", name: "Rundi" }, { code: "ru", name: "Russian" },
  { code: "se", name: "Northern Sami" }, { code: "sm", name: "Samoan" }, { code: "sg", name: "Sango" },
  { code: "sa", name: "Sanskrit" }, { code: "sc", name: "Sardinian" }, { code: "sr", name: "Serbian" },
  { code: "sn", name: "Shona" }, { code: "sd", name: "Sindhi" }, { code: "si", name: "Sinhala" },
  { code: "sk", name: "Slovak" }, { code: "sl", name: "Slovenian" }, { code: "so", name: "Somali" },
  { code: "st", name: "Southern Sotho" }, { code: "es", name: "Spanish" }, { code: "su", name: "Sundanese" },
  { code: "sw", name: "Swahili" }, { code: "ss", name: "Swati" }, { code: "sv", name: "Swedish" },
  { code: "tl", name: "Tagalog" }, { code: "ty", name: "Tahitian" }, { code: "tg", name: "Tajik" },
  { code: "ta", name: "Tamil" }, { code: "tt", name: "Tatar" }, { code: "te", name: "Telugu" },
  { code: "th", name: "Thai" }, { code: "bo", name: "Tibetan" }, { code: "ti", name: "Tigrinya" },
  { code: "to", name: "Tonga" }, { code: "ts", name: "Tsonga" }, { code: "tn", name: "Tswana" },
  { code: "tr", name: "Turkish" }, { code: "tk", name: "Turkmen" }, { code: "tw", name: "Twi" },
  { code: "ug", name: "Uighur" }, { code: "uk", name: "Ukrainian" }, { code: "ur", name: "Urdu" },
  { code: "uz", name: "Uzbek" }, { code: "ve", name: "Venda" }, { code: "vi", name: "Vietnamese" },
  { code: "vo", name: "Volapük" }, { code: "wa", name: "Walloon" }, { code: "cy", name: "Welsh" },
  { code: "wo", name: "Wolof" }, { code: "xh", name: "Xhosa" }, { code: "yi", name: "Yiddish" },
  { code: "yo", name: "Yoruba" }, { code: "za", name: "Zhuang" }, { code: "zu", name: "Zulu" },
] as const;

/** ⚠ For an O(1) membership test when validating a save. */
export const LANGUAGE_NAMES: ReadonlySet<string> = new Set(WORLD_LANGUAGES.map((l) => l.name));

/**
 * ── ⚠⚠⚠ THE FIVE PROFICIENCIES, IN SCOTT'S DISPLAY ORDER ────────────────────────────────
 *
 * ⚠ **SCOTT, 2026-09-30: *"keep the order Native · Fluent · Professional · Conversational ·
 * Beginner in the picklist, whatever order the values are stored in."*** ⚠⚠ **SO THIS ARRAY
 * IS THE ORDER, AND THE ENUM'S OWN ORDER IS IRRELEVANT** — which is why the picklist reads
 * from here and never from `Object.values(LanguageProficiency)`.
 *
 * ⚠⚠⚠ **`PROFESSIONAL` WAS ADDED TO THE ENUM ON SCOTT'S EXPLICIT APPROVAL (2026-09-30).** The
 * other four already existed. `ALTER TYPE … ADD VALUE` adds and removes nothing, so it is
 * within ruling 38's additive-only rule; **all 7 live rows already fit the values that
 * existed, so nothing needed remapping.**
 */
export const PROFICIENCY_OPTIONS = [
  { value: "NATIVE_OR_BILINGUAL", label: "Native" },
  { value: "FLUENT", label: "Fluent" },
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "CONVERSATIONAL", label: "Conversational" },
  { value: "BASIC", label: "Beginner" },
] as const;

export type ProficiencyValue = (typeof PROFICIENCY_OPTIONS)[number]["value"];

/** ⚠ The stored enum value → the word a member reads. One table, both directions. */
export const PROFICIENCY_LABEL: Record<string, string> = Object.fromEntries(
  PROFICIENCY_OPTIONS.map((o) => [o.value, o.label])
);

export function isProficiency(v: unknown): v is ProficiencyValue {
  return typeof v === "string" && PROFICIENCY_OPTIONS.some((o) => o.value === v);
}

/**
 * ── ⚠⚠ THE LEGACY FREE TEXT → THE ENUM, FOR THE OBVIOUS CASES ONLY ──────────────────────
 *
 * ⚠ **SCOTT: *"Map the obvious ones (e.g. 'fluent' → Fluent) and leave anything ambiguous
 * untouched and reported."***
 * ⚠⚠⚠ **IT RETURNS `null` RATHER THAN GUESSING, AND THAT IS THE POINT.** A wrong proficiency
 * is a claim about a person's competence on the page Panameer sells on; *"Advanced
 * intermediate"* is not obviously any of the five, so it is left alone and reported.
 * ⚠ **NOTHING CALLS THIS AS A WRITER.** It exists so a migration can be proposed with real
 * numbers; no row is rewritten by this brief.
 */
export function mapLegacyProficiency(text: string | null | undefined): ProficiencyValue | null {
  if (!text) return null;
  const t = text.trim().toLowerCase();
  if (t === "native" || t === "native or bilingual" || t === "bilingual" || t === "mother tongue")
    return "NATIVE_OR_BILINGUAL";
  if (t === "fluent") return "FLUENT";
  if (t === "professional" || t === "professional working" || t === "working") return "PROFESSIONAL";
  if (t === "conversational") return "CONVERSATIONAL";
  if (t === "beginner" || t === "basic" || t === "elementary") return "BASIC";
  return null;
}
