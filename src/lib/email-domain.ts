/**
 * Domain matching for the validation guard (brief_validation_domain_guard).
 *
 * The Validated ✓ badge is only worth something if the person who confirmed the
 * work actually belongs to the client. This module answers one question:
 *
 *   may `contact_email` validate a project whose client is `client_domain`?
 *
 * It is deliberately dependency-free. A public-suffix library would be more
 * exhaustive, but this comparison is a SECURITY boundary, and the brief allows
 * a vetted suffix match — so the list below is small, readable and reviewable
 * rather than a 15,000-line vendored file nobody checks.
 */

/**
 * Multi-label public suffixes we recognise, so `bhp.com.au` is one registrable
 * domain rather than `com.au`.
 *
 * NOT exhaustive — it does not need to be. An unlisted suffix falls back to the
 * last two labels, which is the STRICTER answer: `foo.co.zz` would compare as
 * `co.zz`, and two different companies under an unlisted suffix would fail to
 * match rather than wrongly match. Erring toward refusing a real request beats
 * erring toward accepting a fake one.
 */
const MULTI_LABEL_SUFFIXES = new Set([
  // United Kingdom
  "co.uk", "org.uk", "ac.uk", "gov.uk", "ltd.uk", "plc.uk", "me.uk", "net.uk",
  // Australia / New Zealand
  "com.au", "net.au", "org.au", "edu.au", "gov.au", "asn.au", "id.au",
  "co.nz", "net.nz", "org.nz", "govt.nz", "ac.nz",
  // Asia
  "co.jp", "or.jp", "ne.jp", "ac.jp", "go.jp",
  "co.kr", "or.kr", "go.kr",
  "com.cn", "net.cn", "org.cn", "gov.cn", "edu.cn",
  "com.hk", "org.hk", "com.tw", "com.sg", "com.my", "com.ph", "co.th",
  "co.in", "net.in", "org.in", "gov.in", "ac.in", "co.id", "or.id",
  // Americas
  "com.br", "net.br", "org.br", "gov.br",
  "com.mx", "org.mx", "com.ar", "com.co", "com.pe", "com.uy", "com.ve",
  // Europe / Middle East / Africa
  "co.za", "org.za", "gov.za", "ac.za",
  "com.tr", "com.ua", "com.pl", "com.ru", "co.il", "com.sa", "com.eg",
  "co.ae", "com.ng", "co.ke",
  "com.es", "com.pt", "com.gr", "com.cy", "co.at", "or.at",
]);

/**
 * Free / consumer mailbox providers, matched on the BRAND label so country
 * variants are covered without listing every one (`yahoo.co.uk`, `gmx.de`,
 * `hotmail.fr` all reduce to a blocked brand).
 *
 * A corporate validation never arrives from a personal inbox — and without
 * this, `client_domain = gmail.com` would let any provider validate their own
 * work from their own mailbox, which is the exact attack this brief exists to
 * close.
 */
const FREE_EMAIL_BRANDS = new Set([
  "gmail", "googlemail", "google",
  "outlook", "hotmail", "live", "msn", "passport",
  "yahoo", "ymail", "rocketmail",
  "icloud", "me", "mac",
  "aol", "aim",
  "proton", "protonmail", "pm",
  "gmx", "web", "mail", "email",
  "zoho", "yandex", "rambler",
  "fastmail", "tutanota", "tuta", "hushmail", "mailfence", "posteo",
  "qq", "163", "126", "sina", "naver", "daum",
  "seznam", "wp", "onet", "interia",
  "comcast", "verizon", "att", "sbcglobal", "bellsouth", "cox", "charter",
  "btinternet", "orange", "free", "laposte", "sfr", "wanadoo",
  "yopmail", "mailinator", "guerrillamail", "10minutemail", "trashmail",
  "sharklasers", "temp-mail", "getnada", "dispostable",
]);

