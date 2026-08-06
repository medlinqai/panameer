/**
 * Phone entry: digits only, formatted as you type, validated on blur (E203).
 *
 * THE FIELD ACCEPTED ANYTHING. It was a plain `type="tel"` box, which browsers
 * do not validate — "abc", "555", and a number with a trailing dash all sailed
 * through to a column the SMS verification will one day have to dial. The walk
 * typed letters into it and Continue took them.
 *
 * COUNTRY-AWARE, BECAUSE THE ADDRESS ALREADY ASKED. The location block sets the
 * country one field above this, and its hint already promised it "sets how we
 * format your phone number" — a promise nothing kept. A US provider now types
 * 2125599999 and sees (212) 559-9999.
 *
 * NO LIBRARY. libphonenumber is ~150KB for a wizard field; the four countries
 * Panameer actually onboards into have simple, stable national formats, and
 * everywhere else falls back to a digit-count rule that cannot be wrong in an
 * interesting way. If international dialling becomes a real surface, this is the
 * one module to replace.
 */

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

/**
 * The generic fallback. E.164 allows 15 digits including the country code, and
 * no national number anywhere is shorter than 4 — so anything in that band is
 * accepted and left unformatted rather than pushed into a shape that might be
 * wrong for that country.
 */
const GENERIC = { min: 7, max: 15 };

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

/**
 * What the input should display for what has been typed so far.
 *
 * Formats INCREMENTALLY — "(212) 55" while mid-entry — because a mask that only
 * appears once the number is complete makes the field look broken until the
 * last keystroke. Never emits a trailing separator: "(212) " with nothing after
 * it invites someone to stop there and call it done.
 */
export function formatPhone(value: string, country: string | null | undefined): string {
  const digits = digitsOf(value);
  if (!digits) return "";
  const rule = ruleFor(country);
  if (!rule) return digits.slice(0, GENERIC.max);
  return rule.format(digits).replace(/[\s(-]+$/, "");
}

export type PhoneCheck = { ok: boolean; reason?: string };

/**
 * Blur-time validation.
 *
 * Deliberately reports WHAT IS WRONG rather than "invalid phone number": the
 * two real failures — letters, and a number that stops short — have different
 * fixes, and "incomplete" is the one people hit.
 */
export function validatePhone(
  value: string,
  country: string | null | undefined
): PhoneCheck {
  const raw = value.trim();
  if (!raw) return { ok: false, reason: "Add a phone number so buyers can reach you." };
  if (/[a-z]/i.test(raw)) return { ok: false, reason: "Numbers only, please." };

  const digits = digitsOf(raw);
  const rule = ruleFor(country);

  if (rule) {
    // A number typed with its country code — "1 212 559 9999" — is the same
    // number, so it is accepted rather than counted as too long.
    const national = digits.startsWith(rule.countryCode)
      ? digits.slice(rule.countryCode.length)
      : digits;
    if (national.length < rule.nationalDigits) {
      return { ok: false, reason: `That's too short — ${rule.example} is the shape we expect.` };
    }
    if (national.length > rule.nationalDigits) {
      return { ok: false, reason: `That's too long — ${rule.example} is the shape we expect.` };
    }
    return { ok: true };
  }

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
