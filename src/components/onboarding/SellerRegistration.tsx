"use client";

import { useCallback, useEffect, useState } from "react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { Field, Notice, TextArea } from "@/components/onboarding/controls";
import { LegalLink } from "@/components/legal/LegalLink";
import { BusinessTypePicker, type BT } from "@/components/company/BusinessTypePicker";
import { CompanyIdentityFields, findCoMatch, type CoMatch } from "@/components/onboarding/CompanyIdentityFields";
import { LocationsBlock, locLine, locsProblem, newLoc, type LocRow } from "@/components/onboarding/LocationsBlock";
import { LocationFields, type LocationValue } from "@/components/onboarding/LocationFields";
import { countryName } from "@/lib/country";
import { PersonFields, personComplete, type PersonValues } from "@/components/onboarding/PersonFields";
import { parseStoredPhone, toE164 } from "@/lib/phone";

// SO-E003: seller registration after Verify + the start page — Who Is Selling? · Company · Locations · Review, the buyer's shell and pieces.
export const SELLER_RAIL = [
  { key: "seller", label: "Seller" },
  { key: "company", label: "Company" },
  { key: "locations", label: "Locations" },
];
const STEPS = ["seller", "company", "locations", "review"] as const;
type Step = (typeof STEPS)[number];
const DESCRIPTION_MAX = 600;

type Reg = {
  email: string;
  name?: string;
  seller: PersonValues;
  step: Step | null;
  registered: boolean;
  company: null | { status: "APPROVED" | "PENDING"; owner: boolean; id?: string; name: string; legalName?: string; website?: string; description?: string; businessTypeIds?: string[] };
  locations: (LocRow & { id: string })[];
  own: (LocationValue & { line1?: string | null }) | null;
};

