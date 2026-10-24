import { prisma } from "@/lib/prisma";

// EO-E003 / ES: helpers kept from self-onboarding — the free-mail list, a company name from a domain, the punch-in rate limit.
// (ES-E002 replaced create-on-first-use with the setup credential.)
export const FREE_MAIL = new Set(["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com", "yahoo.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "zoho.com", "yandex.com", "mail.com"]);
const RATE_LIMIT = 5;


/** "lopez-mfg.com" → "Lopez Mfg". */
export function companyFromDomain(domain: string): string {
  const label = domain.toLowerCase().replace(/^www\./, "").split(".")[0] ?? domain;
  return label.split(/[-_]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || domain;
}

/** 5 per hour per IP and per identity, for identities Panameer has never seen. */
export async function overSelfOnboardLimit(ip: string, identity: string): Promise<boolean> {
  const since = new Date(Date.now() - 3_600_000);
  const [byIp, byId] = await Promise.all([
    prisma.erpPunchinAttempt.count({ where: { ip, created_at: { gte: since } } }),
    prisma.erpPunchinAttempt.count({ where: { identity, created_at: { gte: since } } }),
  ]);
  await prisma.erpPunchinAttempt.create({ data: { ip, identity } });
  return byIp >= RATE_LIMIT || byId >= RATE_LIMIT;
}

