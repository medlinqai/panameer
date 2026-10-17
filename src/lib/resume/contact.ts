// Scott 10-17: the résumé header has the phone and "Jacksonville, FL" — use them to fill Who Is Selling?.
import { US_STATES } from "@/lib/countries";
import { codeForName } from "@/lib/country";

export type ResumeContact = { phone?: string; city?: string; state?: string; country?: string };

export function contactFromResume(text: string | null | undefined): ResumeContact {
  if (!text) return {};
  const head = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 12);
  const out: ResumeContact = {};
  for (const line of head) {
    const parts = line.split(/\s*[•|·▪●–—]\s*|\s{3,}/).map((x) => x.trim()).filter(Boolean);
    for (const part of parts) {
      if (!out.phone) {
        const m = part.match(/(\+?\d[\d\s().-]{8,}\d)/);
        if (m && m[1].replace(/\D/g, "").length >= 10 && !/@/.test(part)) { out.phone = m[1].trim(); continue; }
      }
      if (!out.city) {
        const us = part.match(/^([A-Za-z .'-]{2,40}),\s*([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/);
        if (us && (US_STATES as readonly string[]).includes(us[2])) { out.city = us[1].trim(); out.state = us[2]; out.country = "US"; continue; }
        const intl = part.match(/^([A-Za-z .'-]{2,40}),\s*([A-Za-z .'-]{3,40})$/);
        const cc = intl ? codeForName(intl[2].trim()) : null;
        if (intl && cc) { out.city = intl[1].trim(); out.country = cc; }
      }
    }
  }
  // Stored phones are E.164 (the Seller page reads the country from it).
  if (out.phone) {
    const d = out.phone.replace(/\D/g, "");
    if (out.phone.trim().startsWith("+")) out.phone = `+${d}`;
    else if (d.length === 10 && (!out.country || out.country === "US")) out.phone = `+1${d}`;
    else if (d.length === 11 && d.startsWith("1")) out.phone = `+${d}`;
  }
  return out;
}
