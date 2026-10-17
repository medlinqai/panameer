// Scott 10-17: the résumé header has the phone and "Jacksonville, FL" — use them to fill Who Is Selling?.
import { US_STATES } from "@/lib/countries";
import { codeForName } from "@/lib/country";

export type ResumeContact = { phone?: string; line1?: string; city?: string; state?: string; postalCode?: string; country?: string };

const STREET = /^\d{1,6}\s+[A-Za-z0-9 .'#-]{2,50}\b(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pkwy|Parkway|Hwy|Highway|Pl|Place|Ter|Terrace|Cir|Circle|Trl|Trail)\b\.?(?:[ ,]+(?:Suite|Ste|Unit|Apt|#)\s*[\w-]+)?,?$/i;

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
      if (!out.line1) {
        // Scott 10-17: the whole address when it's there — "123 Main St, Suite 4, Jacksonville, FL 32256".
        const full = part.match(/^(\d{1,6}\s[^,]{2,60}(?:,\s*(?:Suite|Ste|Unit|Apt|#)[^,]{0,20})?),\s*([A-Za-z .'-]{2,40}),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/i);
        if (full && (US_STATES as readonly string[]).includes(full[3].toUpperCase())) { out.line1 = full[1].trim(); out.city = full[2].trim(); out.state = full[3].toUpperCase(); if (full[4]) out.postalCode = full[4]; out.country = "US"; continue; }
        if (STREET.test(part)) { out.line1 = part.replace(/,\s*$/, ""); continue; }
      }
      if (!out.city) {
        const us = part.match(/^([A-Za-z .'-]{2,40}),\s*([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/);
        if (us && (US_STATES as readonly string[]).includes(us[2])) { out.city = us[1].trim(); out.state = us[2]; if (us[3]) out.postalCode = us[3]; out.country = "US"; continue; }
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