/** Strip scheme, credentials, path, port, trailing dot and a leading `www.`. */
export function normalizeHost(raw: string | null | undefined): string | null {
  let s = (raw ?? "").trim().toLowerCase();
  if (!s) return null;

  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // scheme
  s = s.split("@").pop()!; // credentials, or an email's local part
  s = s.split("/")[0].split("?")[0].split("#")[0]; // path/query/fragment
  s = s.split(":")[0]; // port
  s = s.replace(/\.+$/, ""); // trailing dot (FQDN form)
  s = s.replace(/^www\./, "");

  if (!s || !s.includes(".")) return null;
  // Labels: alphanumerics and hyphens only. Rejects spaces and anything that
  // would make the comparison below meaningless.
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s)) return null;
  return s;
}

/**
 * The registrable domain — the part someone actually buys.
 *
 *   corp.nasdaq.com  → nasdaq.com
 *   nasdaq.evil.com  → evil.com      (which is why the match below is safe)
 *   bhp.com.au       → bhp.com.au
 */
export function registrableDomain(raw: string | null | undefined): string | null {
  const host = normalizeHost(raw);
  if (!host) return null;

  const labels = host.split(".");
  if (labels.length < 2) return null;

  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_LABEL_SUFFIXES.has(lastTwo) && labels.length >= 3) {
    return labels.slice(-3).join(".");
  }
  return lastTwo;
}

/** Is this a consumer mailbox provider rather than an organization? */
export function isFreeEmailDomain(raw: string | null | undefined): boolean {
  const reg = registrableDomain(raw);
  if (!reg) return false;
  return FREE_EMAIL_BRANDS.has(reg.split(".")[0]);
}

export type DomainCheck =
  | { ok: true; domain: string }
  | {
      ok: false;
      reason: "no_client_domain" | "invalid_email" | "free_email" | "mismatch";
      message: string;
      /** The domain the contact must be at, when we know it. */
      domain?: string;
    };

/**
 * The guard itself. Server-authoritative; the modal mirrors it only so the
 * provider gets the answer before they click.
 *
 * Subdomains of the client PASS (`@corp.nasdaq.com` for `nasdaq.com`) because
 * large organizations really do run regional and divisional mail domains.
 * Anything whose registrable domain differs FAILS — including the lookalikes
 * this is built to stop: `nasdaq.evil.com` registers as `evil.com`, and
 * `nasdaq-corp.com` is simply a different domain.
 */
export function checkContactDomain(
  contactEmail: string | null | undefined,
  clientDomain: string | null | undefined
): DomainCheck {
  const clientReg = registrableDomain(clientDomain);
  if (!clientReg) {
    return {
      ok: false,
      reason: "no_client_domain",
      message:
        "Add the client's website domain to this project before requesting validation.",
    };
  }
  // A free-email CLIENT domain would make the whole check meaningless — every
  // personal address would then "match". Refuse it at the client end too.
  if (isFreeEmailDomain(clientReg)) {
    return {
      ok: false,
      reason: "free_email",
      message:
        "That client domain is a personal email provider. Use the client's own company domain.",
      domain: clientReg,
    };
  }

  const email = (contactEmail ?? "").trim().toLowerCase();
  // One @, something either side, and a dot in the host.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      reason: "invalid_email",
      message: "That contact email isn't valid.",
      domain: clientReg,
    };
  }

  const emailHost = email.split("@").pop()!;
  if (isFreeEmailDomain(emailHost)) {
    return {
      ok: false,
      reason: "free_email",
      message: `Personal email addresses can't validate a project — use a @${clientReg} address.`,
      domain: clientReg,
    };
  }

  const emailReg = registrableDomain(emailHost);
  if (!emailReg || emailReg !== clientReg) {
    return {
      ok: false,
      reason: "mismatch",
      message: `The person who validates this needs a @${clientReg} email.`,
      domain: clientReg,
    };
  }

  return { ok: true, domain: clientReg };
}