export function SellerRegistration({ onDone, onLeave }: { onDone: () => void; onLeave: () => void }) {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("seller");
  const [reached, setReached] = useState(0);
  const [person, setPerson] = useState<PersonValues>({ firstName: "", lastName: "", title: "", photoUrl: null, phone: "" });
  const [phoneCountry, setPhoneCountry] = useState<string | null>(null);
  const [reg, setReg] = useState<Reg | null>(null);
  const [name, setName] = useState("");
  const [legal, setLegal] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [businessTypeId, setBusinessTypeId] = useState("");
  const [types, setTypes] = useState<BT[]>([]);
  const [commodities, setCommodities] = useState<string[]>([]);
  const [attestation, setAttestation] = useState(false);
  const [companyTos, setCompanyTos] = useState(false);
  const [match, setMatch] = useState<CoMatch>(null);
  const [askedAdmin, setAskedAdmin] = useState<string | null>(null);
  const [locs, setLocs] = useState<LocRow[]>([{ ...newLoc(null, true), billTo: false, shipTo: false }]);
  const [own, setOwn] = useState<LocationValue>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r: Reg | null = await fetch("/api/onboarding/provider/registration").then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (!r) return null;
    setReg(r);
    setPerson({ ...r.seller, phone: parseStoredPhone(r.seller.phone).display });
    setPhoneCountry((pc) => pc ?? parseStoredPhone(r.seller.phone).country ?? null);
    const c = r.company;
    if (c?.status === "APPROVED") {
      setName(c.name);
      setLegal(c.legalName ?? "");
      setWebsite(c.website ?? "");
      setDescription(c.description ?? "");
      if (c.businessTypeIds?.[0]) setBusinessTypeId(c.businessTypeIds[0]);
    }
    if (r.locations.length) setLocs(r.locations);
    if (r.own) setOwn(r.own);
    return r;
  }, []);

  useEffect(() => {
    (async () => {
      const [r] = await Promise.all([
        load(),
        fetch("/api/company/industries").then((x) => (x.ok ? x.json() : {})).then((b: { businessTypes?: BT[]; commodities?: string[] }) => { setTypes(b.businessTypes ?? []); setCommodities(b.commodities ?? []); if (b.businessTypes?.length === 1) setBusinessTypeId((v) => v || b.businessTypes![0].id); }).catch(() => {}),
      ]);
      // Refresh returns to the step they were on (saved on the server), never past what's missing.
      const c = r?.company;
      const hasLocs = c?.owner ? r!.locations.some((l) => l.remitTo) : !!r?.own?.line1;
      const saved: Step = r?.step && STEPS.includes(r.step) ? r.step : "seller";
      const s: Step = saved === "seller" ? "seller" : !c ? "company" : !hasLocs && saved === "review" ? "locations" : saved;
      setStep(s);
      setReached(STEPS.indexOf(s));
      if (!c) setMatch(await findCoMatch(""));
      setReady(true);
    })();
  }, [load]);

  const go = (s: Step) => {
    setError(null);
    setStep(s);
    setReached((n) => Math.max(n, STEPS.indexOf(s)));
    void fetch("/api/onboarding/provider/registration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: s }) }).catch(() => {});
  };

  const post = async (url: string, method: string, body: object) => {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) throw new Error(j.error ?? "Could not save that.");
  };

  if (!ready || !reg) return <div className="grid min-h-screen place-items-center bg-white font-body text-ink-2">Loading…</div>;

  const c = reg.company;
  const joining = c?.status === "PENDING";
  const owner = !!c?.owner;
  const idx = STEPS.indexOf(step);
  const shell = {
    rail: { steps: SELLER_RAIL, current: idx, reached, onPick: (i: number) => go(STEPS[i]) },
    // SO-E003: four steps on the rail, so "of 4".
    eyebrow: `Step ${idx + 1} of 4 · ${step === "review" ? "Review" : SELLER_RAIL[idx].label}`,
    busy,
    canBack: idx > 0,
    onBack: idx > 0 ? () => go(STEPS[idx - 1]) : undefined,
    leaveLabel: "Finish later",
    onLeave,
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  // ---- Who Is Selling? (= the buyer's Who Is Buying?) ------------------------
  if (step === "seller") {
    const next = () => run(async () => {
      await post("/api/onboarding/provider/registration", "POST", { seller: { firstName: person.firstName, lastName: person.lastName, title: person.title, phone: toE164(person.phone, phoneCountry) ?? person.phone } });
      await load();
      go("company");
    });
    return (
      <WizardShell
        {...shell}
        title="Who Is Selling?"
        subtitle="This is the person buyers see on your profile and on proposals."
        continueLabel="Next: Company"
        continueDisabled={!personComplete(person, phoneCountry)}
        onContinue={next}
      >
        <div className="mx-auto w-full max-w-xl space-y-4" data-seller-person-step>
          {error && <Notice>{error}</Notice>}
          <PersonFields
            values={person}
            onChange={(patch) => setPerson((v) => ({ ...v, ...patch }))}
            phoneCountry={phoneCountry}
            onPhoneCountry={setPhoneCountry}
            titleHint="What you do, in one line — for example, Oracle Procurement Consultant."
            titlePlaceholder="Oracle Procurement Consultant"
            photoLine="Buyers see this next to your name on your profile and proposals. A clear headshot gets a faster response than an empty circle."
          />
        </div>
      </WizardShell>
    );
  }

  // ---- Company -------------------------------------------------------------
  if (step === "company") {
    const requestAccess = () => run(async () => {
      if (!match) return;
      await post("/api/company/join", "POST", { companyId: match.id, attestation: true, matchedOn: match.byEmail ? "email" : "website" });
      setAskedAdmin(match.admin);
      setMatch(null);
      await load();
    });
    const next = () => run(async () => {
      if (match) return requestAccess();
      if (joining) return go("locations");
      if (!c) {
        if (await findCoMatch(website).then((m) => (setMatch(m), m))) return;
        try {
          await post("/api/company/define", "POST", { name: name.trim(), website: website.trim() || null, attestation, companyTos });
        } catch (e) {
          // A match that only shows now becomes Request Access, not a dead end.
          if (await findCoMatch(website).then((m) => (setMatch(m), m))) return;
          throw e;
        }
      } else if (owner && name.trim() !== c.name) {
        await post("/api/company", "PATCH", { name: name.trim() });
      }
      if (owner || !c) {
        await post("/api/company", "PATCH", { legalName: legal.trim() || name.trim(), description: description.trim() || null });
        if (businessTypeId && !(c?.businessTypeIds ?? []).includes(businessTypeId)) await post("/api/company/business-types", "POST", { businessTypeId, on: true });
      }
      await load();
      go("locations");
    });
    const ok = match || joining || (name.trim().length >= 2 && (!types.length || !!businessTypeId) && (c ? true : attestation && companyTos));
    return (
      <WizardShell
        {...shell}
        title="Which company do you sell through?"
        subtitle="Panameer contracts with and pays companies. A one-person business is a company too."
        continueLabel={match ? "Request Access" : "Next: Locations"}
        continueDisabled={!ok}
        onContinue={next}
      >
        <div className="mx-auto w-full max-w-xl space-y-4" data-seller-company-step>
          <a href="/help/road#register" target="_blank" rel="noreferrer" className="-mt-2 inline-block text-[13px] font-semibold text-magenta-dark underline underline-offset-4">Questions?</a>
          {error && <Notice>{error}</Notice>}
          <CompanyIdentityFields
            name={name}
            legal={legal}
            website={website}
            onChange={(p) => { setError(null); if (p.name !== undefined) setName(p.name); if (p.legal !== undefined) setLegal(p.legal); if (p.website !== undefined) { setWebsite(p.website); setMatch(null); } }}
            joining={joining}
            joinedName={c?.name ?? ""}
            match={match}
            askedAdmin={askedAdmin}
            busy={busy}
            onRequestAccess={() => void requestAccess()}
            onWebsiteBlur={() => void findCoMatch(website).then(setMatch)}
            legalHint="The name on your checks and payments, if it's different from the company name."
            waitNote="selling"
          />
          {!joining && !match && (
            <div className="space-y-4">
              {types.length > 0 && (
                <BusinessTypePicker types={types} commodities={commodities} value={businessTypeId} onChange={setBusinessTypeId} hint="What your company sells — it sets up your Service Catalog. You can add more later." />
              )}
              <Field label="Description (optional)" hint={`What the company does, in a sentence or two. Up to ${DESCRIPTION_MAX} characters.`}>
                <TextArea value={description} maxLength={DESCRIPTION_MAX} onChange={(e) => setDescription(e.target.value)} rows={2} className="min-h-0! h-[60px]" />
              </Field>
              {!c && (
                <>
                  <label className="flex cursor-pointer items-start gap-3 border border-line p-3">
                    <input type="checkbox" checked={attestation} onChange={(e) => setAttestation(e.target.checked)} className="mt-1 h-4 w-4 accent-magenta" />
                    <span className="text-[14px] text-ink-2">I&apos;m authorized to represent this company on Panameer.</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 border border-line p-3">
                    <input type="checkbox" checked={companyTos} onChange={(e) => setCompanyTos(e.target.checked)} className="mt-1 h-4 w-4 accent-magenta" />
                    <span className="text-[14px] text-ink-2">On behalf of this company, I accept the Panameer <LegalLink href="/company-terms">Company Terms of Service</LegalLink>.</span>
                  </label>
                </>
              )}
            </div>
          )}
        </div>
      </WizardShell>
    );
  }

  // ---- Locations -----------------------------------------------------------
  if (step === "locations") {
    const ownOk = !!own.line1?.trim() && !!own.country;
    const problem = owner ? locsProblem(locs, { buyer: false, seller: true }) : ownOk ? null : "Add the country and street";
    const next = () => run(async () => {
      if (owner) await post("/api/company/locations", "POST", { locations: locs, seller: true });
      else await post("/api/onboarding/provider/registration", "POST", { own });
      await load();
      go("review");
    });
    return (
      <WizardShell
        {...shell}
        title={owner ? "Where is your company?" : "Where do you work?"}
        subtitle={owner ? "Tick what each address is for. You need at least one Remit To — it's where payments to you go." : "Your own work address for now. Your company's addresses show once its admin approves you."}
        continueLabel="Next: Review"
        continueDisabled={!!problem}
        onContinue={next}
      >
        <div className="w-full max-w-2xl space-y-4" data-seller-locations>
          {error && <Notice>{error}</Notice>}
          {owner ? (
            <LocationsBlock rows={locs} onChange={setLocs} buyer={false} seller />
          ) : (
            <div data-own-address className="border border-line p-4">
              <p className="mb-2 text-[14px] font-bold">Where you work *</p>
              <LocationFields value={own} onChange={(p) => setOwn((o) => ({ ...o, ...p }))} withStreet compact />
            </div>
          )}
          {problem && owner && <p className="text-[13px] text-ink-2">{problem}</p>}
        </div>
      </WizardShell>
    );
  }

  // ---- Review --------------------------------------------------------------
  const btName = types.find((t) => t.id === businessTypeId)?.name;
  const addr = (a: LocationValue) => [a.line1, a.city, a.state, a.postalCode, countryName(a.country, a.country)].filter(Boolean).join(", ") || "—";
  const rows: { label: string; value: string; step: Step }[] = [
    { label: "Name", value: `${person.firstName} ${person.lastName}`.trim() || "—", step: "seller" },
    { label: "Title", value: person.title || "—", step: "seller" },
    { label: "Photo", value: person.photoUrl ? "Added" : "—", step: "seller" },
    { label: "Phone", value: person.phone || "—", step: "seller" },
    { label: "Company", value: joining ? `${c?.name} (asked to join)` : [name, legal && legal !== name ? `Legal name ${legal}` : null, btName].filter(Boolean).join(" · "), step: "company" },
    ...(owner
      ? locs.map((l, i) => ({ label: locs.length > 1 ? `Location ${i + 1}` : "Location", value: locLine(l, { seller: true }), step: "locations" as Step }))
      : [{ label: "Location", value: `${addr(own)} · Where I work`, step: "locations" as Step }]),
  ];
  return (
    <WizardShell
      {...shell}
      title="Here's your registration. Check it, then finish."
      subtitle="Everything here is editable later. Next: get found by buyers, from your dashboard."
      continueLabel="Finish"
      onContinue={() => run(async () => { await post("/api/onboarding/provider/registration", "POST", { complete: true }); onDone(); })}
    >
      <div className="w-full max-w-2xl" data-seller-review>
        {error && <div className="mb-4"><Notice>{error}</Notice></div>}
        <dl className="overflow-hidden border border-line">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-wrap items-baseline gap-3 border-b border-line px-5 py-4 last:border-0">
              <dt className="w-40 shrink-0 text-[13.5px] font-bold uppercase tracking-wide text-ink-2">{r.label}</dt>
              <dd className="min-w-0 flex-1 text-[15.5px]">{r.value}</dd>
              <button type="button" onClick={() => go(r.step)} className="text-[13.5px] font-bold text-magenta hover:underline">Edit</button>
            </div>
          ))}
        </dl>
      </div>
    </WizardShell>
  );
}
