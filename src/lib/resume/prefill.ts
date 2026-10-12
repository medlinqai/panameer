import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ALL_COUNTRIES } from "@/lib/country";

// BT-E004: what the résumé can fill beyond the parse — location and a stated hourly rate — and the "from your résumé"
// marker list the provider confirms. Fills only empty fields; location waits in the address draft until they save it.
export type ResumePrefill = { fields: string[]; location?: { city: string; state: string; country: string } };
const US = new Set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split(" "));

export function resumeLocation(text: string): ResumePrefill["location"] | null {
  for (const line of text.split(/\n+/).slice(0, 15)) {
    for (const part of line.split(/[|•·]/)) {
      const m = /^\s*([A-Z][A-Za-z.'\- ]{1,30}),\s*([A-Za-z][A-Za-z ]{1,40}?)(?:\s+\d{5}(?:-\d{4})?)?\s*$/.exec(part);
      if (!m) continue;
      const [, city, rest] = m;
      if (US.has(rest.trim())) return { city: city.trim(), state: rest.trim(), country: "United States" };
      const c = ALL_COUNTRIES.find((x) => x.name.toLowerCase() === rest.trim().toLowerCase());
      if (c) return { city: city.trim(), state: "", country: c.name };
    }
  }
  return null;
}

export function resumeHourlyRate(text: string): number | null {
  const m = /\$\s?([\d,]{2,5})(?:\.\d{2})?\s*(?:\/|per\s)\s*(?:hour|hr)\b/i.exec(text);
  const n = m ? Number(m[1].replace(/,/g, "")) : 0;
  return n >= 10 && n <= 2000 ? n * 100 : null;
}

/** After a résumé apply: fill the rate when empty, park the location, and record which fields came from the résumé. */
export async function markResumePrefill(profileId: string, applied: { headline: boolean; overview: boolean }, rawText?: string) {
  const p = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    select: { resume_prefill: true, hourly_rate_cents: true, rate_min_cents: true, person: { select: { site: { select: { addresses: { select: { id: true }, take: 1 } } } } }, imports: { where: { raw_text: { not: null } }, orderBy: { created_at: "desc" }, take: 1, select: { raw_text: true } } },
  });
  const text = rawText ?? p?.imports[0]?.raw_text;
  if (!p) return;
  const prev = (p.resume_prefill as ResumePrefill | null) ?? { fields: [] };
  const fields = new Set(prev.fields);
  if (applied.headline) fields.add("Title");
  if (applied.overview) fields.add("About");
  const data: { hourly_rate_cents?: number; rate_min_cents?: number; rate_max_cents?: number } = {};
  const rate = text ? resumeHourlyRate(text) : null;
  if (rate && p.hourly_rate_cents == null && p.rate_min_cents == null) {
    Object.assign(data, { hourly_rate_cents: rate, rate_min_cents: rate, rate_max_cents: rate });
    fields.add("Rate");
  }
  const loc = !p.person.site?.addresses.length && text ? resumeLocation(text) : null;
  if (loc) fields.add("Location");
  if (!fields.size) return;
  await prisma.providerProfile.update({ where: { id: profileId }, data: { ...data, resume_prefill: { fields: [...fields], ...(loc ?? prev.location ? { location: loc ?? prev.location } : {}) } } });
}

export async function confirmResumePrefill(profileId: string) {
  await prisma.providerProfile.update({ where: { id: profileId }, data: { resume_prefill: Prisma.DbNull } });
}
