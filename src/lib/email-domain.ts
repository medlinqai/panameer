
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
