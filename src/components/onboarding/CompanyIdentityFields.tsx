"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, TextInput } from "@/components/onboarding/controls";

// The Company step's top block, shared by buyer and seller registration (SR-E002): Company Name (+ Legal Name),
// Website with Request Access beside it (lit only on a match), then "Request sent…". A joiner sees the company name only.
export type CoMatch = { id: string; name: string; why: string; byEmail: boolean; admin: string | null } | null;

/** The company already on Panameer for this website or the registrant's email domain. */
export async function findCoMatch(site: string): Promise<CoMatch> {
  const b = await fetch(`/api/company/match?email=1&site=${encodeURIComponent(site.trim())}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return b?.match ? { id: b.match.id as string, name: b.match.name as string, byEmail: b.reason === "email", why: b.reason === "email" ? `your email is @${b.domain}` : `its website is ${b.domain}`, admin: (b.match.adminName as string | null) ?? null } : null;
}

export function CompanyIdentityFields({
  name,
  legal,
  website,
  onChange,
  joining,
  joinedName,
  match,
  askedAdmin,
  busy,
  onRequestAccess,
  onWebsiteBlur,
  legalHint,
  waitNote,
}: {
  name: string;
  legal: string;
  website: string;
  onChange: (patch: { name?: string; legal?: string; website?: string }) => void;
  joining: boolean;
  joinedName: string;
  match: CoMatch;
  askedAdmin: string | null;
  busy: boolean;
  onRequestAccess: () => void;
  onWebsiteBlur: () => void;
  legalHint: string;
  /** What waits on approval: "ordering" (buyers) or "selling" (sellers). */
  waitNote: string;
}) {
  const [showLegal, setShowLegal] = useState(false);
  return (
    <>
      <div className="space-y-3">
        <Field label="Company Name *">
          <TextInput value={joining ? joinedName : name} onChange={(e) => onChange({ name: e.target.value })} autoComplete="organization" placeholder="Acme Manufacturing" className="sm:max-w-[50%]" disabled={joining} />
        </Field>
        {!joining && (showLegal || legal ? (
          <Field label="Legal Name" hint={legalHint}>
            <TextInput value={legal} onChange={(e) => onChange({ legal: e.target.value })} placeholder="Acme Holdings LLC" className="sm:max-w-[50%]" />
          </Field>
        ) : (
          <button type="button" onClick={() => setShowLegal(true)} className="-mt-1 text-[13px] font-semibold text-magenta-dark underline underline-offset-4">Legal name is different?</button>
        ))}
        <Field label="Website">
          <div className="flex gap-2">
            <TextInput value={website} onChange={(e) => onChange({ website: e.target.value })} className="sm:max-w-[50%]" disabled={joining} onBlur={() => { if (website.trim()) onWebsiteBlur(); }} placeholder="acme.com" autoComplete="url" />
            <button type="button" data-request-access disabled={!match || busy} onClick={onRequestAccess} className="shrink-0 bg-ink px-4 text-[13.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-30">{joining ? "Requested ✓" : "Request Access"}</button>
          </div>
        </Field>
      </div>
      {joining && (
        <div data-join-requested className="border border-line bg-white p-4 text-[14px]">
          <p>Request sent. We asked {askedAdmin ? <b>{askedAdmin}</b> : "the admin"} at <b>{joinedName}</b> to approve you, and we&apos;ll email you when they do. Keep going while you wait; {waitNote} opens once they approve.</p>
          <p className="mt-2 text-[13px] text-ink-2">Wrong person, or not your company? <Link href="/support/bug" className="font-semibold text-magenta-dark underline underline-offset-4">Message Support</Link></p>
        </div>
      )}
      {match && (
        <p data-company-match className="-mt-1 border-l-2 border-magenta pl-3 text-[13px] text-ink-2">
          <b className="text-ink">{match.name}</b> is already on Panameer ({match.why}). <b>Request Access</b> and we&apos;ll ask {match.admin ? <b className="text-ink">{match.admin}</b> : "its admin"} to approve you. You can keep going while you wait.
        </p>
      )}
    </>
  );
}
