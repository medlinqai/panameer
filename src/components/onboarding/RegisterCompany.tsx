"use client";

import { useEffect, useState } from "react";
import { Field, Notice, TextArea, TextInput } from "@/components/onboarding/controls";
import { LegalLink } from "@/components/legal/LegalLink";
import { BusinessTypePicker, type BT } from "@/components/company/BusinessTypePicker";

type Match = { id: string; name: string; why: string } | null;
const COMPANY_DESCRIPTION_MAX = 600;

// RD-E001: "Your Company" at Register — the same company + membership records as Add Company.
export function RegisterCompany({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [attestation, setAttestation] = useState(false);
  const [companyTos, setCompanyTos] = useState(false);
  const [businessTypes, setBusinessTypes] = useState<BT[]>([]);
  const [commodities, setCommodities] = useState<string[]>([]);
  const [businessTypeId, setBusinessTypeId] = useState("");
  const [match, setMatch] = useState<Match>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // BC-E005: the company already here for this website or the registrant's email domain → Ask to Join inline.
  const check = async (site: string) => {
    const r = await fetch(`/api/company/match?email=1&site=${encodeURIComponent(site.trim())}`).catch(() => null);
    const b = (await r?.json().catch(() => null)) as { match?: { id: string; name: string } | null; reason?: string | null; domain?: string | null } | null;
    const m = b?.match ? { id: b.match.id, name: b.match.name, why: b.reason === "email" ? `your email is @${b.domain}` : `its website is ${b.domain}` } : null;
    setMatch(m);
    return m;
  };

  useEffect(() => {
    void check("");
    fetch("/api/company/industries").then((r) => (r.ok ? r.json() : { industries: [] })).then((b) => { setBusinessTypes(b.businessTypes ?? []); setCommodities(b.commodities ?? []); if (b.businessTypes?.length === 1) setBusinessTypeId(b.businessTypes[0].id); }).catch(() => {});
  }, []);

  const lookUp = async () => {
    const m = await check(website);
    if (m && !name.trim()) setName(m.name);
  };

  const post = async (url: string, method: string, body: object) => {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) throw new Error(j.error ?? "Could not save your company.");
  };

  const join = async () => {
    if (!match) return;
    setBusy(true);
    setError(null);
    try {
      await post("/api/company/join", "POST", { companyId: match.id, attestation, matchedOn: match.why.startsWith("your email") ? "email" : "website" });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await post("/api/company/define", "POST", { name: name.trim(), website: website.trim(), attestation, companyTos });
      if (description.trim()) await post("/api/company", "PATCH", { description: description.trim() });
      if (businessTypeId) await post("/api/company/business-types", "POST", { businessTypeId, on: true });
      onDone();
    } catch (e) {
      // The match may only show up now (e.g. email domain): offer Ask to Join instead of a dead end.
      if (!(await check(website))) setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const ready = name.trim().length >= 2 && website.trim().length >= 3 && (!businessTypes.length || !!businessTypeId) && attestation && companyTos;

  return (
    <div className="mx-auto w-full max-w-2xl" data-register-company>
      <h1 className="text-center text-[28px] font-extrabold tracking-[-0.6px]">Your Company</h1>
      <p className="mt-2 text-center text-[15px] text-ink-2">Panameer contracts with and pays companies. A one-person business is a company too. <a href="/help/road#register" target="_blank" rel="noreferrer" className="font-semibold text-magenta-dark underline underline-offset-4">Questions?</a></p>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      <div className="mt-6 space-y-3">
        <Field label="Website" hint="We check whether your company is already on Panameer.">
          <TextInput value={website} onChange={(e) => { setWebsite(e.target.value); setError(null); }} onBlur={lookUp} placeholder="yourcompany.com" autoComplete="url" />
        </Field>
        {match ? (
          <div className="border border-line bg-white p-4" data-company-match>
            <p className="text-[15px]"><b>{match.name}</b> is already on Panameer. Ask to join and we&apos;ll let its admin know.</p>
            <p className="mt-1 text-[13px] text-ink-2">We matched it because {match.why}.</p>
            <label className="mt-3 flex cursor-pointer items-start gap-3 text-[14px] text-ink-2">
              <input type="checkbox" checked={attestation} onChange={(e) => setAttestation(e.target.checked)} className="mt-1 h-4 w-4 accent-magenta" />
              I&apos;m authorized to represent this company on Panameer.
            </label>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" onClick={join} disabled={busy || !attestation} className="bg-ink px-6 py-3 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-50">{busy ? "Sending…" : `Ask to Join ${match.name}`}</button>
              {!match.why.startsWith("your email") && <button type="button" onClick={() => setMatch(null)} className="px-2 text-[14px] font-semibold underline underline-offset-4">That&apos;s Not My Company</button>}
            </div>
          </div>
        ) : (
          <>
            <Field label="Company Name">
              <TextInput value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="Your business name" autoComplete="organization" />
            </Field>
            {businessTypes.length > 0 && (
              <BusinessTypePicker types={businessTypes} commodities={commodities} value={businessTypeId} onChange={setBusinessTypeId} hint="What your company sells — it sets up your Service Catalog. You can add more later." />
            )}
            {/* BT-E001: a seller picks its Business Type (it selects the Service Catalog); Industries You Serve comes later on the company page. */}
            <Field label="Description (optional)" hint={`What the company does, in a sentence or two. Up to ${COMPANY_DESCRIPTION_MAX} characters.`}>
              <TextArea value={description} maxLength={COMPANY_DESCRIPTION_MAX} onChange={(e) => setDescription(e.target.value)} className="min-h-24" />
            </Field>
            <label className="flex cursor-pointer items-start gap-3 border border-line p-3">
              <input type="checkbox" checked={attestation} onChange={(e) => setAttestation(e.target.checked)} className="mt-1 h-4 w-4 accent-magenta" />
              <span className="text-[14px] text-ink-2">I&apos;m authorized to represent this company on Panameer.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 border border-line p-3">
              <input type="checkbox" checked={companyTos} onChange={(e) => setCompanyTos(e.target.checked)} className="mt-1 h-4 w-4 accent-magenta" />
              <span className="text-[14px] text-ink-2">On behalf of this company, I accept the Panameer <LegalLink href="/company-terms">Company Terms of Service</LegalLink>.</span>
            </label>
            <div className="flex justify-end">
              <button type="button" onClick={create} disabled={!ready || busy} className="bg-ink px-8 py-3 font-semibold text-surface hover:bg-ink-hover disabled:opacity-50">{busy ? "Saving…" : "Save and Continue"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
