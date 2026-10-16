"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, TextInput } from "@/components/onboarding/controls";

// The Company step's top block, shared by buyer and seller registration (SR-E002): Company Name (+ Legal Name),
// Website with Request Access beside it (lit only on a match), then "Request sent…". A joiner sees the company name only.
// Scott 10-16: standard field edits — TIN formats as typed (12-3456789), website tidies to its domain, both checked on blur.
const domainOf = (raw: string) => raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#\s]/)[0];
export const websiteOk = (raw: string) => !raw.trim() || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(domainOf(raw));
export const formatTin = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  // US EIN shape for 9 digits or fewer; longer (non-US) numbers keep their digits as typed.
  return d.length <= 9 ? (d.length > 2 ? `${d.slice(0, 2)}-${d.slice(2)}` : d) : raw.replace(/[^0-9A-Za-z-]/g, "");
};
export const tinOk = (raw: string) => !raw.trim() || raw.replace(/\D/g, "").length >= 9;
export const emailOk = (raw: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
/** Problems that stop Next — empty optional fields are fine. */
export const companyIdentityOk = (v: { website: string; tin: string }) => websiteOk(v.website) && tinOk(v.tin);

export type CoMatch = { id: string; name: string; why: string; byEmail: boolean; admin: string | null } | null;

/** The company already on Panameer for this website or the registrant's email domain. */
export async function findCoMatch(site: string): Promise<CoMatch> {
  const b = await fetch(`/api/company/match?email=1&site=${encodeURIComponent(site.trim())}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return b?.match ? { id: b.match.id as string, name: b.match.name as string, byEmail: b.reason === "email", why: b.reason === "email" ? `your email is @${b.domain}` : `its website is ${b.domain}`, admin: (b.match.adminName as string | null) ?? null } : null;
}

export function CompanyIdentityFields({
  name,
  dba,
  tin,
  website,
  onChange,
  joining,
  joinedName,
  match,
  askedAdmin,
  busy,
  onRequestAccess,
  onWebsiteBlur,
  waitNote,
  nameSide,
}: {
  /** Scott 10-16: Company Name is the LEGAL name; DBA is the name they trade under (optional). */
  name: string;
  dba: string;
  tin: string;
  website: string;
  onChange: (patch: { name?: string; dba?: string; tin?: string; website?: string }) => void;
  joining: boolean;
  joinedName: string;
  match: CoMatch;
  askedAdmin: string | null;
  busy: boolean;
  onRequestAccess: () => void;
  onWebsiteBlur: () => void;
  /** What waits on approval: "ordering" (buyers) or "selling" (sellers). */
  waitNote: string;
  /** Scott 10-16: Company Email sits beside Company Name (both sides). */
  nameSide?: React.ReactNode;
}) {
  const [touched, setTouched] = useState<{ website?: boolean; tin?: boolean }>({});
  return (
    <>
      <div className="space-y-3">
        {/* Scott 10-16: Website first — a company already on Panameer needs no more details. */}
        <Field label="Website" hint={joining || match ? undefined : touched.website && !websiteOk(website) ? undefined : "We'll check if your company is already on Panameer."}>
          <div className="flex gap-2">
            <TextInput value={website} onChange={(e) => onChange({ website: e.target.value })} className="sm:max-w-[50%]" disabled={joining} onBlur={() => { setTouched((t) => ({ ...t, website: true })); if (website.trim() && websiteOk(website)) { const d = domainOf(website); if (d !== website) onChange({ website: d }); onWebsiteBlur(); } }} placeholder="acme.com" autoComplete="url" />
            <button type="button" data-request-access disabled={!match || busy} onClick={onRequestAccess} className="shrink-0 bg-ink px-4 text-[13.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-30">{joining ? "Requested ✓" : "Request Access"}</button>
          </div>
          {touched.website && !websiteOk(website) && <span className="mt-1 block text-[13px] text-red-700">Enter a website like acme.com</span>}
        </Field>
        {match && (
          <p data-company-match className="-mt-1 border-l-2 border-magenta pl-3 text-[13px] text-ink-2">
            <b className="text-ink">{match.name}</b> is already on Panameer ({match.why}). <b>Request Access</b> and we&apos;ll ask {match.admin ? <b className="text-ink">{match.admin}</b> : "its admin"} to approve you. You can keep going while you wait.
          </p>
        )}
        {!match && (
          <>
            {!joining ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Company Name *">
                  <TextInput value={name} onChange={(e) => onChange({ name: e.target.value })} autoComplete="organization" placeholder="Acme Manufacturing LLC" />
                </Field>
                <Field label="Doing Business As (DBA) Name">
                  <TextInput value={dba} onChange={(e) => onChange({ dba: e.target.value })} placeholder="Acme" autoComplete="off" />
                </Field>
                {nameSide}
                <Field label="Tax ID Number (TIN)">
                  <TextInput value={tin} onChange={(e) => onChange({ tin: formatTin(e.target.value) })} onBlur={() => setTouched((t) => ({ ...t, tin: true }))} placeholder="12-3456789" inputMode="numeric" autoComplete="off" />
                  {touched.tin && !tinOk(tin) && <span className="mt-1 block text-[13px] text-red-700">Enter all 9 digits, like 12-3456789.</span>}
                </Field>
              </div>
            ) : (
              <Field label="Company Name *">
                <TextInput value={joinedName} autoComplete="organization" className="sm:max-w-[50%]" disabled />
              </Field>
            )}
          </>
        )}
      </div>
      {joining && (
        <div data-join-requested className="border border-line bg-white p-4 text-[14px]">
          <p>Request sent. We asked {askedAdmin ? <b>{askedAdmin}</b> : "the admin"} at <b>{joinedName}</b> to approve you, and we&apos;ll email you when they do. Keep going while you wait; {waitNote} opens once they approve.</p>
          <p className="mt-2 text-[13px] text-ink-2">Wrong person, or not your company? <Link href="/support/bug" className="font-semibold text-magenta-dark underline underline-offset-4">Message Support</Link></p>
        </div>
      )}
    </>
  );
}
