
import {
  AsYouType,
  isValidPhoneNumber,
  validatePhoneNumberLength,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export type PhoneRule = {
  /** ISO-ish country names as the address block spells them. */
  countries: string[];
  /** Digits in a complete national number, excluding the country code. */
  nationalDigits: number;
  countryCode: string;
  format: (digits: string) => string;
  example: string;
};

const NANP = (digits: string) => {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

const RULES: PhoneRule[] = [
  {
    countries: ["United States", "USA", "US", "Canada", "CA"],
    nationalDigits: 10,
    countryCode: "1",
    format: NANP,
    example: "(212) 559-9999",
  },
  {
    countries: ["United Kingdom", "UK", "GB"],
    nationalDigits: 10,
    countryCode: "44",
    format: (digits) => {
      const d = digits.slice(0, 10);
      if (d.length <= 4) return d;
      return `${d.slice(0, 4)} ${d.slice(4)}`;
    },
    example: "7700 900123",
  },
  {
    countries: ["Australia", "AU"],
    nationalDigits: 9,
    countryCode: "61",
    format: (digits) => {
      const d = digits.slice(0, 9);
      if (d.length <= 1) return d;
      if (d.length <= 5) return `${d.slice(0, 1)} ${d.slice(1)}`;
      return `${d.slice(0, 1)} ${d.slice(1, 5)} ${d.slice(5)}`;
    },
    example: "4 1234 5678",
  },
];

/** The generic fallback. E.164 allows 15 digits including the country code, and */
const GENERIC = { min: 7, max: 15 };

/** THE COUNTRY LIST SPEAKS DISPLAY NAMES; THE LIBRARY SPEAKS ISO 3166-1. */
const ISO: Record<string, CountryCode> = {
  "United States": "US", USA: "US", US: "US",
  Canada: "CA", CA: "CA",
  "United Kingdom": "GB", UK: "GB", GB: "GB",
  Ireland: "IE",
  Australia: "AU", AU: "AU",
  "New Zealand": "NZ",
  India: "IN",
  Germany: "DE",
  France: "FR",
  Netherlands: "NL",
  Spain: "ES",
  Poland: "PL",
  Brazil: "BR",
  Mexico: "MX",
  Singapore: "SG",
  "United Arab Emirates": "AE",
  "Saudi Arabia": "SA",
  Qatar: "QA",
  Kuwait: "KW",
  Oman: "OM",
  Bahrain: "BH",
  "South Africa": "ZA",
};

/** The ISO 3166-1 alpha-2 code for a country as the address block spells it. */
export function isoFor(country: string | null | undefined): CountryCode | null {
  if (!country) return null;
  const exact = ISO[country.trim()];
  if (exact) return exact;
  const c = country.trim().toLowerCase();
  const hit = Object.keys(ISO).find((k) => k.toLowerCase() === c);
  return hit ? ISO[hit] : null;
}

/** What we tell the person we are checking against — the honest version of the */
export function phoneExpectation(
  country: string | null | undefined
): { example?: string; dialCode?: string; country: string } | null {
  if (!country) return null;
  const rule = ruleFor(country);
  if (rule) return { example: rule.example, dialCode: rule.countryCode, country };
  const iso = isoFor(country);
  if (!iso) return null;
  try {
    return { dialCode: getCountryCallingCode(iso), country };
  } catch {
    return null;
  }
}

export function ruleFor(country: string | null | undefined): PhoneRule | null {
  if (!country) return null;
  const c = country.trim().toLowerCase();
  return RULES.find((r) => r.countries.some((n) => n.toLowerCase() === c)) ?? null;
}

/** Everything that isn't a digit, gone. A leading + is not kept: the country
 *  picker supplies the country, so a typed prefix would double it. */
export function digitsOf(value: string): string {
  return value.replace(/\D+/g, "");
}

/** What the input should display for what has been typed so far. */
export function formatPhone(value: string, country: string | null | undefined): string {
  const digits = digitsOf(value);
  if (!digits) return "";
  const rule = ruleFor(country);
  if (rule) return rule.format(digits).replace(/[\s(-]+$/, "");

  // EVERY OTHER COUNTRY NOW GETS ITS REAL NATIONAL GROUPING —
  const iso = isoFor(country);
  if (!iso) return digits.slice(0, GENERIC.max);
  const typed = new AsYouType(iso).input(digits.slice(0, GENERIC.max));
  return (typed || digits.slice(0, GENERIC.max)).replace(/[\s(-]+$/, "");
}

/** HOW THE PHONE'S OWN COUNTRY IS PERSISTED WS-2a) */
export function toE164(value: string, country: string | null | undefined): string | null {
  const digits = digitsOf(value);
  if (!digits) return null;
  const iso = isoFor(country);
  if (!iso) return null;
  const parsed = parsePhoneNumberFromString(digits, iso);
  return parsed?.isValid() ? parsed.number : null;
}

/** Read a stored value back into the two things the field needs: which country */
export function parseStoredPhone(
  stored: string | null | undefined
): { country: string | null; display: string } {
  const raw = (stored ?? "").trim();
  if (!raw) return { country: null, display: "" };
  if (raw.startsWith("+")) {
    const parsed = parsePhoneNumberFromString(raw);
    if (parsed?.country) {
      const name = Object.keys(ISO).find((k) => ISO[k] === parsed.country && k.length > 2);
      return {
        country: name ?? null,
        display: formatPhone(parsed.nationalNumber, name ?? null),
      };
    }
  }
  return { country: null, display: raw };
}

export type PhoneCheck = { ok: boolean; reason?: string };

/** Deliberately reports WHAT IS WRONG rather than "invalid phone number": the */
export function validatePhone(
  value: string,
  country: string | null | undefined
): PhoneCheck {
  const raw = value.trim();
  if (!raw) return { ok: false, reason: "Add a phone number so buyers can reach you." };
  if (/[a-z]/i.test(raw)) return { ok: false, reason: "Numbers only, please." };

  const digits = digitsOf(raw);
  const rule = ruleFor(country);

  // THE LIBRARY JUDGES EVERY COUNTRY NOW WS-B, ruling 3)

  // EVERY OTHER COUNTRY, JUDGED BY ITS OWN RULES
  const iso = isoFor(country);
  if (iso) {
    const lengthProblem = validatePhoneNumberLength(digits, iso);
    // THE CURATED EXAMPLE STILL SHAPES THE WORDS WHERE THERE IS ONE ( WS-B) — that
    const shape = rule ? `${rule.example} is the shape we expect.` : `for a ${country} number.`;
    if (lengthProblem === "TOO_SHORT") {
      return { ok: false, reason: rule ? `That's too short — ${shape}` : `That's too short ${shape}` };
    }
    if (lengthProblem === "TOO_LONG") {
      return { ok: false, reason: rule ? `That's too long — ${shape}` : `That's too long ${shape}` };
    }
    // A NUMBER CAN BE THE RIGHT LENGTH AND STILL NOT EXIST — a Saudi number
    if (!isValidPhoneNumber(digits, iso)) {
      return {
        ok: false,
        reason: `That doesn't look like a ${country} number. If you're somewhere else, change the country.`,
      };
    }
    return { ok: true };
  }

  /* ONLY "Other" AND AN UNANSWERED COUNTRY REACH THIS NOW. */
  if (digits.length < GENERIC.min) return { ok: false, reason: "That number looks too short." };
  if (digits.length > GENERIC.max) return { ok: false, reason: "That number looks too long." };
  return { ok: true };
}

/** True when the field is complete enough to let Continue through. */
export function isPhoneComplete(
  value: string,
  country: string | null | undefined
): boolean {
  return validatePhone(value, country).ok;
}
