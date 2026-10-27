import { cache } from "react";
import { prisma } from "@/lib/prisma";

// GT-E001: platform switches (Admin › Settings). A missing row = the default.
export const SETTINGS = {
  // EX-E006: off until outreach is automated — real counts, a Remove My Listing link, Unsubscribe, once a week per company.
  external_jobs_company_emails: { label: "External Jobs: Email Companies Automatically", help: "Off = outreach is manual (Admin › External Jobs › Ready to Contact). On is reserved for the weekly company email; nothing sends yet.", default: false },
  taxonomy_v2: { label: "Global Taxonomy (v2)", help: "Off = today's screens exactly. On = the seller skills step asks How you work · What you know · In which system, and Shop › Services filters by them.", default: false },
} as const;
export type SettingKey = keyof typeof SETTINGS;

export async function getSetting(key: SettingKey): Promise<boolean> {
  // Local walks only (never in production): TAXONOMY_V2_FORCE=1 tests the "on" paths without flipping the shared switch.
  if (key === "taxonomy_v2" && process.env.TAXONOMY_V2_FORCE === "1" && process.env.NODE_ENV !== "production") return true;
  const row = await prisma.platformSetting.findUnique({ where: { key } }).catch(() => null);
  return typeof row?.value === "boolean" ? row.value : SETTINGS[key].default;
}

export async function setSetting(key: SettingKey, value: boolean, userId: string | null) {
  await prisma.platformSetting.upsert({ where: { key }, create: { key, value, updated_by: userId }, update: { value, updated_by: userId } });
}

/** GT-E001: is the Global Taxonomy on? Every new screen/path checks this; off = today's app. */
export const taxonomyV2 = cache(() => getSetting("taxonomy_v2"));

// BC-E007: email domains that never auto-match a company (email-domain match only; website and tax ID unchanged).
export const NEVER_MATCH_KEY = "never_match_email_domains";
export const NEVER_MATCH_DEFAULT = ["panameer.com"];

export async function neverMatchDomains(): Promise<string[]> {
  const row = await prisma.platformSetting.findUnique({ where: { key: NEVER_MATCH_KEY } }).catch(() => null);
  return Array.isArray(row?.value) ? (row.value as unknown[]).filter((x): x is string => typeof x === "string") : NEVER_MATCH_DEFAULT;
}

export async function setNeverMatchDomains(domains: string[], userId: string | null) {
  const value = [...new Set(domains.map((d) => d.trim().toLowerCase().replace(/^@/, "")).filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)))];
  await prisma.platformSetting.upsert({ where: { key: NEVER_MATCH_KEY }, create: { key: NEVER_MATCH_KEY, value, updated_by: userId }, update: { value, updated_by: userId } });
  return value;
}

/** A registrant's email domain that may auto-match a company: a work domain not on the never-match list. */
export async function matchableEmailDomain(domain: string | null): Promise<string | null> {
  if (!domain) return null;
  const { isWorkDomain } = await import("@/lib/tos");
  if (!isWorkDomain(domain)) return null;
  return (await neverMatchDomains()).includes(domain.toLowerCase()) ? null : domain;
}
